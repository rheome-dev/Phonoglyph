import { z } from 'zod';
import type { 
  AudioEventData,
  AudioEventMapping, 
  EventBasedMappingConfig,
  TransientEvent,
  ChromaEvent,
  EventBasedMappingEntity,
  AudioEventCacheEntity
} from '../types/event-based-mapping';
import { TransientDetectionService } from './transient-detection';
import { ChromaAnalysisService } from './chroma-analysis';
import { supabase } from '../lib/supabase';

/**
 * Event-Based Mapping Service
 * Main service for managing audio event detection and parameter mapping
 */
export class EventBasedMappingService {
  private transientDetection: TransientDetectionService;
  private chromaAnalysis: ChromaAnalysisService;
  
  constructor(sampleRate: number = 44100) {
    this.transientDetection = new TransientDetectionService(sampleRate);
    this.chromaAnalysis = new ChromaAnalysisService(sampleRate);
  }

  /**
   * Create a new event-based mapping
   */
  public async createMapping(
    userId: string,
    projectId: string,
    eventType: string,
    targetParameter: string,
    mappingConfig?: Partial<AudioEventMapping['mapping']>
  ): Promise<AudioEventMapping> {
    const defaultMapping = this.getDefaultMappingConfig(eventType);
    
    const mapping: AudioEventMapping = {
      id: crypto.randomUUID(),
      eventType: eventType as 'transient' | 'chroma' | 'volume' | 'brightness',
      targetParameter,
      mapping: {
        ...defaultMapping,
        ...mappingConfig
      },
      enabled: true
    };

    // Save to database
    const { data, error } = await supabase
      .from('event_based_mappings')
      .insert({
        id: mapping.id,
        user_id: userId,
        project_id: projectId,
        event_type: mapping.eventType,
        target_parameter: targetParameter,
        mapping_config: mapping.mapping,
        enabled: mapping.enabled
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create mapping: ${error.message}`);
    }

    return mapping;
  }

  /**
   * Update an existing mapping
   */
  public async updateMapping(
    mappingId: string,
    userId: string,
    updates: Partial<AudioEventMapping>
  ): Promise<AudioEventMapping> {
    const updateData: Partial<EventBasedMappingEntity> = {};
    
    if (updates.targetParameter) {
      updateData.target_parameter = updates.targetParameter;
    }
    if (updates.mapping) {
      updateData.mapping_config = updates.mapping;
    }
    if (updates.enabled !== undefined) {
      updateData.enabled = updates.enabled;
    }

    const { data, error } = await supabase
      .from('event_based_mappings')
      .update(updateData)
      .eq('id', mappingId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update mapping: ${error.message}`);
    }

    return this.entityToMapping(data);
  }

  /**
   * Delete a mapping
   */
  public async deleteMapping(mappingId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('event_based_mappings')
      .delete()
      .eq('id', mappingId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete mapping: ${error.message}`);
    }
  }

  /**
   * Get all mappings for a project
   */
  public async getProjectMappings(projectId: string, userId: string): Promise<AudioEventMapping[]> {
    const { data, error } = await supabase
      .from('event_based_mappings')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to get mappings: ${error.message}`);
    }

    return data.map(entity => this.entityToMapping(entity));
  }

  /**
   * Extract audio events from existing Meyda analysis cache
   */
  public async extractAudioEventsFromCache(
    fileMetadataId: string,
    stemType: string,
    config: EventBasedMappingConfig
  ): Promise<AudioEventData> {
    // Get existing analysis from cache
    const { data: cachedAnalysis, error } = await supabase
      .from('audio_analysis_cache')
      .select('analysis_data')
      .eq('file_metadata_id', fileMetadataId)
      .eq('stem_type', stemType)
      .single();

    if (error || !cachedAnalysis) {
      throw new Error(`No cached analysis found for file ${fileMetadataId}, stem ${stemType}`);
    }

    const analysisData = cachedAnalysis.analysis_data;
    
    // Extract events from the existing Meyda analysis
    const transients = config.features.transient 
      ? this.extractTransientsFromMeydaData(analysisData, config)
      : [];

    const chroma = config.features.chroma 
      ? this.extractChromaFromMeydaData(analysisData, config)
      : [];

    // Use existing RMS and spectral features from Meyda cache
    const rms = config.features.volume && analysisData.rms 
      ? analysisData.rms
      : [];

    const spectralFeatures = config.features.brightness 
      ? {
          centroid: analysisData.spectralCentroid || [],
          rolloff: analysisData.spectralRolloff || [],
          flatness: analysisData.spectralFlatness || []
        }
      : { centroid: [], rolloff: [], flatness: [] };

    return {
      transients,
      chroma,
      rms,
      spectralFeatures,
      eventCount: transients.length + chroma.length
    };
  }

  /**
   * Extract transient events from Meyda analysis data
   */
  private extractTransientsFromMeydaData(
    meydaData: any,
    config: EventBasedMappingConfig
  ): TransientEvent[] {
    const transients: TransientEvent[] = [];
    
    if (!meydaData.rms || !meydaData.spectralCentroid) {
      return transients;
    }

    const rms = meydaData.rms;
    const spectralCentroid = meydaData.spectralCentroid;
    const zcr = meydaData.zcr || [];
    
    // Simple onset detection using RMS and spectral centroid changes
    const threshold = (config.sensitivity.transient / 100) * 0.1; // Adjust based on sensitivity
    const minInterval = 0.05; // 50ms minimum between transients
    
    let lastOnsetTime = -minInterval;
    
    for (let i = 1; i < rms.length - 1; i++) {
      const currentTime = i * 0.025; // Assuming 25ms hop size from Meyda analysis
      
      if (currentTime - lastOnsetTime < minInterval) continue;
      
      // Detect onset using RMS and spectral centroid changes
      const rmsIncrease = rms[i] > rms[i-1] * (1 + threshold);
      const centroidChange = Math.abs(spectralCentroid[i] - spectralCentroid[i-1]) > threshold * 1000;
      
      if (rmsIncrease && centroidChange) {
        const amplitude = rms[i];
        const frequency = spectralCentroid[i];
        const duration = this.estimateTransientDurationFromRMS(rms, i);
        const confidence = Math.min(1, amplitude * 2); // Simple confidence measure
        
        transients.push({
          timestamp: currentTime,
          amplitude,
          frequency,
          duration,
          confidence,
          envelope: {
            attack: 0.01,
            decay: duration * 0.3,
            sustain: 0.7,
            release: duration * 0.5
          }
        });
        
        lastOnsetTime = currentTime;
      }
    }
    
    return transients;
  }

  /**
   * Extract chroma events from Meyda analysis data
   */
  private extractChromaFromMeydaData(
    meydaData: any,
    config: EventBasedMappingConfig
  ): ChromaEvent[] {
    const chromaEvents: ChromaEvent[] = [];
    
    // For now, create simplified chroma events from spectral data
    // This would need to be enhanced with actual chromagram analysis
    if (!meydaData.spectralCentroid) {
      return chromaEvents;
    }
    
    const spectralCentroid = meydaData.spectralCentroid;
    const threshold = config.sensitivity.chroma / 100;
    
    for (let i = 0; i < spectralCentroid.length; i++) {
      const timestamp = i * 0.025; // 25ms hop size
      
      // Convert spectral centroid to rough pitch estimate
      const estimatedPitch = this.centroidToPitchClass(spectralCentroid[i]);
      const confidence = Math.min(1, spectralCentroid[i] / 3000); // Normalize
      
      if (confidence > threshold) {
        // Create a simple chroma vector with the dominant note
        const chroma = new Array(12).fill(0);
        chroma[estimatedPitch] = confidence;
        
        chromaEvents.push({
          timestamp,
          chroma,
          rootNote: estimatedPitch,
          confidence,
          keySignature: this.estimateKeyFromPitchClass(estimatedPitch)
        });
      }
    }
    
    // Filter to reduce rapid changes
    return this.filterChromaEventsByStability(chromaEvents);
  }

  /**
   * Helper methods for Meyda data processing
   */
  private estimateTransientDurationFromRMS(rms: number[], startIndex: number): number {
    const peakRMS = rms[startIndex];
    const threshold = peakRMS * 0.1;
    
    for (let i = startIndex + 1; i < rms.length; i++) {
      if (rms[i] < threshold) {
        return (i - startIndex) * 0.025; // Convert to seconds
      }
    }
    
    return 0.5; // Default max duration
  }

  private centroidToPitchClass(centroid: number): number {
    // Very rough approximation - convert spectral centroid to pitch class
    // This is simplified; real chroma analysis would use FFT bins
    const normalizedCentroid = Math.max(0, Math.min(8000, centroid)) / 8000;
    return Math.floor(normalizedCentroid * 12);
  }

  private estimateKeyFromPitchClass(pitchClass: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return `${noteNames[pitchClass]} major`;
  }

  private filterChromaEventsByStability(events: ChromaEvent[]): ChromaEvent[] {
    if (events.length === 0) return events;
    
    const filtered: ChromaEvent[] = [];
    const minDuration = 0.1; // 100ms minimum
    
    let currentEvent = events[0];
    let eventStart = currentEvent.timestamp;
    
    for (let i = 1; i < events.length; i++) {
      const event = events[i];
      
      if (event.rootNote !== currentEvent.rootNote) {
        if (currentEvent.timestamp - eventStart >= minDuration) {
          filtered.push(currentEvent);
        }
        currentEvent = event;
        eventStart = event.timestamp;
      }
    }
    
    // Add the last event
    if (currentEvent.timestamp - eventStart >= minDuration) {
      filtered.push(currentEvent);
    }
    
    return filtered;
  }

  /**
   * Cache audio events for performance
   */
  public async cacheAudioEvents(
    userId: string,
    fileMetadataId: string,
    stemType: string,
    eventData: AudioEventData,
    analysisVersion: string = '1.0'
  ): Promise<void> {
    const { error } = await supabase
      .from('audio_event_cache')
      .upsert({
        user_id: userId,
        file_metadata_id: fileMetadataId,
        stem_type: stemType,
        event_data: eventData,
        analysis_version: analysisVersion
      });

    if (error) {
      throw new Error(`Failed to cache audio events: ${error.message}`);
    }
  }

  /**
   * Get cached audio events
   */
  public async getCachedAudioEvents(
    fileMetadataId: string,
    stemType: string,
    analysisVersion: string = '1.0'
  ): Promise<AudioEventData | null> {
    const { data, error } = await supabase
      .from('audio_event_cache')
      .select('event_data')
      .eq('file_metadata_id', fileMetadataId)
      .eq('stem_type', stemType)
      .eq('analysis_version', analysisVersion)
      .single();

    if (error) {
      return null; // Cache miss
    }

    return data.event_data;
  }

  /**
   * Get mapped value for visualization parameter
   */
  public getMappedValue(
    mapping: AudioEventMapping,
    audioEventData: AudioEventData,
    currentTime: number
  ): number {
    switch (mapping.eventType) {
      case 'transient':
        return this.getTransientMappedValue(mapping, audioEventData.transients, currentTime);
      case 'chroma':
        return this.getChromaMappedValue(mapping, audioEventData.chroma, currentTime);
      case 'volume':
        return this.getVolumeMappedValue(mapping, audioEventData.rms, currentTime);
      case 'brightness':
        return this.getBrightnessMappedValue(mapping, audioEventData.spectralFeatures, currentTime);
      default:
        return 0;
    }
  }

  /**
   * Validate mapping configuration
   */
  public validateMapping(mapping: AudioEventMapping): boolean {
    // Check required fields
    if (!mapping.id || !mapping.eventType || !mapping.targetParameter) {
      return false;
    }

    // Validate event type
    const validEventTypes = ['transient', 'chroma', 'volume', 'brightness'];
    if (!validEventTypes.includes(mapping.eventType)) {
      return false;
    }

    // Validate mapping configuration
    const { mapping: config } = mapping;
    if (!config.source || !config.transform || !config.range) {
      return false;
    }

    // Validate range
    if (!Array.isArray(config.range) || config.range.length !== 2) {
      return false;
    }

    // Validate sensitivity
    if (config.sensitivity < 0 || config.sensitivity > 100) {
      return false;
    }

    return true;
  }

  /**
   * Get default mapping configuration for event type
   */
  private getDefaultMappingConfig(eventType: string) {
    const defaults = {
      transient: {
        source: 'transient' as const,
        transform: 'envelope' as const,
        range: [0, 1] as [number, number],
        sensitivity: 50,
        envelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0.7,
          release: 0.3
        }
      },
      chroma: {
        source: 'chroma' as const,
        transform: 'linear' as const,
        range: [0, 1] as [number, number],
        sensitivity: 30
      },
      volume: {
        source: 'volume' as const,
        transform: 'logarithmic' as const,
        range: [0, 1] as [number, number],
        sensitivity: 50
      },
      brightness: {
        source: 'brightness' as const,
        transform: 'linear' as const,
        range: [0, 1] as [number, number],
        sensitivity: 50
      }
    };

    return defaults[eventType as keyof typeof defaults] || defaults.transient;
  }

  /**
   * Calculate RMS energy over time
   */
  private calculateRMS(audioBuffer: Float32Array, sampleRate: number): number[] {
    const hopSize = Math.floor(sampleRate * 0.025); // 25ms hop
    const windowSize = Math.floor(sampleRate * 0.05); // 50ms window
    const rms: number[] = [];

    for (let i = 0; i < audioBuffer.length - windowSize; i += hopSize) {
      let sum = 0;
      for (let j = i; j < i + windowSize && j < audioBuffer.length; j++) {
        sum += audioBuffer[j] * audioBuffer[j];
      }
      rms.push(Math.sqrt(sum / windowSize));
    }

    return rms;
  }

  /**
   * Calculate spectral features over time
   */
  private calculateSpectralFeatures(audioBuffer: Float32Array, sampleRate: number) {
    const hopSize = Math.floor(sampleRate * 0.025); // 25ms hop
    const windowSize = 2048;
    const centroid: number[] = [];
    const rolloff: number[] = [];
    const flatness: number[] = [];

    for (let i = 0; i < audioBuffer.length - windowSize; i += hopSize) {
      const frame = audioBuffer.slice(i, i + windowSize);
      const spectrum = this.calculateMagnitudeSpectrum(frame);
      
      centroid.push(this.calculateSpectralCentroid(spectrum, sampleRate));
      rolloff.push(this.calculateSpectralRolloff(spectrum, sampleRate));
      flatness.push(this.calculateSpectralFlatness(spectrum));
    }

    return { centroid, rolloff, flatness };
  }

  /**
   * Calculate magnitude spectrum
   */
  private calculateMagnitudeSpectrum(frame: Float32Array): Float32Array {
    const spectrum = new Float32Array(Math.floor(frame.length / 2));
    
    for (let k = 0; k < spectrum.length; k++) {
      let real = 0;
      let imag = 0;
      
      for (let n = 0; n < frame.length; n++) {
        const angle = -2 * Math.PI * k * n / frame.length;
        real += frame[n] * Math.cos(angle);
        imag += frame[n] * Math.sin(angle);
      }
      
      spectrum[k] = Math.sqrt(real * real + imag * imag);
    }
    
    return spectrum;
  }

  /**
   * Calculate spectral centroid
   */
  private calculateSpectralCentroid(spectrum: Float32Array, sampleRate: number): number {
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      const frequency = (i * sampleRate) / (2 * spectrum.length);
      weightedSum += frequency * spectrum[i];
      magnitudeSum += spectrum[i];
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  /**
   * Calculate spectral rolloff
   */
  private calculateSpectralRolloff(spectrum: Float32Array, sampleRate: number): number {
    const totalEnergy = spectrum.reduce((sum, val) => sum + val, 0);
    const threshold = totalEnergy * 0.85; // 85% rolloff
    
    let cumulativeEnergy = 0;
    for (let i = 0; i < spectrum.length; i++) {
      cumulativeEnergy += spectrum[i];
      if (cumulativeEnergy >= threshold) {
        return (i * sampleRate) / (2 * spectrum.length);
      }
    }
    
    return (spectrum.length * sampleRate) / (2 * spectrum.length);
  }

  /**
   * Calculate spectral flatness
   */
  private calculateSpectralFlatness(spectrum: Float32Array): number {
    let geometricMean = 0;
    let arithmeticMean = 0;
    let count = 0;
    
    for (let i = 1; i < spectrum.length; i++) { // Skip DC component
      if (spectrum[i] > 0) {
        geometricMean += Math.log(spectrum[i]);
        arithmeticMean += spectrum[i];
        count++;
      }
    }
    
    if (count === 0) return 0;
    
    geometricMean = Math.exp(geometricMean / count);
    arithmeticMean = arithmeticMean / count;
    
    return arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;
  }

  /**
   * Get mapped value for transient events
   */
  private getTransientMappedValue(
    mapping: AudioEventMapping,
    transients: TransientEvent[],
    currentTime: number
  ): number {
    // Find the most recent transient event
    let activeTransient: TransientEvent | null = null;
    let timeFromOnset = Infinity;
    
    for (const transient of transients) {
      const timeDiff = currentTime - transient.timestamp;
      if (timeDiff >= 0 && timeDiff < transient.duration && timeDiff < timeFromOnset) {
        activeTransient = transient;
        timeFromOnset = timeDiff;
      }
    }
    
    if (!activeTransient) return mapping.mapping.range[0];
    
    // Apply envelope shaping
    let value = activeTransient.amplitude;
    if (mapping.mapping.transform === 'envelope' && activeTransient.envelope) {
      value *= this.calculateEnvelopeValue(timeFromOnset, activeTransient.envelope);
    }
    
    return this.applyTransform(value, mapping);
  }

  /**
   * Get mapped value for chroma events
   */
  private getChromaMappedValue(
    mapping: AudioEventMapping,
    chromaEvents: ChromaEvent[],
    currentTime: number
  ): number {
    // Find the current chroma event
    let activeChroma: ChromaEvent | null = null;
    
    for (let i = chromaEvents.length - 1; i >= 0; i--) {
      if (chromaEvents[i].timestamp <= currentTime) {
        activeChroma = chromaEvents[i];
        break;
      }
    }
    
    if (!activeChroma) return mapping.mapping.range[0];
    
    // Use the dominant note value or overall confidence
    const value = activeChroma.chroma[activeChroma.rootNote] || activeChroma.confidence;
    
    return this.applyTransform(value, mapping);
  }

  /**
   * Get mapped value for volume (RMS)
   */
  private getVolumeMappedValue(
    mapping: AudioEventMapping,
    rms: number[],
    currentTime: number
  ): number {
    if (rms.length === 0) return mapping.mapping.range[0];
    
    // Convert time to RMS array index
    const hopDuration = 0.025; // 25ms hop size
    const index = Math.floor(currentTime / hopDuration);
    
    if (index < 0 || index >= rms.length) return mapping.mapping.range[0];
    
    const value = rms[index];
    return this.applyTransform(value, mapping);
  }

  /**
   * Get mapped value for brightness (spectral centroid)
   */
  private getBrightnessMappedValue(
    mapping: AudioEventMapping,
    spectralFeatures: AudioEventData['spectralFeatures'],
    currentTime: number
  ): number {
    if (spectralFeatures.centroid.length === 0) return mapping.mapping.range[0];
    
    // Convert time to array index
    const hopDuration = 0.025; // 25ms hop size
    const index = Math.floor(currentTime / hopDuration);
    
    if (index < 0 || index >= spectralFeatures.centroid.length) return mapping.mapping.range[0];
    
    // Normalize centroid to 0-1 range (assuming max 8kHz)
    const normalizedCentroid = Math.min(1, spectralFeatures.centroid[index] / 8000);
    
    return this.applyTransform(normalizedCentroid, mapping);
  }

  /**
   * Calculate envelope value at given time
   */
  private calculateEnvelopeValue(timeFromOnset: number, envelope: TransientEvent['envelope']): number {
    if (!envelope) return 1;
    
    const { attack, decay, sustain, release } = envelope;
    
    if (timeFromOnset < attack) {
      // Attack phase
      return timeFromOnset / attack;
    } else if (timeFromOnset < attack + decay) {
      // Decay phase
      const decayProgress = (timeFromOnset - attack) / decay;
      return 1 - decayProgress * (1 - sustain);
    } else if (timeFromOnset < attack + decay + release) {
      // Release phase
      const releaseProgress = (timeFromOnset - attack - decay) / release;
      return sustain * (1 - releaseProgress);
    } else {
      // Past envelope
      return 0;
    }
  }

  /**
   * Apply transform and scaling to value
   */
  private applyTransform(value: number, mapping: AudioEventMapping): number {
    const { transform, range, sensitivity } = mapping.mapping;
    
    // Apply sensitivity scaling
    const sensitivityScale = sensitivity / 100;
    let transformedValue = value * sensitivityScale;
    
    // Apply transform function
    switch (transform) {
      case 'exponential':
        transformedValue = Math.pow(transformedValue, 2);
        break;
      case 'logarithmic':
        transformedValue = transformedValue > 0 ? Math.log(1 + transformedValue) / Math.log(2) : 0;
        break;
      case 'linear':
      default:
        // Value already transformed by sensitivity
        break;
    }
    
    // Clamp and scale to range
    transformedValue = Math.max(0, Math.min(1, transformedValue));
    return range[0] + transformedValue * (range[1] - range[0]);
  }

  /**
   * Convert database entity to mapping object
   */
  private entityToMapping(entity: EventBasedMappingEntity): AudioEventMapping {
    return {
      id: entity.id,
      eventType: entity.event_type,
      targetParameter: entity.target_parameter,
      mapping: entity.mapping_config,
      enabled: entity.enabled
    };
  }
}
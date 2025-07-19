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
      const rmsValue = rms[i];
      const rmsPrev = rms[i-1];
      const centroidValue = spectralCentroid[i];
      const centroidPrev = spectralCentroid[i-1];
      
      if (!rmsValue || !rmsPrev || !centroidValue || !centroidPrev) continue;
      
      const rmsIncrease = rmsValue > rmsPrev * (1 + threshold);
      const centroidChange = Math.abs(centroidValue - centroidPrev) > threshold * 1000;
      
      if (rmsIncrease && centroidChange) {
        const amplitude = rmsValue;
        const frequency = centroidValue;
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
    
    if (!meydaData.chroma) {
      return chromaEvents;
    }

    const chromaData = meydaData.chroma;
    const threshold = config.sensitivity.chroma / 100;
    const minDuration = 0.1; // 100ms minimum duration
    
    let currentEvent: ChromaEvent | undefined;
    let eventStart = 0;
    
    for (let i = 0; i < chromaData.length; i++) {
      const chroma = chromaData[i];
      if (!chroma || !Array.isArray(chroma)) continue;
      
      const confidence = chroma.reduce((a, b) => a + (b || 0), 0) / chroma.length;
      
      if (confidence > threshold) {
        const rootNote = this.findDominantNote(chroma);
        const keySignature = this.detectKeySignature(chroma);
        
        const event: ChromaEvent = {
          timestamp: i * 0.025,
          chroma: [...chroma],
          rootNote,
          confidence,
          keySignature
        };
        
        if (!currentEvent) {
          currentEvent = event;
          eventStart = event.timestamp;
        } else if (event.rootNote !== currentEvent.rootNote) {
          if (currentEvent.timestamp - eventStart >= minDuration) {
            chromaEvents.push(currentEvent);
          }
          eventStart = event.timestamp;
          currentEvent = event;
        } else {
          // Keep the event with higher confidence
          if (event.confidence > currentEvent.confidence) {
            currentEvent = event;
          }
        }
      }
    }
    
    // Add the last event if it meets duration requirement
    if (currentEvent && currentEvent.timestamp - eventStart >= minDuration) {
      chromaEvents.push(currentEvent);
    }
    
    return chromaEvents;
  }

  /**
   * Estimate transient duration from RMS envelope
   */
  private estimateTransientDurationFromRMS(rms: number[], startIndex: number): number {
    if (!rms || startIndex >= rms.length) return 0.1;
    
    const peakRMS = Math.max(...rms.slice(startIndex, Math.min(startIndex + 20, rms.length)));
    if (!peakRMS) return 0.1;
    
    const threshold = peakRMS * 0.1;
    let duration = 0;
    
    for (let i = startIndex; i < rms.length; i++) {
      const rmsValue = rms[i];
      if (!rmsValue || rmsValue < threshold) {
        duration = (i - startIndex) * 0.025; // Convert to seconds
        break;
      }
    }
    
    return Math.max(0.01, Math.min(0.5, duration)); // Clamp between 10ms and 500ms
  }

  /**
   * Find dominant note from chroma vector
   */
  private findDominantNote(chroma: number[]): number {
    if (!chroma || chroma.length === 0) return 0;
    
    let maxValue = 0;
    let dominantNote = 0;
    
    for (let i = 0; i < chroma.length; i++) {
      const value = chroma[i];
      if (value && value > maxValue) {
        maxValue = value;
        dominantNote = i;
      }
    }
    
    return dominantNote;
  }

  /**
   * Detect key signature from chroma vector
   */
  private detectKeySignature(chroma: number[]): string {
    if (!chroma || chroma.length === 0) return 'C';
    
    // Simple key detection based on strongest notes
    const keyProfiles = {
      'C': [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
      'G': [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
      'D': [0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0],
      'A': [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
      'E': [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
      'B': [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
      'F#': [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      'C#': [0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0],
      'F': [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
      'Bb': [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      'Eb': [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      'Ab': [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]
    };
    
    let bestKey = 'C';
    let bestCorrelation = 0;
    
    for (const [key, profile] of Object.entries(keyProfiles)) {
      let correlation = 0;
      
      for (let i = 0; i < 12; i++) {
        const chromaValue = chroma[i];
        const profileValue = profile[i];
        if (chromaValue && profileValue) {
          correlation += chromaValue * profileValue;
        }
      }
      
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestKey = key;
      }
    }
    
    return bestKey;
  }

  /**
   * Filter chroma events by stability
   */
  private filterChromaEventsByStability(events: ChromaEvent[]): ChromaEvent[] {
    if (events.length === 0) return events;
    
    const filtered: ChromaEvent[] = [];
    const minDuration = 0.1; // 100ms minimum duration
    
    let currentEvent: ChromaEvent | undefined = events[0];
    let eventStart = currentEvent?.timestamp || 0;
    
    for (let i = 1; i < events.length; i++) {
      const event = events[i];
      if (!event || !currentEvent) continue;
      
      if (event.rootNote !== currentEvent.rootNote) {
        if (currentEvent.timestamp - eventStart >= minDuration) {
          filtered.push(currentEvent);
        }
        eventStart = event.timestamp;
        currentEvent = event;
      } else {
        // Keep the event with higher confidence
        if (event.confidence > currentEvent.confidence) {
          currentEvent = event;
        }
      }
    }
    
    // Add the last event if it meets duration requirement
    if (currentEvent && currentEvent.timestamp - eventStart >= minDuration) {
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
   * Calculate RMS from audio buffer
   */
  private calculateRMS(audioBuffer: Float32Array, sampleRate: number): number[] {
    if (!audioBuffer || audioBuffer.length === 0) return [];
    
    const frameSize = Math.floor(sampleRate * 0.025); // 25ms frames
    const hopSize = Math.floor(frameSize / 2); // 50% overlap
    const rms: number[] = [];
    
    for (let i = 0; i < audioBuffer.length - frameSize; i += hopSize) {
      let sum = 0;
      
      for (let j = 0; j < frameSize; j++) {
        const sample = audioBuffer[i + j];
        if (sample !== undefined) {
          sum += sample * sample;
        }
      }
      
      rms.push(Math.sqrt(sum / frameSize));
    }
    
    return rms;
  }

  /**
   * Calculate spectral features from audio buffer
   */
  private calculateSpectralFeatures(audioBuffer: Float32Array, sampleRate: number) {
    if (!audioBuffer || audioBuffer.length === 0) {
      return { centroid: [], rolloff: [], flatness: [] };
    }
    
    const frameSize = Math.floor(sampleRate * 0.025); // 25ms frames
    const hopSize = Math.floor(frameSize / 2); // 50% overlap
    const centroid: number[] = [];
    const rolloff: number[] = [];
    const flatness: number[] = [];
    
    for (let i = 0; i < audioBuffer.length - frameSize; i += hopSize) {
      const frame = audioBuffer.slice(i, i + frameSize);
      const spectrum = this.calculateMagnitudeSpectrum(frame);
      
      centroid.push(this.calculateSpectralCentroid(spectrum, sampleRate));
      rolloff.push(this.calculateSpectralRolloff(spectrum, sampleRate));
      flatness.push(this.calculateSpectralFlatness(spectrum));
    }
    
    return { centroid, rolloff, flatness };
  }

  /**
   * Calculate magnitude spectrum using FFT
   */
  private calculateMagnitudeSpectrum(frame: Float32Array): Float32Array {
    if (!frame || frame.length === 0) return new Float32Array();
    
    const spectrum = new Float32Array(Math.floor(frame.length / 2));
    
    for (let k = 0; k < spectrum.length; k++) {
      let real = 0;
      let imag = 0;
      
      for (let n = 0; n < frame.length; n++) {
        const sample = frame[n];
        if (sample !== undefined) {
          const angle = -2 * Math.PI * k * n / frame.length;
          real += sample * Math.cos(angle);
          imag += sample * Math.sin(angle);
        }
      }
      
      spectrum[k] = Math.sqrt(real * real + imag * imag);
    }
    
    return spectrum;
  }

  /**
   * Calculate spectral centroid
   */
  private calculateSpectralCentroid(spectrum: Float32Array, sampleRate: number): number {
    if (!spectrum || spectrum.length === 0) return 0;
    
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      const magnitude = spectrum[i];
      if (magnitude !== undefined) {
        const frequency = (i * sampleRate) / (2 * spectrum.length);
        weightedSum += frequency * magnitude;
        magnitudeSum += magnitude;
      }
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  /**
   * Calculate spectral rolloff
   */
  private calculateSpectralRolloff(spectrum: Float32Array, sampleRate: number): number {
    if (!spectrum || spectrum.length === 0) return 0;
    
    const threshold = 0.85; // 85% energy threshold
    let totalEnergy = 0;
    let cumulativeEnergy = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      const magnitude = spectrum[i];
      if (magnitude !== undefined) {
        totalEnergy += magnitude * magnitude;
      }
    }
    
    const targetEnergy = threshold * totalEnergy;
    
    for (let i = 0; i < spectrum.length; i++) {
      const magnitude = spectrum[i];
      if (magnitude !== undefined) {
        cumulativeEnergy += magnitude * magnitude;
        if (cumulativeEnergy >= targetEnergy) {
          return (i * sampleRate) / (2 * spectrum.length);
        }
      }
    }
    
    return sampleRate / 2; // Nyquist frequency as fallback
  }

  /**
   * Calculate spectral flatness
   */
  private calculateSpectralFlatness(spectrum: Float32Array): number {
    if (!spectrum || spectrum.length === 0) return 0;
    
    let geometricMean = 0;
    let arithmeticMean = 0;
    let validSamples = 0;
    
    for (let i = 0; i < spectrum.length; i++) {
      const magnitude = spectrum[i];
      if (magnitude !== undefined && magnitude > 0) {
        geometricMean += Math.log(magnitude);
        arithmeticMean += magnitude;
        validSamples++;
      }
    }
    
    if (validSamples === 0) return 0;
    
    geometricMean = Math.exp(geometricMean / validSamples);
    arithmeticMean /= validSamples;
    
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
    if (!transients || transients.length === 0) return 0;
    
    // Find the most recent transient before current time
    let activeTransient: TransientEvent | null = null;
    
    for (let i = transients.length - 1; i >= 0; i--) {
      const transient = transients[i];
      if (transient && transient.timestamp <= currentTime) {
        activeTransient = transient;
        break;
      }
    }
    
    if (!activeTransient) return 0;
    
    const timeFromOnset = currentTime - activeTransient.timestamp;
    const envelopeValue = this.calculateEnvelopeValue(timeFromOnset, activeTransient.envelope);
    
    // Apply mapping transform
    const value = activeTransient.amplitude * envelopeValue;
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
    if (!chromaEvents || chromaEvents.length === 0) return 0;
    
    // Find the most recent chroma event before current time
    let activeChroma: ChromaEvent | null = null;
    
    for (let i = chromaEvents.length - 1; i >= 0; i--) {
      const event = chromaEvents[i];
      if (event && event.timestamp <= currentTime) {
        activeChroma = event;
        break;
      }
    }
    
    if (!activeChroma) return 0;
    
    // Use root note as the primary value
    const value = activeChroma.rootNote / 11; // Normalize to 0-1
    return this.applyTransform(value, mapping);
  }

  /**
   * Get mapped value for volume events
   */
  private getVolumeMappedValue(
    mapping: AudioEventMapping,
    rms: number[],
    currentTime: number
  ): number {
    if (!rms || rms.length === 0) return 0;
    
    const frameIndex = Math.floor(currentTime / 0.025); // 25ms hop size
    if (frameIndex < 0 || frameIndex >= rms.length) return 0;
    
    const rmsValue = rms[frameIndex];
    if (rmsValue === undefined) return 0;
    
    return this.applyTransform(rmsValue, mapping);
  }

  /**
   * Get mapped value for brightness events
   */
  private getBrightnessMappedValue(
    mapping: AudioEventMapping,
    spectralFeatures: AudioEventData['spectralFeatures'],
    currentTime: number
  ): number {
    if (!spectralFeatures || !spectralFeatures.centroid || spectralFeatures.centroid.length === 0) {
      return 0;
    }
    
    const frameIndex = Math.floor(currentTime / 0.025); // 25ms hop size
    if (frameIndex < 0 || frameIndex >= spectralFeatures.centroid.length) return 0;
    
    const centroidValue = spectralFeatures.centroid[frameIndex];
    if (centroidValue === undefined) return 0;
    
    // Normalize spectral centroid to 0-1 range
    const normalizedCentroid = Math.min(1, centroidValue / 8000);
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
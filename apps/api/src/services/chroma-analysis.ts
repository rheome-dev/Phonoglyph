import type { 
  ChromaEvent, 
  EventBasedMappingConfig 
} from '../types/event-based-mapping';

/**
 * Chroma Analysis Service
 * Implements pitch detection and key signature analysis using chromagram
 */
export class ChromaAnalysisService {
  private sampleRate: number;
  private bufferSize: number;
  private hopSize: number;
  private chromaBins: number = 12; // 12 semitones
  private noteNames: string[] = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
  ];

  // Major and minor key profiles for key detection
  private majorProfile = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1]; // Krumhansl-Schmuckler
  private minorProfile = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0];

  constructor(sampleRate: number = 44100, bufferSize: number = 4096) {
    this.sampleRate = sampleRate;
    this.bufferSize = bufferSize;
    this.hopSize = bufferSize / 4; // 75% overlap
  }

  /**
   * Extract chroma features from audio signal
   */
  public extractChroma(
    audioBuffer: Float32Array,
    config: EventBasedMappingConfig
  ): ChromaEvent[] {
    const chromagram = this.calculateChromagram(audioBuffer);
    const chromaEvents = this.detectChromaEvents(chromagram, config.sensitivity.chroma);
    
    return chromaEvents;
  }

  /**
   * Calculate chromagram from audio signal
   */
  private calculateChromagram(audioBuffer: Float32Array): number[][] {
    const numFrames = Math.floor((audioBuffer.length - this.bufferSize) / this.hopSize) + 1;
    const chromagram: number[][] = [];

    for (let frame = 0; frame < numFrames; frame++) {
      const frameStart = frame * this.hopSize;
      const frameEnd = Math.min(frameStart + this.bufferSize, audioBuffer.length);
      const frameData = audioBuffer.slice(frameStart, frameEnd);
      
      // Apply Hann window
      const windowedFrame = this.applyHannWindow(frameData);
      
      // Calculate magnitude spectrum
      const spectrum = this.calculateMagnitudeSpectrum(windowedFrame);
      
      // Convert spectrum to chromagram
      const chroma = this.spectrumToChroma(spectrum);
      
      chromagram.push(chroma);
    }

    return chromagram;
  }

  /**
   * Apply Hann window to reduce spectral leakage
   */
  private applyHannWindow(frame: Float32Array): Float32Array {
    const windowed = new Float32Array(frame.length);
    
    for (let i = 0; i < frame.length; i++) {
      const windowValue = 0.5 * (1 - Math.cos(2 * Math.PI * i / (frame.length - 1)));
      windowed[i] = frame[i] * windowValue;
    }
    
    return windowed;
  }

  /**
   * Calculate magnitude spectrum using DFT
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
   * Convert magnitude spectrum to chroma vector
   */
  private spectrumToChroma(spectrum: Float32Array): number[] {
    const chroma = new Array(this.chromaBins).fill(0);
    const binWidth = this.sampleRate / (2 * spectrum.length);
    
    // Define frequency range for analysis (80Hz - 5000Hz)
    const minFreq = 80;
    const maxFreq = 5000;
    
    for (let bin = 0; bin < spectrum.length; bin++) {
      const frequency = bin * binWidth;
      
      if (frequency >= minFreq && frequency <= maxFreq) {
        // Convert frequency to MIDI note number
        const midiNote = this.frequencyToMidi(frequency);
        
        if (midiNote > 0) {
          // Map to chroma bin (0-11)
          const chromaBin = Math.round(midiNote) % 12;
          
          // Weight by magnitude and apply tuning weighting
          const weight = spectrum[bin] * this.getTuningWeight(frequency, chromaBin);
          chroma[chromaBin] += weight;
        }
      }
    }
    
    // Normalize chroma vector
    const sum = chroma.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (let i = 0; i < chroma.length; i++) {
        chroma[i] /= sum;
      }
    }
    
    return chroma;
  }

  /**
   * Convert frequency to MIDI note number
   */
  private frequencyToMidi(frequency: number): number {
    if (frequency <= 0) return 0;
    return 12 * Math.log2(frequency / 440) + 69;
  }

  /**
   * Get tuning weight for frequency relative to expected chroma bin
   */
  private getTuningWeight(frequency: number, chromaBin: number): number {
    const midiNote = this.frequencyToMidi(frequency);
    const expectedMidi = chromaBin + 12 * Math.floor(midiNote / 12);
    const deviation = Math.abs(midiNote - expectedMidi);
    
    // Gaussian weighting centered on expected frequency
    const sigma = 0.5; // Standard deviation in semitones
    return Math.exp(-(deviation * deviation) / (2 * sigma * sigma));
  }

  /**
   * Detect chroma events from chromagram
   */
  private detectChromaEvents(chromagram: number[][], confidenceThreshold: number): ChromaEvent[] {
    const events: ChromaEvent[] = [];
    const threshold = confidenceThreshold / 100; // Convert to 0-1 range
    
    for (let frame = 0; frame < chromagram.length; frame++) {
      const chroma = chromagram[frame];
      const timestamp = (frame * this.hopSize) / this.sampleRate;
      
      // Calculate overall confidence (sum of chroma values)
      const confidence = chroma.reduce((a, b) => a + b, 0);
      
      if (confidence > threshold) {
        // Find dominant note (highest chroma value)
        const rootNote = this.findDominantNote(chroma);
        
        // Detect key signature
        const keySignature = this.detectKeySignature(chroma);
        
        events.push({
          timestamp,
          chroma: [...chroma], // Copy array
          rootNote,
          confidence,
          keySignature
        });
      }
    }
    
    // Filter events to remove rapid changes (smooth temporal continuity)
    return this.filterChromaEvents(events);
  }

  /**
   * Find the dominant note in chroma vector
   */
  private findDominantNote(chroma: number[]): number {
    let maxValue = 0;
    let dominantNote = 0;
    
    for (let i = 0; i < chroma.length; i++) {
      if (chroma[i] > maxValue) {
        maxValue = chroma[i];
        dominantNote = i;
      }
    }
    
    return dominantNote;
  }

  /**
   * Detect key signature using template matching
   */
  private detectKeySignature(chroma: number[]): string {
    let maxCorrelation = -1;
    let detectedKey = 'C major';
    
    // Test all 12 major keys
    for (let root = 0; root < 12; root++) {
      const correlation = this.correlateWithProfile(chroma, this.majorProfile, root);
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        detectedKey = `${this.noteNames[root]} major`;
      }
    }
    
    // Test all 12 minor keys
    for (let root = 0; root < 12; root++) {
      const correlation = this.correlateWithProfile(chroma, this.minorProfile, root);
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        detectedKey = `${this.noteNames[root]} minor`;
      }
    }
    
    return detectedKey;
  }

  /**
   * Correlate chroma vector with key profile
   */
  private correlateWithProfile(chroma: number[], profile: number[], rootShift: number): number {
    let correlation = 0;
    
    for (let i = 0; i < 12; i++) {
      const profileIndex = (i + rootShift) % 12;
      correlation += chroma[i] * profile[profileIndex];
    }
    
    return correlation;
  }

  /**
   * Filter chroma events to remove rapid changes
   */
  private filterChromaEvents(events: ChromaEvent[]): ChromaEvent[] {
    if (events.length === 0) return events;
    
    const filtered: ChromaEvent[] = [];
    const minDuration = 0.1; // 100ms minimum duration for chord changes
    
    let currentEvent = events[0];
    let eventStart = currentEvent.timestamp;
    
    for (let i = 1; i < events.length; i++) {
      const event = events[i];
      
      // Check if key signature or dominant note changed significantly
      const keyChanged = currentEvent.keySignature !== event.keySignature;
      const noteChanged = Math.abs(currentEvent.rootNote - event.rootNote) > 2; // Allow some variance
      
      if (keyChanged || noteChanged) {
        // Check if current event lasted long enough
        if (currentEvent.timestamp - eventStart >= minDuration) {
          filtered.push(currentEvent);
        }
        
        currentEvent = event;
        eventStart = event.timestamp;
      } else {
        // Update current event with higher confidence if available
        if (event.confidence > currentEvent.confidence) {
          currentEvent = event;
        }
      }
    }
    
    // Add the last event if it lasted long enough
    if (currentEvent.timestamp - eventStart >= minDuration) {
      filtered.push(currentEvent);
    }
    
    return filtered;
  }

  /**
   * Get note name from MIDI note number
   */
  public getNoteNameFromMidi(midiNote: number): string {
    const noteIndex = midiNote % 12;
    const octave = Math.floor(midiNote / 12) - 1;
    return `${this.noteNames[noteIndex]}${octave}`;
  }

  /**
   * Get frequency from MIDI note number
   */
  public getFrequencyFromMidi(midiNote: number): number {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }

  /**
   * Analyze harmonic content for better pitch detection
   */
  public analyzeHarmonicContent(chroma: number[]): {
    fundamentalStrength: number;
    harmonicComplexity: number;
    tonalClarity: number;
  } {
    // Calculate fundamental strength (how clear the root note is)
    const maxChroma = Math.max(...chroma);
    const avgChroma = chroma.reduce((a, b) => a + b, 0) / chroma.length;
    const fundamentalStrength = maxChroma / (avgChroma + 0.001); // Avoid division by zero
    
    // Calculate harmonic complexity (how many notes are active)
    const threshold = maxChroma * 0.3;
    const activeNotes = chroma.filter(value => value > threshold).length;
    const harmonicComplexity = activeNotes / 12;
    
    // Calculate tonal clarity (how well it fits common chord patterns)
    const tonalClarity = this.calculateTonalClarity(chroma);
    
    return {
      fundamentalStrength: Math.min(1, fundamentalStrength / 3), // Normalize
      harmonicComplexity,
      tonalClarity
    };
  }

  /**
   * Calculate how well the chroma fits common chord patterns
   */
  private calculateTonalClarity(chroma: number[]): number {
    // Common chord patterns (major, minor, dominant 7th, etc.)
    const chordPatterns = [
      [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0], // Major triad
      [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0], // Minor triad
      [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], // Dominant 7th
      [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0], // Minor 7th
    ];
    
    let maxClarity = 0;
    
    for (const pattern of chordPatterns) {
      for (let root = 0; root < 12; root++) {
        let correlation = 0;
        for (let i = 0; i < 12; i++) {
          const patternIndex = (i + root) % 12;
          correlation += chroma[i] * pattern[patternIndex];
        }
        maxClarity = Math.max(maxClarity, correlation);
      }
    }
    
    return Math.min(1, maxClarity);
  }
}
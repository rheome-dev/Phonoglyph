import { MIDIData, MIDINote } from '@/types/midi';
import { 
  MIDIBinding, 
  MIDISource, 
  ParameterMapping, 
  CurveType, 
  BindingBlendMode 
} from '../../../../../packages/types/src/midi-binding';

interface MIDIState {
  notes: Map<string, MIDINoteState>;
  controllers: Map<string, MIDIControllerState>;
  pitchBend: number;
  channelPressure: number;
}

interface MIDINoteState extends MIDINote {
  trackIndex: number;
  channel: number;
  note: number;
}

interface MIDIControllerState {
  trackIndex: number;
  channel: number;
  controller: number;
  value: number;
  time: number;
}

interface PropertyValue {
  value: number;
  weight: number;
  blendMode: BindingBlendMode;
}

export class MIDIBindingEngine {
  private bindings: Map<string, MIDIBinding[]> = new Map();
  private currentMIDIState: MIDIState = {
    notes: new Map(),
    controllers: new Map(),
    pitchBend: 0,
    channelPressure: 0
  };
  
  constructor() {
    this.bindings = new Map();
  }
  
  addBinding(binding: MIDIBinding): void {
    const layerBindings = this.bindings.get(binding.layerId) || [];
    layerBindings.push(binding);
    this.bindings.set(binding.layerId, layerBindings);
  }
  
  removeBinding(bindingId: string): void {
    for (const [layerId, bindings] of this.bindings.entries()) {
      const filtered = bindings.filter(b => b.id !== bindingId);
      if (filtered.length !== bindings.length) {
        this.bindings.set(layerId, filtered);
        break;
      }
    }
  }
  
  updateBinding(bindingId: string, updates: Partial<MIDIBinding>): void {
    for (const [layerId, bindings] of this.bindings.entries()) {
      const bindingIndex = bindings.findIndex(b => b.id === bindingId);
      if (bindingIndex !== -1) {
        bindings[bindingIndex] = { ...bindings[bindingIndex], ...updates };
        break;
      }
    }
  }
  
  getBindings(layerId: string): MIDIBinding[] {
    return this.bindings.get(layerId) || [];
  }
  
  getAllBindings(): MIDIBinding[] {
    const allBindings: MIDIBinding[] = [];
    for (const bindings of this.bindings.values()) {
      allBindings.push(...bindings);
    }
    return allBindings;
  }
  
  updateMIDIState(midiData: MIDIData, currentTime: number): void {
    // Clear current state
    this.currentMIDIState.notes.clear();
    this.currentMIDIState.controllers.clear();
    
    // Find active notes and control changes at current time
    midiData.tracks.forEach((track, trackIndex) => {
      track.notes.forEach(note => {
        if (note.start <= currentTime && (note.start + note.duration) > currentTime) {
          const key = `${note.track}_${note.pitch}`;
          this.currentMIDIState.notes.set(key, {
            ...note,
            trackIndex,
            channel: 1, // Default channel, could be extracted from track data
            note: note.pitch
          });
        }
      });
      
      // For control changes, we'd need them in the MIDI data structure
      // This is a simplified version - in reality we'd parse CC messages from MIDI
    });
  }
  
  evaluateBindings(layerId: string): Record<string, number> {
    const layerBindings = this.bindings.get(layerId) || [];
    const propertyValues: Record<string, PropertyValue[]> = {};
    const results: Record<string, number> = {};
    
    // Evaluate each binding
    layerBindings.forEach(binding => {
      if (!binding.enabled) return;
      
      const midiValue = this.getMIDIValue(binding.midiSource);
      if (midiValue === null) return;
      
      const mappedValue = this.applyMapping(midiValue, binding.mapping);
      const curvedValue = this.applyCurve(mappedValue, binding.curve);
      
      const propertyKey = `${binding.targetProperty.type}.${binding.targetProperty.property}`;
      
      if (!propertyValues[propertyKey]) {
        propertyValues[propertyKey] = [];
      }
      
      propertyValues[propertyKey].push({
        value: curvedValue,
        weight: binding.weight,
        blendMode: binding.blendMode
      });
    });
    
    // Blend multiple bindings for the same property
    Object.entries(propertyValues).forEach(([property, values]) => {
      results[property] = this.blendPropertyValues(values);
    });
    
    return results;
  }
  
  private getMIDIValue(source: MIDISource): number | null {
    switch (source.type) {
      case 'note_velocity':
        return this.getNoteVelocity(source);
      case 'note_on_off':
        return this.getNoteOnOff(source);
      case 'cc':
        return this.getControlChange(source);
      case 'pitch_bend':
        return this.currentMIDIState.pitchBend;
      case 'channel_pressure':
        return this.currentMIDIState.channelPressure;
      default:
        return null;
    }
  }
  
  private getNoteVelocity(source: MIDISource): number | null {
    if (source.note === undefined) return null;
    
    // Find the highest velocity among active notes matching criteria
    let maxVelocity = 0;
    
    for (const [key, note] of this.currentMIDIState.notes) {
      if (source.note === note.note && 
          (source.channel === undefined || source.channel === note.channel) &&
          (source.trackIndex === undefined || source.trackIndex === note.trackIndex)) {
        maxVelocity = Math.max(maxVelocity, note.velocity);
      }
    }
    
    return maxVelocity > 0 ? maxVelocity : null;
  }
  
  private getNoteOnOff(source: MIDISource): number | null {
    if (source.note === undefined) return null;
    
    // Return 1 if note is active, 0 if not
    for (const [key, note] of this.currentMIDIState.notes) {
      if (source.note === note.note && 
          (source.channel === undefined || source.channel === note.channel) &&
          (source.trackIndex === undefined || source.trackIndex === note.trackIndex)) {
        return 1;
      }
    }
    
    return 0;
  }
  
  private getControlChange(source: MIDISource): number | null {
    if (source.controller === undefined) return null;
    
    const key = `${source.channel || 1}_${source.controller}`;
    const cc = this.currentMIDIState.controllers.get(key);
    
    return cc ? cc.value : null;
  }
  
  private applyMapping(value: number, mapping: ParameterMapping): number {
    // Normalize input value to 0-1 range
    const normalized = (value - mapping.inputMin) / (mapping.inputMax - mapping.inputMin);
    
    // Apply inversion if needed
    const processedNormalized = mapping.invert ? 1 - normalized : normalized;
    
    // Map to output range
    const mapped = mapping.outputMin + (processedNormalized * (mapping.outputMax - mapping.outputMin));
    
    // Apply clamping if needed
    if (mapping.clamp) {
      return Math.max(mapping.outputMin, Math.min(mapping.outputMax, mapped));
    }
    
    return mapped;
  }
  
  private applyCurve(value: number, curve: CurveType): number {
    // Clamp value to 0-1 range for curve application
    const clampedValue = Math.max(0, Math.min(1, value));
    
    switch (curve) {
      case 'linear':
        return value;
      case 'exponential':
        return Math.pow(clampedValue, 2) * (value < 0 ? -1 : 1) + (value < 0 ? value - clampedValue : 0);
      case 'logarithmic':
        return Math.sqrt(clampedValue) * (value < 0 ? -1 : 1) + (value < 0 ? value - clampedValue : 0);
      case 'smooth':
        // Smoothstep function
        const smoothed = clampedValue * clampedValue * (3 - 2 * clampedValue);
        return smoothed * (value < 0 ? -1 : 1) + (value < 0 ? value - clampedValue : 0);
      case 'steps':
        // 8-step quantization
        const quantized = Math.round(clampedValue * 8) / 8;
        return quantized * (value < 0 ? -1 : 1) + (value < 0 ? value - clampedValue : 0);
      default:
        return value;
    }
  }
  
  private blendPropertyValues(values: PropertyValue[]): number {
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0].value;
    
    // Calculate total weight
    const totalWeight = values.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight === 0) return values[0].value;
    
    // Use the blend mode of the first binding (could be made more sophisticated)
    const blendMode = values[0].blendMode;
    
    switch (blendMode) {
      case 'replace':
        // Last binding wins
        return values[values.length - 1].value;
      case 'add':
        // Weighted sum
        return values.reduce((sum, v) => sum + (v.value * v.weight / totalWeight), 0);
      case 'multiply':
        // Multiply all values
        return values.reduce((product, v) => product * v.value, 1);
      case 'max':
        // Maximum value
        return Math.max(...values.map(v => v.value));
      case 'min':
        // Minimum value
        return Math.min(...values.map(v => v.value));
      case 'average':
      default:
        // Weighted average
        return values.reduce((sum, v) => sum + (v.value * v.weight), 0) / totalWeight;
    }
  }
  
  // Utility method for testing bindings
  testBinding(binding: MIDIBinding, testValue: number): number {
    const mappedValue = this.applyMapping(testValue, binding.mapping);
    return this.applyCurve(mappedValue, binding.curve);
  }
}
import type { AudioBinding, MIDIBinding } from '@/types/video-composition';
import type { AudioAnalysisData, LiveMIDIData } from '@/types/visualizer';

export function mapRange(
  value: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number
): number {
  return ((value - inputMin) / (inputMax - inputMin)) * (outputMax - outputMin) + outputMin;
}

export function applyBlendMode(
  baseValue: number,
  newValue: number,
  blendMode: 'add' | 'multiply' | 'replace'
): number {
  switch (blendMode) {
    case 'add':
      return baseValue + newValue;
    case 'multiply':
      return baseValue * newValue;
    case 'replace':
      return newValue;
    default:
      return newValue;
  }
}

export function getMIDIValue(midiData: LiveMIDIData, source: string): number | undefined {
  switch (source) {
    case 'velocity':
      return midiData.activeNotes.length > 0 
        ? midiData.activeNotes.reduce((sum, note) => sum + note.velocity, 0) / midiData.activeNotes.length
        : 0;
    case 'cc':
      // For now, return a mock CC value - would come from actual MIDI CC data
      return Math.sin(Date.now() * 0.001) * 0.5 + 0.5;
    case 'pitchBend':
      // Mock pitch bend value
      return Math.sin(Date.now() * 0.002) * 0.5 + 0.5;
    case 'channelPressure':
      // Mock channel pressure value
      return Math.sin(Date.now() * 0.003) * 0.5 + 0.5;
    default:
      return undefined;
  }
}

export function calculateOpacity(
  baseOpacity: number,
  audioBindings: AudioBinding[],
  audioFeatures: AudioAnalysisData,
  midiBindings: MIDIBinding[],
  midiData: LiveMIDIData
): number {
  let opacity = baseOpacity;
  
  // Apply audio bindings
  audioBindings.forEach(binding => {
    let featureValue: number | undefined;
    
    // Handle different feature types
    switch (binding.feature) {
      case 'volume':
      case 'bass':
      case 'mid':
      case 'treble':
        featureValue = audioFeatures[binding.feature];
        break;
      case 'frequencies':
        // Use average frequency value
        featureValue = audioFeatures.frequencies.length > 0 
          ? audioFeatures.frequencies.reduce((sum, val) => sum + val, 0) / audioFeatures.frequencies.length
          : 0;
        break;
      case 'timeData':
        // Use average time data value
        featureValue = audioFeatures.timeData.length > 0
          ? audioFeatures.timeData.reduce((sum, val) => sum + val, 0) / audioFeatures.timeData.length
          : 0;
        break;
    }
    
    if (featureValue !== undefined) {
      const mappedValue = mapRange(
        featureValue,
        binding.inputRange[0],
        binding.inputRange[1],
        binding.outputRange[0],
        binding.outputRange[1]
      );
      opacity = applyBlendMode(opacity, mappedValue, binding.blendMode);
    }
  });
  
  // Apply MIDI bindings
  midiBindings.forEach(binding => {
    const midiValue = getMIDIValue(midiData, binding.source);
    if (midiValue !== undefined) {
      const mappedValue = mapRange(
        midiValue,
        binding.inputRange[0],
        binding.inputRange[1],
        binding.outputRange[0],
        binding.outputRange[1]
      );
      opacity = applyBlendMode(opacity, mappedValue, binding.blendMode);
    }
  });
  
  return Math.max(0, Math.min(1, opacity));
}

export function calculateScale(
  baseScale: { x: number; y: number },
  audioBindings: AudioBinding[],
  audioFeatures: AudioAnalysisData,
  midiBindings: MIDIBinding[],
  midiData: LiveMIDIData
): { x: number; y: number } {
  let scaleX = baseScale.x;
  let scaleY = baseScale.y;
  
  // Apply audio bindings
  audioBindings.forEach(binding => {
    let featureValue: number | undefined;
    
    // Handle different feature types
    switch (binding.feature) {
      case 'volume':
      case 'bass':
      case 'mid':
      case 'treble':
        featureValue = audioFeatures[binding.feature];
        break;
      case 'frequencies':
        // Use average frequency value
        featureValue = audioFeatures.frequencies.length > 0 
          ? audioFeatures.frequencies.reduce((sum, val) => sum + val, 0) / audioFeatures.frequencies.length
          : 0;
        break;
      case 'timeData':
        // Use average time data value
        featureValue = audioFeatures.timeData.length > 0
          ? audioFeatures.timeData.reduce((sum, val) => sum + val, 0) / audioFeatures.timeData.length
          : 0;
        break;
    }
    
    if (featureValue !== undefined) {
      const mappedValue = mapRange(
        featureValue,
        binding.inputRange[0],
        binding.inputRange[1],
        binding.outputRange[0],
        binding.outputRange[1]
      );
      scaleX = applyBlendMode(scaleX, mappedValue, binding.blendMode);
      scaleY = applyBlendMode(scaleY, mappedValue, binding.blendMode);
    }
  });
  
  // Apply MIDI bindings
  midiBindings.forEach(binding => {
    const midiValue = getMIDIValue(midiData, binding.source);
    if (midiValue !== undefined) {
      const mappedValue = mapRange(
        midiValue,
        binding.inputRange[0],
        binding.inputRange[1],
        binding.outputRange[0],
        binding.outputRange[1]
      );
      scaleX = applyBlendMode(scaleX, mappedValue, binding.blendMode);
      scaleY = applyBlendMode(scaleY, mappedValue, binding.blendMode);
    }
  });
  
  return {
    x: Math.max(0.1, Math.min(5, scaleX)),
    y: Math.max(0.1, Math.min(5, scaleY))
  };
}

export function calculateRotation(
  baseRotation: number,
  audioBindings: AudioBinding[],
  audioFeatures: AudioAnalysisData,
  midiBindings: MIDIBinding[],
  midiData: LiveMIDIData
): number {
  let rotation = baseRotation;
  
  // Apply audio bindings
  audioBindings.forEach(binding => {
    let featureValue: number | undefined;
    
    // Handle different feature types
    switch (binding.feature) {
      case 'volume':
      case 'bass':
      case 'mid':
      case 'treble':
        featureValue = audioFeatures[binding.feature];
        break;
      case 'frequencies':
        // Use average frequency value
        featureValue = audioFeatures.frequencies.length > 0 
          ? audioFeatures.frequencies.reduce((sum, val) => sum + val, 0) / audioFeatures.frequencies.length
          : 0;
        break;
      case 'timeData':
        // Use average time data value
        featureValue = audioFeatures.timeData.length > 0
          ? audioFeatures.timeData.reduce((sum, val) => sum + val, 0) / audioFeatures.timeData.length
          : 0;
        break;
    }
    
    if (featureValue !== undefined) {
      const mappedValue = mapRange(
        featureValue,
        binding.inputRange[0],
        binding.inputRange[1],
        binding.outputRange[0],
        binding.outputRange[1]
      );
      rotation = applyBlendMode(rotation, mappedValue, binding.blendMode);
    }
  });
  
  // Apply MIDI bindings
  midiBindings.forEach(binding => {
    const midiValue = getMIDIValue(midiData, binding.source);
    if (midiValue !== undefined) {
      const mappedValue = mapRange(
        midiValue,
        binding.inputRange[0],
        binding.inputRange[1],
        binding.outputRange[0],
        binding.outputRange[1]
      );
      rotation = applyBlendMode(rotation, mappedValue, binding.blendMode);
    }
  });
  
  return rotation % 360;
}

export function calculatePosition(
  basePosition: { x: number; y: number },
  audioBindings: AudioBinding[],
  audioFeatures: AudioAnalysisData,
  midiBindings: MIDIBinding[],
  midiData: LiveMIDIData
): { x: number; y: number } {
  let x = basePosition.x;
  let y = basePosition.y;
  
  // Apply audio bindings
  audioBindings.forEach(binding => {
    let featureValue: number | undefined;
    
    // Handle different feature types
    switch (binding.feature) {
      case 'volume':
      case 'bass':
      case 'mid':
      case 'treble':
        featureValue = audioFeatures[binding.feature];
        break;
      case 'frequencies':
        // Use average frequency value
        featureValue = audioFeatures.frequencies.length > 0 
          ? audioFeatures.frequencies.reduce((sum, val) => sum + val, 0) / audioFeatures.frequencies.length
          : 0;
        break;
      case 'timeData':
        // Use average time data value
        featureValue = audioFeatures.timeData.length > 0
          ? audioFeatures.timeData.reduce((sum, val) => sum + val, 0) / audioFeatures.timeData.length
          : 0;
        break;
    }
    
    if (featureValue !== undefined) {
      const mappedValue = mapRange(
        featureValue,
        binding.inputRange[0],
        binding.inputRange[1],
        binding.outputRange[0],
        binding.outputRange[1]
      );
      x = applyBlendMode(x, mappedValue, binding.blendMode);
      y = applyBlendMode(y, mappedValue, binding.blendMode);
    }
  });
  
  // Apply MIDI bindings
  midiBindings.forEach(binding => {
    const midiValue = getMIDIValue(midiData, binding.source);
    if (midiValue !== undefined) {
      const mappedValue = mapRange(
        midiValue,
        binding.inputRange[0],
        binding.inputRange[1],
        binding.outputRange[0],
        binding.outputRange[1]
      );
      x = applyBlendMode(x, mappedValue, binding.blendMode);
      y = applyBlendMode(y, mappedValue, binding.blendMode);
    }
  });
  
  return { x, y };
} 
import { useState, useEffect, useCallback, useRef } from 'react';
// For now, define the types locally until we set up proper module resolution
interface MIDISource {
  type: 'note_velocity' | 'note_on_off' | 'cc' | 'pitch_bend' | 'channel_pressure' | 'aftertouch';
  channel?: number;
  note?: number;
  controller?: number;
  trackIndex?: number;
}

// MIDI helper functions
const MIDI_NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MIDI_CC_DEFINITIONS: Record<number, string> = {
  1: 'Modulation Wheel',
  7: 'Volume',
  10: 'Pan',
  11: 'Expression',
  64: 'Sustain Pedal',
  74: 'Filter Cutoff',
};

function getMIDINoteLabel(note: number): string {
  const octave = Math.floor(note / 12) - 1;
  const noteIndex = note % 12;
  return `${MIDI_NOTE_NAMES[noteIndex]}${octave}`;
}

function getMIDICCLabel(controller: number): string {
  return MIDI_CC_DEFINITIONS[controller] || `CC ${controller}`;
}

interface MIDILearnState {
  isLearning: boolean;
  learnedSource: MIDISource | null;
  lastMIDIValue: number | null;
  midiDevices: string[];
  isConnected: boolean;
}

export const useMIDILearn = () => {
  const [state, setState] = useState<MIDILearnState>({
    isLearning: false,
    learnedSource: null,
    lastMIDIValue: null,
    midiDevices: [],
    isConnected: false
  });
  
  const onLearnCompleteRef = useRef<((source: MIDISource) => void) | null>(null);
  const midiAccessRef = useRef<MIDIAccess | null>(null);
  const learnTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const startLearning = useCallback((callback: (source: MIDISource) => void) => {
    setState(prev => ({ ...prev, isLearning: true, learnedSource: null }));
    onLearnCompleteRef.current = callback;
    
    // Auto-stop learning after 10 seconds
    learnTimeoutRef.current = setTimeout(() => {
      stopLearning();
    }, 10000);
  }, []);
  
  const stopLearning = useCallback(() => {
    setState(prev => ({ ...prev, isLearning: false }));
    onLearnCompleteRef.current = null;
    
    if (learnTimeoutRef.current) {
      clearTimeout(learnTimeoutRef.current);
      learnTimeoutRef.current = null;
    }
  }, []);
  
  // Initialize Web MIDI API
  useEffect(() => {
    const initMIDI = async () => {
      if (!navigator.requestMIDIAccess) {
        console.warn('Web MIDI API not supported');
        return;
      }
      
      try {
        const midiAccess = await navigator.requestMIDIAccess();
        midiAccessRef.current = midiAccess;
        
        // Get list of MIDI devices
        const devices: string[] = [];
        midiAccess.inputs.forEach((input) => {
          devices.push(input.name || 'Unknown Device');
        });
        
        setState(prev => ({ 
          ...prev, 
          isConnected: true, 
          midiDevices: devices 
        }));
        
        // Set up MIDI message listeners
        const handleMIDIMessage = (event: MIDIMessageEvent) => {
          if (!state.isLearning || !onLearnCompleteRef.current) return;
          
          const data = event.data;
          if (!data || data.length < 2) return;
          
          const status = data[0];
          const data1 = data[1];
          const data2 = data.length > 2 ? data[2] : 0;
          const messageType = (status & 0xF0) >> 4;
          const channel = (status & 0x0F) + 1;
          
          let source: MIDISource | null = null;
          let value: number | null = null;
          
          switch (messageType) {
            case 9: // Note On
              if (data2 > 0) { // Velocity > 0
                source = {
                  type: 'note_velocity',
                  channel,
                  note: data1
                };
                value = data2;
              }
              break;
            case 8: // Note Off
              source = {
                type: 'note_on_off',
                channel,
                note: data1
              };
              value = 0;
              break;
            case 11: // Control Change
              source = {
                type: 'cc',
                channel,
                controller: data1
              };
              value = data2;
              break;
            case 14: // Pitch Bend
              source = {
                type: 'pitch_bend',
                channel
              };
              value = (data2 << 7) | data1; // 14-bit value
              break;
            case 13: // Channel Pressure
              source = {
                type: 'channel_pressure',
                channel
              };
              value = data1;
              break;
          }
          
          if (source && value !== null) {
            setState(prev => ({ 
              ...prev, 
              learnedSource: source,
              lastMIDIValue: value
            }));
            
            // Call the completion callback
            onLearnCompleteRef.current(source);
            stopLearning();
          }
        };
        
        // Add listeners to all MIDI inputs
        midiAccess.inputs.forEach((input) => {
          input.addEventListener('midimessage', handleMIDIMessage);
        });
        
        // Listen for device changes
        midiAccess.addEventListener('statechange', () => {
          const newDevices: string[] = [];
          midiAccess.inputs.forEach((input) => {
            newDevices.push(input.name || 'Unknown Device');
          });
          setState(prev => ({ ...prev, midiDevices: newDevices }));
        });
        
      } catch (error) {
        console.error('Failed to initialize MIDI:', error);
        setState(prev => ({ ...prev, isConnected: false }));
      }
    };
    
    initMIDI();
    
    return () => {
      if (learnTimeoutRef.current) {
        clearTimeout(learnTimeoutRef.current);
      }
    };
  }, [stopLearning]);
  
  // Format MIDI source for display
  const formatMIDISource = useCallback((source: MIDISource): string => {
    const channelStr = source.channel ? ` (Ch ${source.channel})` : ' (All Channels)';
    
    switch (source.type) {
      case 'note_velocity':
        return `${getMIDINoteLabel(source.note || 0)} Velocity${channelStr}`;
      case 'note_on_off':
        return `${getMIDINoteLabel(source.note || 0)} On/Off${channelStr}`;
      case 'cc':
        return `${getMIDICCLabel(source.controller || 0)}${channelStr}`;
      case 'pitch_bend':
        return `Pitch Bend${channelStr}`;
      case 'channel_pressure':
        return `Channel Pressure${channelStr}`;
      case 'aftertouch':
        return `Aftertouch${channelStr}`;
      default:
        return 'Unknown Source';
    }
  }, []);
  
  // Send test MIDI value (for testing bindings)
  const sendTestValue = useCallback((source: MIDISource, value: number) => {
    setState(prev => ({ 
      ...prev, 
      lastMIDIValue: value 
    }));
    
    // This would trigger binding evaluation in a real implementation
    console.log(`Test MIDI: ${formatMIDISource(source)} = ${value}`);
  }, [formatMIDISource]);
  
  return {
    isLearning: state.isLearning,
    learnedSource: state.learnedSource,
    lastMIDIValue: state.lastMIDIValue,
    midiDevices: state.midiDevices,
    isConnected: state.isConnected,
    startLearning,
    stopLearning,
    formatMIDISource,
    sendTestValue
  };
};
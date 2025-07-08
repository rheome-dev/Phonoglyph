import React from 'react';
import { render } from '@testing-library/react';
import { ThreeJSLayer } from '../components/ThreeJSLayer';
import { createSampleMIDIData } from '../utils/testUtils';

describe('Remotion Three.js Integration', () => {
  test('should render Three.js canvas within Remotion', () => {
    const midiData = createSampleMIDIData();
    const { container } = render(
      <ThreeJSLayer
        midiData={midiData}
        settings={{}}
        effectType="metaballs"
      />
    );
    
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });
  
  test('should handle different effect types', () => {
    const midiData = createSampleMIDIData();
    const effectTypes = ['metaballs', 'particles', 'midihud', 'bloom'] as const;
    
    effectTypes.forEach(effectType => {
      const { container } = render(
        <ThreeJSLayer
          midiData={midiData}
          settings={{}}
          effectType={effectType}
        />
      );
      
      expect(container.querySelector('canvas')).toBeInTheDocument();
    });
  });
  
  test('should apply opacity correctly', () => {
    const midiData = createSampleMIDIData();
    const { container } = render(
      <ThreeJSLayer
        midiData={midiData}
        settings={{}}
        effectType="metaballs"
        opacity={0.5}
      />
    );
    
    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveStyle('opacity: 0.5');
  });
});
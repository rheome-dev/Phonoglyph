import React from 'react';
import { Composition } from 'remotion';
import { RayboxComposition } from './RayboxComposition';
import type { RayboxCompositionProps } from './Root';
import debugPayload from './debug-payload.json';

// Debug payload - using type assertion to bypass strict typing for debugging purposes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TEST_PAYLOAD = debugPayload as any;

// Log the payload to verify it's loaded correctly
console.log('🔍 [Debug.tsx] TEST_PAYLOAD loaded:', {
  hasLayers: !!TEST_PAYLOAD.layers,
  layersCount: TEST_PAYLOAD.layers?.length || 0,
  hasAudioAnalysis: !!TEST_PAYLOAD.audioAnalysisData,
  audioAnalysisCount: TEST_PAYLOAD.audioAnalysisData?.length || 0,
  hasMasterAudioUrl: !!TEST_PAYLOAD.masterAudioUrl,
  keys: Object.keys(TEST_PAYLOAD),
  payloadSize: JSON.stringify(TEST_PAYLOAD).length
});

// Create a wrapper component that injects the payload
// This component receives props from Remotion but ignores them and uses TEST_PAYLOAD directly
const DebugComposition: React.FC<RayboxCompositionProps> = (remotionProps) => {
  console.log('🔍 [DebugComposition] Component rendering');
  console.log('🔍 [DebugComposition] Remotion props received:', {
    layersCount: remotionProps?.layers?.length || 0,
    audioAnalysisCount: remotionProps?.audioAnalysisData?.length || 0
  });
  console.log('🔍 [DebugComposition] TEST_PAYLOAD available:', {
    layersCount: TEST_PAYLOAD.layers?.length || 0,
    audioAnalysisCount: TEST_PAYLOAD.audioAnalysisData?.length || 0,
    hasMasterAudioUrl: !!TEST_PAYLOAD.masterAudioUrl
  });
  
  // Use TEST_PAYLOAD directly instead of remotionProps (which might be empty due to serialization issues)
  const props = TEST_PAYLOAD as RayboxCompositionProps;
  console.log('🔍 [DebugComposition] Spreading TEST_PAYLOAD as props:', {
    layersCount: props.layers?.length || 0,
    audioAnalysisCount: props.audioAnalysisData?.length || 0
  });
  
  return <RayboxComposition {...props} />;
};

export const DebugRoot = () => {
  console.log('🔍 [DebugRoot] Rendering composition');
  console.log('🔍 [DebugRoot] TEST_PAYLOAD at render time:', {
    layersCount: TEST_PAYLOAD.layers?.length || 0,
    audioAnalysisCount: TEST_PAYLOAD.audioAnalysisData?.length || 0,
    payloadSize: JSON.stringify(TEST_PAYLOAD).length,
    firstLayerId: TEST_PAYLOAD.layers?.[0]?.id
  });

  // Try using defaultProps again, but with more logging
  const propsToPass = TEST_PAYLOAD as unknown as RayboxCompositionProps;
  console.log('🔍 [DebugRoot] Props to pass:', {
    layersCount: propsToPass.layers?.length || 0,
    audioAnalysisCount: propsToPass.audioAnalysisData?.length || 0
  });

  return (
    <Composition
      id="Debug"
      component={DebugComposition}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={300}
      defaultProps={propsToPass}
    />
  );
};

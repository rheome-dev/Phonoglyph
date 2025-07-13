import { useState, useEffect } from 'react';

/**
 * Provides the real-time, normalized (0.0 to 1.0) value of a specific feature.
 * @param featureId The unique ID of the feature to monitor.
 * @returns The latest value of the feature, updated on every animation frame.
 */
export function useFeatureValue(featureId: string | null): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!featureId) {
      setValue(0);
      return;
    }

    // Mock real-time value generation
    let animationId: number;
    let time = 0;

    const updateValue = () => {
      time += 0.016; // ~60fps
      
      // Generate different patterns based on feature type
      let newValue = 0;
      
      if (featureId.includes('rms')) {
        // RMS features have rhythmic patterns
        newValue = 0.3 + 0.4 * Math.sin(time * 2) + 0.1 * Math.random();
      } else if (featureId.includes('spectral')) {
        // Spectral features have smoother patterns
        newValue = 0.4 + 0.3 * Math.sin(time * 0.5) + 0.2 * Math.cos(time * 1.5);
      } else if (featureId.includes('loudness')) {
        // Loudness features have more dynamic patterns
        newValue = 0.2 + 0.6 * Math.abs(Math.sin(time * 3)) + 0.1 * Math.random();
      } else {
        // Default pattern
        newValue = 0.5 + 0.3 * Math.sin(time) + 0.1 * Math.random();
      }
      
      // Clamp to 0-1 range
      newValue = Math.max(0, Math.min(1, newValue));
      
      setValue(newValue);
      animationId = requestAnimationFrame(updateValue);
    };

    animationId = requestAnimationFrame(updateValue);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [featureId]);

  return value;
} 
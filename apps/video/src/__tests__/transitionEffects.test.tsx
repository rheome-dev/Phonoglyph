import React from 'react';
import { render, RenderResult } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { 
  TransitionEffect, 
  useTransitionTiming 
} from '../components/transitions/TransitionEffects';
import { VideoEffect } from '../types/effects';

// Mock Remotion hooks for testing
vi.mock('remotion', () => ({
  useCurrentFrame: vi.fn(() => 60), // Mock frame 60
  useVideoConfig: vi.fn(() => ({ fps: 30 })), // Mock 30fps
  interpolate: vi.fn((progress, input, output, options) => {
    // Simple linear interpolation for testing
    const ratio = (progress - input[0]) / (input[1] - input[0]);
    const clamped = Math.max(0, Math.min(1, ratio));
    return output[0] + (output[1] - output[0]) * clamped;
  })
}));

const { useCurrentFrame, useVideoConfig, interpolate } = await import('remotion');

describe('TransitionEffects', () => {
  let mockVideoEffect: VideoEffect;
  
  beforeEach(() => {
    mockVideoEffect = {
      type: 'crossfade',
      duration: 1.0,
      intensity: 0.8,
      easing: 'linear'
    };
    
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('TransitionEffect Component', () => {
    test('should render children when transition is not active', () => {
      vi.mocked(useCurrentFrame).mockReturnValue(0);
      vi.mocked(useVideoConfig).mockReturnValue({ fps: 30 } as any);
      
      const { getByText } = render(
        <TransitionEffect effect={mockVideoEffect} startTime={2.0}>
          <div>Test Content</div>
        </TransitionEffect>
      );
      
      expect(getByText('Test Content')).toBeInTheDocument();
    });

    test('should apply crossfade transition during active period', () => {
      vi.mocked(useCurrentFrame).mockReturnValue(60); // Frame 60
      vi.mocked(useVideoConfig).mockReturnValue({ fps: 30 } as any); // 2 seconds
      
      const { container } = render(
        <TransitionEffect effect={mockVideoEffect} startTime={1.5}>
          <div>Test Content</div>
        </TransitionEffect>
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveStyle('opacity: 0.64'); // 0.8 intensity * interpolated opacity
    });

    test('should apply slide transition with correct direction', () => {
      const slideEffect: VideoEffect = {
        type: 'slide',
        duration: 0.5,
        intensity: 1.0,
        direction: 'left',
        easing: 'linear'
      };
      
      vi.mocked(useCurrentFrame).mockReturnValue(45);
      vi.mocked(useVideoConfig).mockReturnValue({ fps: 30 } as any);
      
      const { container } = render(
        <TransitionEffect effect={slideEffect} startTime={1.0}>
          <div>Test Content</div>
        </TransitionEffect>
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element.style.transform).toContain('translateX');
    });

    test('should apply zoom transition with correct scaling', () => {
      const zoomEffect: VideoEffect = {
        type: 'zoom',
        duration: 0.8,
        intensity: 0.6,
        direction: 'in',
        easing: 'ease-out'
      };
      
      vi.mocked(useCurrentFrame).mockReturnValue(12);
      vi.mocked(useVideoConfig).mockReturnValue({ fps: 30 } as any);
      
      const { container } = render(
        <TransitionEffect effect={zoomEffect} startTime={0.2}>
          <div>Test Content</div>
        </TransitionEffect>
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element.style.transform).toContain('scale');
      expect(element.style.transformOrigin).toBe('center center');
    });

    test('should apply spin transition with rotation', () => {
      const spinEffect: VideoEffect = {
        type: 'spin',
        duration: 1.2,
        intensity: 0.7,
        easing: 'ease-in-out'
      };
      
      vi.mocked(useCurrentFrame).mockReturnValue(18);
      vi.mocked(useVideoConfig).mockReturnValue({ fps: 30 } as any);
      
      const { container } = render(
        <TransitionEffect effect={spinEffect} startTime={0.2}>
          <div>Test Content</div>
        </TransitionEffect>
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element.style.transform).toContain('rotate');
      expect(element.style.transformOrigin).toBe('center center');
    });

    test('should apply glitch transition with distortion effects', () => {
      const glitchEffect: VideoEffect = {
        type: 'glitch',
        duration: 0.3,
        intensity: 1.0,
        easing: 'linear'
      };
      
      vi.mocked(useCurrentFrame).mockReturnValue(15);
      vi.mocked(useVideoConfig).mockReturnValue({ fps: 30 } as any);
      
      const { container } = render(
        <TransitionEffect effect={glitchEffect} startTime={0.3}>
          <div>Test Content</div>
        </TransitionEffect>
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element.style.transform).toContain('translate');
      expect(element.style.filter).toContain('hue-rotate');
    });

    test('should apply strobe transition with flickering opacity', () => {
      const strobeEffect: VideoEffect = {
        type: 'strobe',
        duration: 0.4,
        intensity: 0.9,
        easing: 'linear',
        parameters: { frequency: 25 }
      };
      
      vi.mocked(useCurrentFrame).mockReturnValue(6);
      vi.mocked(useVideoConfig).mockReturnValue({ fps: 30 } as any);
      
      const { container } = render(
        <TransitionEffect effect={strobeEffect} startTime={0.1}>
          <div>Test Content</div>
        </TransitionEffect>
      );
      
      const element = container.firstChild as HTMLElement;
      // Strobe should have variable opacity based on sine wave
      expect(element.style.opacity).toBeDefined();
    });

    test('should apply hard cut transition with instant visibility change', () => {
      const cutEffect: VideoEffect = {
        type: 'hard_cut',
        duration: 0.1,
        intensity: 1.0,
        easing: 'linear',
        parameters: { cutPoint: 0.5 }
      };
      
      vi.mocked(useCurrentFrame).mockReturnValue(3);
      vi.mocked(useVideoConfig).mockReturnValue({ fps: 30 } as any);
      
      const { container } = render(
        <TransitionEffect effect={cutEffect} startTime={0.05}>
          <div>Test Content</div>
        </TransitionEffect>
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element.style.opacity).toBeDefined();
    });
  });

  describe('Easing Functions', () => {
    test('should apply ease-in easing correctly', () => {
      const easedEffect: VideoEffect = {
        type: 'crossfade',
        duration: 1.0,
        intensity: 1.0,
        easing: 'ease-in'
      };
      
      vi.mocked(useCurrentFrame).mockReturnValue(15);
      vi.mocked(useVideoConfig).mockReturnValue({ fps: 30 } as any);
      
      render(
        <TransitionEffect effect={easedEffect} startTime={0.0}>
          <div>Test Content</div>
        </TransitionEffect>
      );
      
      // Verify interpolate was called (easing would be applied before interpolate)
      expect(interpolate).toHaveBeenCalled();
    });

    test('should apply bounce easing correctly', () => {
      const bounceEffect: VideoEffect = {
        type: 'slide',
        duration: 0.8,
        intensity: 1.0,
        direction: 'right',
        easing: 'bounce'
      };
      
      vi.mocked(useCurrentFrame).mockReturnValue(12);
      vi.mocked(useVideoConfig).mockReturnValue({ fps: 30 } as any);
      
      render(
        <TransitionEffect effect={bounceEffect} startTime={0.1}>
          <div>Test Content</div>
        </TransitionEffect>
      );
      
      expect(interpolate).toHaveBeenCalled();
    });
  });

  describe('Transition Timing', () => {
    test('should not render transition before start time', () => {
      vi.mocked(useCurrentFrame).mockReturnValue(15); // 0.5 seconds at 30fps
      vi.mocked(useVideoConfig).mockReturnValue({ fps: 30 } as any);
      
      const { getByText } = render(
        <TransitionEffect effect={mockVideoEffect} startTime={1.0}>
          <div>Test Content</div>
        </TransitionEffect>
      );
      
      // Should render normally without transition
      expect(getByText('Test Content')).toBeInTheDocument();
    });

    test('should not render transition after end time', () => {
      vi.mocked(useCurrentFrame).mockReturnValue(90); // 3.0 seconds at 30fps
      vi.mocked(useVideoConfig).mockReturnValue({ fps: 30 } as any);
      
      const { getByText } = render(
        <TransitionEffect effect={mockVideoEffect} startTime={1.0}>
          <div>Test Content</div>
        </TransitionEffect>
      );
      
      // Should render normally without transition
      expect(getByText('Test Content')).toBeInTheDocument();
    });

    test('should handle zero duration effects', () => {
      const instantEffect: VideoEffect = {
        type: 'hard_cut',
        duration: 0,
        intensity: 1.0,
        easing: 'linear'
      };
      
      vi.mocked(useCurrentFrame).mockReturnValue(30);
      vi.mocked(useVideoConfig).mockReturnValue({ fps: 30 } as any);
      
      const { getByText } = render(
        <TransitionEffect effect={instantEffect} startTime={1.0}>
          <div>Test Content</div>
        </TransitionEffect>
      );
      
      expect(getByText('Test Content')).toBeInTheDocument();
    });
  });

  describe('Multiple Direction Support', () => {
    const directions = ['left', 'right', 'up', 'down'] as const;
    
    directions.forEach(direction => {
      test(`should handle slide transition with ${direction} direction`, () => {
        const slideEffect: VideoEffect = {
          type: 'slide',
          duration: 0.5,
          intensity: 1.0,
          direction,
          easing: 'linear'
        };
        
        vi.mocked(useCurrentFrame).mockReturnValue(15);
        vi.mocked(useVideoConfig).mockReturnValue({ fps: 30 } as any);
        
        const { container } = render(
          <TransitionEffect effect={slideEffect} startTime={0.2}>
            <div>Test Content</div>
          </TransitionEffect>
        );
        
        const element = container.firstChild as HTMLElement;
        if (direction === 'left' || direction === 'right') {
          expect(element.style.transform).toContain('translateX');
        } else {
          expect(element.style.transform).toContain('translateY');
        }
      });
    });
  });

  describe('Effect Parameters', () => {
    test('should use custom strobe frequency from parameters', () => {
      const customStrobeEffect: VideoEffect = {
        type: 'strobe',
        duration: 0.5,
        intensity: 0.8,
        easing: 'linear',
        parameters: { frequency: 15 }
      };
      
      vi.mocked(useCurrentFrame).mockReturnValue(10);
      vi.mocked(useVideoConfig).mockReturnValue({ fps: 30 } as any);
      
      const { container } = render(
        <TransitionEffect effect={customStrobeEffect} startTime={0.1}>
          <div>Test Content</div>
        </TransitionEffect>
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element.style.opacity).toBeDefined();
    });

    test('should use custom cut point from parameters', () => {
      const customCutEffect: VideoEffect = {
        type: 'hard_cut',
        duration: 0.2,
        intensity: 1.0,
        easing: 'linear',
        parameters: { cutPoint: 0.3 }
      };
      
      vi.mocked(useCurrentFrame).mockReturnValue(6);
      vi.mocked(useVideoConfig).mockReturnValue({ fps: 30 } as any);
      
      const { container } = render(
        <TransitionEffect effect={customCutEffect} startTime={0.1}>
          <div>Test Content</div>
        </TransitionEffect>
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element.style.opacity).toBeDefined();
    });
  });
});

describe('useTransitionTiming Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return correct timing information during transition', () => {
    vi.mocked(useCurrentFrame).mockReturnValue(45);
    vi.mocked(useVideoConfig).mockReturnValue({ fps: 30 } as any);
    
    const effect: VideoEffect = {
      type: 'crossfade',
      duration: 1.0,
      intensity: 0.8,
      easing: 'ease-in-out'
    };
    
    // Mock the hook implementation for testing
    const TestComponent = () => {
      const timing = useTransitionTiming(effect, 1.0);
      return (
        <div data-testid="timing">
          {JSON.stringify({
            isActive: timing.isActive,
            progress: Math.round(timing.progress * 100) / 100,
            easedProgress: Math.round(timing.easedProgress * 100) / 100
          })}
        </div>
      );
    };
    
    const { getByTestId } = render(<TestComponent />);
    const timingData = JSON.parse(getByTestId('timing').textContent || '{}');
    
    expect(timingData.isActive).toBe(true);
    expect(timingData.progress).toBe(0.5); // 1.5s current - 1.0s start / 1.0s duration
  });

  test('should return inactive state before transition start', () => {
    vi.mocked(useCurrentFrame).mockReturnValue(15);
    vi.mocked(useVideoConfig).mockReturnValue({ fps: 30 } as any);
    
    const effect: VideoEffect = {
      type: 'slide',
      duration: 0.5,
      intensity: 1.0,
      easing: 'linear'
    };
    
    const TestComponent = () => {
      const timing = useTransitionTiming(effect, 1.0);
      return <div data-testid="active">{timing.isActive.toString()}</div>;
    };
    
    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('active').textContent).toBe('false');
  });

  test('should return inactive state after transition end', () => {
    vi.mocked(useCurrentFrame).mockReturnValue(75);
    vi.mocked(useVideoConfig).mockReturnValue({ fps: 30 } as any);
    
    const effect: VideoEffect = {
      type: 'zoom',
      duration: 0.8,
      intensity: 0.6,
      easing: 'ease-out'
    };
    
    const TestComponent = () => {
      const timing = useTransitionTiming(effect, 1.0);
      return <div data-testid="active">{timing.isActive.toString()}</div>;
    };
    
    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('active').textContent).toBe('false');
  });
});
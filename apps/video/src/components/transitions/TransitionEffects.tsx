import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { VideoEffect } from '../../types/effects';

interface TransitionProps {
  effect: VideoEffect;
  startTime: number;
  children: React.ReactNode;
}

export const TransitionEffect: React.FC<TransitionProps> = ({
  effect,
  startTime,
  children
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;
  
  // Calculate transition progress
  const transitionStart = startTime;
  const transitionEnd = startTime + effect.duration;
  
  if (currentTime < transitionStart || currentTime > transitionEnd) {
    return <>{children}</>;
  }
  
  const progress = (currentTime - transitionStart) / effect.duration;
  
  // Apply easing function
  const easedProgress = applyEasing(progress, effect.easing || 'linear');
  
  switch (effect.type) {
    case 'crossfade':
      return <CrossfadeTransition effect={effect} progress={easedProgress}>{children}</CrossfadeTransition>;
    case 'slide':
      return <SlideTransition effect={effect} progress={easedProgress}>{children}</SlideTransition>;
    case 'zoom':
      return <ZoomTransition effect={effect} progress={easedProgress}>{children}</ZoomTransition>;
    case 'spin':
      return <SpinTransition effect={effect} progress={easedProgress}>{children}</SpinTransition>;
    case 'glitch':
      return <GlitchTransition effect={effect} progress={easedProgress}>{children}</GlitchTransition>;
    case 'strobe':
      return <StrobeTransition effect={effect} progress={easedProgress}>{children}</StrobeTransition>;
    case 'hard_cut':
      return <HardCutTransition effect={effect} progress={easedProgress}>{children}</HardCutTransition>;
    default:
      return <>{children}</>;
  }
};

const CrossfadeTransition: React.FC<{
  effect: VideoEffect;
  progress: number;
  children: React.ReactNode;
}> = ({ effect, progress, children }) => {
  const opacity = interpolate(
    progress,
    [0, 1],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  return (
    <div style={{ opacity: opacity * effect.intensity }}>
      {children}
    </div>
  );
};

const SlideTransition: React.FC<{
  effect: VideoEffect;
  progress: number;
  children: React.ReactNode;
}> = ({ effect, progress, children }) => {
  const getTransform = () => {
    const distance = 100 * effect.intensity;
    
    switch (effect.direction) {
      case 'left':
        return `translateX(${interpolate(progress, [0, 1], [0, -distance])}%)`;
      case 'right':
        return `translateX(${interpolate(progress, [0, 1], [0, distance])}%)`;
      case 'up':
        return `translateY(${interpolate(progress, [0, 1], [0, -distance])}%)`;
      case 'down':
        return `translateY(${interpolate(progress, [0, 1], [0, distance])}%)`;
      default:
        return 'none';
    }
  };
  
  return (
    <div style={{ transform: getTransform() }}>
      {children}
    </div>
  );
};

const ZoomTransition: React.FC<{
  effect: VideoEffect;
  progress: number;
  children: React.ReactNode;
}> = ({ effect, progress, children }) => {
  const scale = interpolate(
    progress,
    [0, 1],
    [1, effect.direction === 'in' ? 0 : 2 * effect.intensity],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  return (
    <div style={{ 
      transform: `scale(${scale})`,
      transformOrigin: 'center center'
    }}>
      {children}
    </div>
  );
};

const SpinTransition: React.FC<{
  effect: VideoEffect;
  progress: number;
  children: React.ReactNode;
}> = ({ effect, progress, children }) => {
  const rotation = interpolate(
    progress,
    [0, 1],
    [0, 360 * effect.intensity],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  return (
    <div style={{ 
      transform: `rotate(${rotation}deg)`,
      transformOrigin: 'center center'
    }}>
      {children}
    </div>
  );
};

const GlitchTransition: React.FC<{
  effect: VideoEffect;
  progress: number;
  children: React.ReactNode;
}> = ({ effect, progress, children }) => {
  // Create glitch effect with random offsets based on frame for consistency
  const glitchIntensity = effect.intensity * Math.sin(progress * Math.PI);
  const frame = useCurrentFrame();
  
  // Use frame for deterministic randomness
  const xOffset = (Math.sin(frame * 0.1) * 0.5 + 0.5 - 0.5) * 20 * glitchIntensity;
  const yOffset = (Math.cos(frame * 0.15) * 0.5 + 0.5 - 0.5) * 5 * glitchIntensity;
  const hueShift = (Math.sin(frame * 0.2) * 0.5 + 0.5) * 360 * glitchIntensity;
  
  return (
    <div style={{ 
      transform: `translate(${xOffset}px, ${yOffset}px)`,
      filter: `hue-rotate(${hueShift}deg) saturate(${1 + glitchIntensity})`,
      clipPath: glitchIntensity > 0.3 ? `inset(${Math.random() * 20}% 0 ${Math.random() * 20}% 0)` : 'none'
    }}>
      {children}
    </div>
  );
};

const StrobeTransition: React.FC<{
  effect: VideoEffect;
  progress: number;
  children: React.ReactNode;
}> = ({ effect, progress, children }) => {
  const strobeFreq = effect.parameters?.frequency || 20; // Hz
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Create strobe based on frame timing for consistent playback
  const strobeValue = Math.sin((frame / fps) * strobeFreq * Math.PI * 2);
  const opacity = strobeValue > 0 ? effect.intensity : 0.1;
  
  return (
    <div style={{ opacity }}>
      {children}
    </div>
  );
};

const HardCutTransition: React.FC<{
  effect: VideoEffect;
  progress: number;
  children: React.ReactNode;
}> = ({ effect, progress, children }) => {
  // Hard cut shows/hides content instantly at specific progress point
  const cutPoint = effect.parameters?.cutPoint || 0.5;
  const visible = progress < cutPoint;
  
  return (
    <div style={{ opacity: visible ? effect.intensity : 0 }}>
      {children}
    </div>
  );
};

// Easing function utility
function applyEasing(t: number, easing: string): number {
  switch (easing) {
    case 'ease-in':
      return t * t;
    case 'ease-out':
      return 1 - (1 - t) * (1 - t);
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    case 'bounce':
      if (t < 1 / 2.75) {
        return 7.5625 * t * t;
      } else if (t < 2 / 2.75) {
        return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
      } else if (t < 2.5 / 2.75) {
        return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
      } else {
        return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
      }
    case 'linear':
    default:
      return t;
  }
}

// Utility hook for transition management
export function useTransitionTiming(
  effect: VideoEffect,
  startTime: number
): {
  isActive: boolean;
  progress: number;
  easedProgress: number;
} {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;
  
  const transitionStart = startTime;
  const transitionEnd = startTime + effect.duration;
  const isActive = currentTime >= transitionStart && currentTime <= transitionEnd;
  
  const progress = isActive 
    ? Math.max(0, Math.min(1, (currentTime - transitionStart) / effect.duration))
    : 0;
    
  const easedProgress = applyEasing(progress, effect.easing || 'linear');
  
  return { isActive, progress, easedProgress };
}
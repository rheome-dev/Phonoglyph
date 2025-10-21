'use client';

import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ModulationAttenuatorProps {
  value: number; // 0-1
  onChange: (value: number) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function ModulationAttenuator({ 
  value, 
  onChange, 
  className,
  size = 'sm'
}: ModulationAttenuatorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);
  const previousY = useRef(0);
  const currentValueRef = useRef(0);
  const isPointerDownRef = useRef(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10'
  };

  const knobSize = size === 'sm' ? 6 : 8;
  const knobRadius = size === 'sm' ? 12 : 15;

  // Map value [0..1] to angle [-135..+135], noon at 0°
  const knobAngle = (value - 0.5) * 270; // -135 at 0, 0 at .5, +135 at 1

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    isPointerDownRef.current = true;
    previousY.current = e.clientY;
    currentValueRef.current = value;
    
    const handlePointerMove = (ev: PointerEvent) => {
      if (!isPointerDownRef.current) return;
      // Use movementY when available
      const movementY = typeof ev.movementY === 'number' ? ev.movementY : previousY.current - ev.clientY;
      const deltaY = -movementY; // up increases
      const sensitivity = 0.0075;
      const proposedDelta = deltaY * sensitivity;
      // If at bound and trying to push further, ignore and do not consume the event (keep previousY)
      if ((currentValueRef.current <= 0 && proposedDelta < 0) || (currentValueRef.current >= 1 && proposedDelta > 0)) {
        return;
      }
      let tentative = currentValueRef.current + proposedDelta;
      const nextValue = Math.max(0, Math.min(1, tentative));
      currentValueRef.current = nextValue;
      previousY.current = ev.clientY;
      onChange(nextValue);
    };

    const handlePointerUp = () => {
      isPointerDownRef.current = false;
      setIsDragging(false);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    // Attach global listeners for robust drag
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div className={cn(
      "relative flex items-center gap-2 select-none",
      className
    )}
      onMouseEnter={(e) => e.stopPropagation()}
      onMouseLeave={(e) => e.stopPropagation()}
    >
      {/* Value display - positioned to the left */}
      <div className="text-xs text-white font-mono min-w-[5ch] text-right">
        {(() => { const pct = Math.round((value - 0.5) * 100); return `${pct>0?'+':''}${pct}%`; })()}
      </div>
      
      {/* Knob container */}
      <div 
        className={cn(
          "relative flex items-center justify-center cursor-ns-resize",
          sizeClasses[size],
          "pointer-events-auto"
        )}
        style={{ pointerEvents: 'auto' }}
        onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e as unknown as React.PointerEvent); }}
      >
        {/* Knob base */}
        <div className={cn(
          "absolute inset-0 rounded-full border-2",
          isDragging ? "border-white/30" : "border-white/20",
        )}
          style={{ backgroundColor: '#0b0b0b' }}
        />

        {/* Indicator line */}
        <div
          className="absolute left-1/2 top-1/2 origin-bottom bg-white"
          style={{
            width: 2,
            height: knobRadius,
            transform: `translate(-50%, -100%) rotate(${knobAngle}deg)`,
            borderRadius: 1
          }}
        />
      </div>
    </div>
  );
}

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
  const startY = useRef(0);
  const startValue = useRef(0);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10'
  };

  const knobSize = size === 'sm' ? 6 : 8;
  const knobRadius = size === 'sm' ? 12 : 15;

  // Map value [0..1] to angle [-135..+135], noon at 0°
  const knobAngle = (value - 0.5) * 270; // -135 at 0, 0 at .5, +135 at 1

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    startY.current = e.clientY;
    startValue.current = value;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY.current - moveEvent.clientY; // Inverted for natural feel
      const sensitivity = 0.0075; // tuned for smooth control
      const deltaValue = deltaY * sensitivity; // vertical drag maps to value
      const newValue = Math.max(0, Math.min(1, startValue.current + deltaValue));
      onChange(newValue);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
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
      <div className="text-xs text-emerald-400 font-mono min-w-[3ch] text-right">
        {Math.round(value * 100)}%
      </div>
      
      {/* Knob container */}
      <div 
        className={cn(
          "relative flex items-center justify-center cursor-ns-resize",
          sizeClasses[size],
          "pointer-events-auto"
        )}
        style={{ pointerEvents: 'auto' }}
        onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e as unknown as React.MouseEvent); }}
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

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
      "relative flex items-center gap-2",
      className
    )}>
      {/* Value display - positioned to the left */}
      <div className="text-xs text-emerald-400 font-mono min-w-[3ch] text-right">
        {Math.round(value * 100)}%
      </div>
      
      {/* Knob container */}
      <div 
        className={cn(
          "relative flex items-center justify-center",
          sizeClasses[size],
          "pointer-events-auto" // Ensure it captures mouse events
        )}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Background circle */}
        <div className={cn(
          "absolute inset-0 rounded-full border-2 border-gray-600 bg-gray-800",
          "shadow-inner"
        )} />
        
        {/* Center knob */}
        <div 
          ref={knobRef}
          className={cn(
            "absolute rounded-full bg-emerald-400 border border-emerald-300",
            "shadow-lg cursor-pointer transition-all duration-150",
            isDragging ? "bg-emerald-300 scale-110" : "hover:bg-emerald-300 hover:scale-105"
          )}
          style={{
            width: knobSize,
            height: knobSize,
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) rotate(${knobAngle}deg) translateY(-${knobRadius}px)`
          }}
          onMouseDown={handleMouseDown}
        />
      </div>
    </div>
  );
}

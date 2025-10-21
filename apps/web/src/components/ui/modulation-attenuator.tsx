'use client';

import React from 'react';
import { Slider } from '@/components/ui/slider';
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
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10'
  };

  const knobSize = size === 'sm' ? 6 : 8;
  const trackHeight = size === 'sm' ? 2 : 3;

  return (
    <div className={cn(
      "relative flex items-center justify-center",
      sizeClasses[size],
      className
    )}>
      {/* Background circle */}
      <div className={cn(
        "absolute inset-0 rounded-full border-2 border-gray-600 bg-gray-800",
        "shadow-inner"
      )} />
      
      {/* Modulation amount indicator */}
      <div 
        className="absolute inset-0 rounded-full border-2 border-emerald-500 bg-emerald-500/20"
        style={{
          clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.cos((value * 2 - 1) * Math.PI)}% ${50 + 50 * Math.sin((value * 2 - 1) * Math.PI)}%, 50% 50%)`
        }}
      />
      
      {/* Center knob */}
      <div 
        className={cn(
          "absolute rounded-full bg-emerald-400 border border-emerald-300",
          "shadow-lg cursor-pointer transition-all duration-150",
          "hover:bg-emerald-300 hover:scale-110"
        )}
        style={{
          width: knobSize,
          height: knobSize,
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) rotate(${value * 270 - 135}deg) translateY(-${size === 'sm' ? 12 : 15}px)`
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const rect = e.currentTarget.parentElement?.getBoundingClientRect();
          if (!rect) return;
          
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          
          const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - centerX;
            const deltaY = moveEvent.clientY - centerY;
            const angle = Math.atan2(deltaY, deltaX);
            const normalizedAngle = (angle + Math.PI) / (2 * Math.PI);
            const newValue = Math.max(0, Math.min(1, normalizedAngle));
            onChange(newValue);
          };
          
          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };
          
          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}
      />
      
      {/* Value display */}
      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
        <span className="text-xs text-emerald-400 font-mono">
          {Math.round(value * 100)}%
        </span>
      </div>
    </div>
  );
}

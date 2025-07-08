'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BlendMode } from '@/lib/stores/layerStore';

interface BlendModeSelectorProps {
  value: BlendMode;
  onChange: (blendMode: BlendMode) => void;
}

export const BlendModeSelector: React.FC<BlendModeSelectorProps> = ({
  value,
  onChange
}) => {
  const blendModes: { value: BlendMode; label: string }[] = [
    { value: 'normal', label: 'Normal' },
    { value: 'multiply', label: 'Multiply' },
    { value: 'screen', label: 'Screen' },
    { value: 'overlay', label: 'Overlay' },
    { value: 'darken', label: 'Darken' },
    { value: 'lighten', label: 'Lighten' },
  ];
  
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-6 text-xs bg-stone-50 border-stone-300">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {blendModes.map((mode) => (
          <SelectItem key={mode.value} value={mode.value} className="text-xs">
            {mode.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface RayboxLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LOGO_TEXT = 'Raybox.fm';


export function RayboxLogo({ className, size = 'md' }: RayboxLogoProps) {
  const sizeScale = {
    sm: 0.67,
    md: 1,
    lg: 1.33
  } as const satisfies Record<NonNullable<RayboxLogoProps['size']>, number>;

  const scale = sizeScale[size] ?? sizeScale.md;
  const baseFontSize = 24; // Base font size for sans serif text
  const scaledFontSize = baseFontSize * scale;

  return (
    <div 
      className={cn(
        "overflow-hidden",
        className
      )}
      style={{ 
        pointerEvents: 'none',
        position: 'relative',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: `${scaledFontSize}px`,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          margin: 0,
          padding: 0,
          textRendering: 'geometricPrecision',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          pointerEvents: 'none',
        }}
      >
        {LOGO_TEXT}
      </span>
    </div>
  );
}

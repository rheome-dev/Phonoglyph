'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PhonoglyphLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PhonoglyphLogo({ className, size = 'md' }: PhonoglyphLogoProps) {
  const sizeScale = {
    sm: 0.67,
    md: 1,
    lg: 1.33
  } as const satisfies Record<NonNullable<PhonoglyphLogoProps['size']>, number>;

  const scale = sizeScale[size] ?? sizeScale.md;
  const baseFontSize = 3;
  const scaledFontSize = baseFontSize * scale;
  const scaledLineHeight = baseFontSize * scale;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const preRef = React.useRef<HTMLPreElement>(null);
  const [horizontalScale, setHorizontalScale] = React.useState(1);

  React.useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      setHorizontalScale(1);
      return;
    }
    
    const updateScale = () => {
      if (!containerRef.current || !preRef.current) return;
      const availableWidth = containerRef.current.clientWidth;
      const naturalWidth = preRef.current.scrollWidth;
      if (availableWidth === 0 || naturalWidth === 0) {
        setHorizontalScale(1);
        return;
      }
      const scaleValue = Math.min(1, availableWidth / naturalWidth);
      setHorizontalScale(scaleValue);
    };

    updateScale();

    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [scale]);
  
  return (
    <div ref={containerRef} className="overflow-hidden w-full" style={{ maxWidth: '100%' }}>
      <pre
        ref={preRef}
        className={cn(
          "font-mono whitespace-pre text-gray-100 block",
          className
        )}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: `${scaledFontSize}px`,
          lineHeight: `${scaledLineHeight}px`,
          letterSpacing: '0',
          margin: 0,
          padding: 0,
          fontVariantLigatures: 'none',
          fontKerning: 'none',
          fontFeatureSettings: '"liga" 0, "calt" 0, "kern" 0',
          textRendering: 'optimizeSpeed',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          transform: horizontalScale < 1 ? `scaleX(${horizontalScale})` : undefined,
          transformOrigin: 'left top'
        }}
      >
{`                                                                                                                    
                                                                                                                    
\`7MM"""Mq.\`7MMF'  \`7MMF' .g8""8q. \`7MN.   \`7MF' .g8""8q.     .g8"""bgd \`7MMF'   \`YMM'   \`MM'\`7MM"""Mq.\`7MMF'  \`7MMF'
  MM   \`MM. MM      MM .dP'    \`YM. MMN.    M .dP'    \`YM. .dP'     \`M   MM       VMA   ,V    MM   \`MM. MM      MM  
  MM   ,M9  MM      MM dM'      \`MM M YMb   M dM'      \`MM dM'       \`   MM        VMA ,V     MM   ,M9  MM      MM  
  MMmmdM9   MMmmmmmmMM MM        MM M  \`MN. M MM        MM MM            MM         VMMP      MMmmdM9   MMmmmmmmMM  
  MM        MM      MM MM.      ,MP M   \`MM.M MM.      ,MP MM.    \`7MMF' MM      ,   MM       MM        MM      MM  
  MM        MM      MM \`Mb.    ,dP' M     YMM \`Mb.    ,dP' \`Mb.     MM   MM     ,M   MM       MM        MM      MM  
.JMML.    .JMML.  .JMML. \`"bmmd"' .JML.    YM   \`"bmmd"'     \`"bmmmdPY .JMMmmmmMMM .JMML.   .JMML.    .JMML.  .JMML.
                                                                                                                    
                                                                                                                    `}
      </pre>
    </div>
  );
}

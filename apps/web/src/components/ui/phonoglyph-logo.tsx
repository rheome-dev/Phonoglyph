'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PhonoglyphLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LOGO_TEXT = `                                                                                                                    
                                                                                                                    
\`7MM"""Mq.\`7MMF'  \`7MMF' .g8""8q. \`7MN.   \`7MF' .g8""8q.     .g8"""bgd \`7MMF'   \`YMM'   \`MM'\`7MM"""Mq.\`7MMF'  \`7MMF'
  MM   \`MM. MM      MM .dP'    \`YM. MMN.    M .dP'    \`YM. .dP'     \`M   MM       VMA   ,V    MM   \`MM. MM      MM  
  MM   ,M9  MM      MM dM'      \`MM M YMb   M dM'      \`MM dM'       \`   MM        VMA ,V     MM   ,M9  MM      MM  
  MMmmdM9   MMmmmmmmMM MM        MM M  \`MN. M MM        MM MM            MM         VMMP      MMmmdM9   MMmmmmmmMM  
  MM        MM      MM MM.      ,MP M   \`MM.M MM.      ,MP MM.    \`7MMF' MM      ,   MM       MM        MM      MM  
  MM        MM      MM \`Mb.    ,dP' M     YMM \`Mb.    ,dP' \`Mb.     MM   MM     ,M   MM       MM        MM      MM  
.JMML.    .JMML.  .JMML. \`"bmmd"' .JML.    YM   \`"bmmd"'     \`"bmmmdPY .JMMmmmmMMM .JMML.   .JMML.    .JMML.  .JMML.
                                                                                                                    
                                                                                                                    `;

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
  const [fontScale, setFontScale] = React.useState(1);

  const updateScale = React.useCallback(() => {
    if (!containerRef.current || !preRef.current) return;
    const availableWidth = containerRef.current.clientWidth;
    const naturalWidth = preRef.current.scrollWidth;
    if (availableWidth === 0 || naturalWidth === 0) {
      setFontScale(1);
      return;
    }
    const ratio = Math.min(1, availableWidth / naturalWidth);
    setFontScale(ratio);
  }, []);

  React.useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      setFontScale(1);
      return;
    }
    
    updateScale();

    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    if (preRef.current) {
      resizeObserver.observe(preRef.current);
    }

    const fontReady = (document as any)?.fonts?.ready;
    if (fontReady && typeof fontReady.then === 'function') {
      fontReady.then(updateScale).catch(() => {});
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [scale, updateScale]);
  
  const appliedFontSize = `${scaledFontSize * fontScale}px`;
  const appliedLineHeight = `${scaledLineHeight * fontScale}px`;

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
          fontSize: appliedFontSize,
          lineHeight: appliedLineHeight,
          letterSpacing: '0',
          margin: 0,
          padding: 0,
          fontVariantLigatures: 'none',
          fontKerning: 'none',
          fontFeatureSettings: '"liga" 0, "calt" 0, "kern" 0',
          textRendering: 'optimizeSpeed',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale'
        }}
      >
        {LOGO_TEXT}
      </pre>
    </div>
  );
}

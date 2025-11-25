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

// Detect Safari browser
function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /^((?!chrome|android).)*safari/i.test(ua);
}

export function PhonoglyphLogo({ className, size = 'md' }: PhonoglyphLogoProps) {
  const sizeScale = {
    sm: 0.67,
    md: 1,
    lg: 1.33
  } as const satisfies Record<NonNullable<PhonoglyphLogoProps['size']>, number>;

  const scale = sizeScale[size] ?? sizeScale.md;
  const baseFontSize = 3;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const preRef = React.useRef<HTMLPreElement>(null);
  const [transformScale, setTransformScale] = React.useState(1);
  const [safari, setSafari] = React.useState(false);

  React.useEffect(() => {
    setSafari(isSafari());
  }, []);

  const updateScale = React.useCallback(() => {
    if (!containerRef.current || !preRef.current) return;
    const availableWidth = containerRef.current.clientWidth;
    const naturalWidth = preRef.current.scrollWidth;
    if (availableWidth === 0 || naturalWidth === 0) {
      setTransformScale(1);
      return;
    }
    // Only scale down if overflowing
    const ratio = naturalWidth > availableWidth ? availableWidth / naturalWidth : 1;
    setTransformScale(ratio);
  }, []);

  React.useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      setTransformScale(1);
      return;
    }
    
    // Initial update
    updateScale();
    
    // Re-run after a short delay to catch font loading
    const timeoutId = setTimeout(updateScale, 100);

    const resizeObserver = new ResizeObserver(updateScale);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    if (preRef.current) {
      resizeObserver.observe(preRef.current);
    }

    // Also update when fonts are ready
    if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
      (document as any).fonts.ready.then(() => {
        updateScale();
        // Safari sometimes needs another tick
        setTimeout(updateScale, 50);
      }).catch(() => {});
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [scale, updateScale]);
  
  const scaledFontSize = baseFontSize * scale;
  const scaledLineHeight = baseFontSize * scale;
  
  // Safari renders JetBrains Mono wider horizontally, so we apply a correction factor
  // Use separate X/Y scaling to prevent vertical squishing
  const safariCorrectionX = safari ? 0.7 : 1;
  const safariCorrectionY = safari ? 1.0 : 1; // Keep vertical at 1.0 to prevent squish
  const finalScaleX = transformScale * safariCorrectionX;
  const finalScaleY = transformScale * safariCorrectionY;

  // Build transform string - only apply if we need scaling
  let transformValue: string | undefined;
  if (finalScaleX < 1 || finalScaleY < 1) {
    if (safari && finalScaleX < 1) {
      // Safari: separate X/Y scaling to prevent vertical squish
      transformValue = `scaleX(${finalScaleX}) scaleY(${finalScaleY})`;
    } else if (finalScaleX < 1) {
      // Other browsers: uniform scaling if needed
      transformValue = `scale(${finalScaleX})`;
    }
  }

  return (
    <div 
      ref={containerRef} 
      className="overflow-hidden w-full" 
      style={{ maxWidth: '100%' }}
    >
      <pre
        ref={preRef}
        className={cn(
          "whitespace-pre text-gray-100 block origin-top-left",
          className
        )}
        style={{
          fontFamily: '"JetBrains Mono", var(--font-mono), monospace',
          fontSize: `${scaledFontSize}px`,
          lineHeight: `${scaledLineHeight}px`,
          letterSpacing: '0',
          wordSpacing: '0',
          margin: 0,
          padding: 0,
          fontVariantLigatures: 'none',
          fontKerning: 'none',
          fontFeatureSettings: '"liga" 0, "calt" 0, "kern" 0',
          textRendering: 'geometricPrecision',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          transform: transformValue,
          transformOrigin: 'top left',
          pointerEvents: 'none', // Allow clicks to pass through to elements behind
        }}
      >
        {LOGO_TEXT}
      </pre>
    </div>
  );
}

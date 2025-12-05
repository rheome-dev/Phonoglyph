'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface RayboxLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LOGO_TEXT = `                                                            

 mmmmmm                        mm                           

 ##""""##                      ##                           

 ##    ##   m#####m  "##  ###  ##m###m    m####m   "##  ##" 

 #######    " mmm##   ##m ##   ##"  "##  ##"  "##    ####   

 ##  "##m  m##"""##    ####"   ##    ##  ##    ##    m##m   

 ##    ##  ##mmm###     ###    ###mm##"  "##mm##"   m#""#m  

 ""    """  """" ""     ##     "" """      """"    """  """ 

                      ###                                   

                                                            `;

// Detect Safari browser
function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /^((?!chrome|android).)*safari/i.test(ua);
}

export function RayboxLogo({ className, size = 'md' }: RayboxLogoProps) {
  const sizeScale = {
    sm: 0.67,
    md: 1,
    lg: 1.33
  } as const satisfies Record<NonNullable<RayboxLogoProps['size']>, number>;

  const scale = sizeScale[size] ?? sizeScale.md;
  const baseFontSize = 3;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const preRef = React.useRef<HTMLPreElement>(null);
  const [transformScale, setTransformScale] = React.useState(1);
  const [containerWidth, setContainerWidth] = React.useState<number | undefined>(undefined);
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
      setContainerWidth(undefined);
      return;
    }
    // Only scale down if overflowing
    const ratio = naturalWidth > availableWidth ? availableWidth / naturalWidth : 1;
    setTransformScale(ratio);
    
    // For Safari, constrain container width to scaled width to prevent blocking clicks
    const isSafariBrowser = isSafari();
    if (isSafariBrowser && ratio < 1) {
      const safariCorrectionX = 0.7;
      const scaledWidth = naturalWidth * ratio * safariCorrectionX;
      setContainerWidth(scaledWidth);
    } else {
      setContainerWidth(undefined);
    }
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
      className="overflow-hidden" 
      style={{ 
        width: containerWidth !== undefined ? `${containerWidth}px` : '100%',
        maxWidth: '100%',
        pointerEvents: 'none', // Allow clicks to pass through container as well
        position: 'relative',
        contain: 'layout style paint'
      }}
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
          willChange: transformValue ? 'transform' : 'auto', // Help Safari optimize transforms
        }}
      >
        {LOGO_TEXT}
      </pre>
    </div>
  );
}

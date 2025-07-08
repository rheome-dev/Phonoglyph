'use client';

import * as React from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const triggerRef = React.useRef<HTMLDivElement>(null);

  const showTooltip = (e: React.MouseEvent) => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      let x = 0;
      let y = 0;

      switch (side) {
        case 'top':
          x = rect.left + rect.width / 2;
          y = rect.top;
          break;
        case 'bottom':
          x = rect.left + rect.width / 2;
          y = rect.bottom;
          break;
        case 'left':
          x = rect.left;
          y = rect.top + rect.height / 2;
          break;
        case 'right':
          x = rect.right;
          y = rect.top + rect.height / 2;
          break;
      }

      setPosition({ x, y });
      setIsVisible(true);
    }
  };

  const hideTooltip = () => {
    setIsVisible(false);
  };

  const getTooltipClasses = () => {
    const baseClasses = 'fixed z-50 px-2 py-1 text-xs text-white bg-slate-900 border border-slate-700 rounded shadow-lg pointer-events-none';
    const sideClasses = {
      top: '-translate-x-1/2 -translate-y-full mb-1',
      bottom: '-translate-x-1/2 mt-1',
      left: '-translate-y-1/2 -translate-x-full mr-1',
      right: '-translate-y-1/2 ml-1',
    };
    
    return `${baseClasses} ${sideClasses[side]} ${className || ''}`;
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>
      
      {isVisible && (
        <div
          className={getTooltipClasses()}
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          {content}
        </div>
      )}
    </>
  );
}
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Draggable from 'react-draggable';
import { cn } from '@/lib/utils';

interface PortalModalProps {
  children: React.ReactNode;
  title: string;
  isOpen: boolean;
  onClose: () => void;
  initialPosition?: { x: number; y: number };
  className?: string;
  bounds?: string;
  portalContainerId?: string;
}

export function PortalModal({
  children,
  title,
  isOpen,
  onClose,
  initialPosition = { x: 0, y: 0 },
  className,
  bounds = '#editor-bounds',
  portalContainerId = 'modal-portal-root',
}: PortalModalProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [boundingBox, setBoundingBox] = useState<{ left: number; top: number; right: number; bottom: number } | null>(null);

  // Calculate and update bounds
  const updateBounds = useCallback(() => {
    if (!bounds) return;
    
    const boundsEl = document.querySelector(bounds);
    if (!boundsEl) return;

    const boundsRect = boundsEl.getBoundingClientRect();
    const modalWidth = 288; // w-72 = 18rem = 288px
    const modalHeight = nodeRef.current?.offsetHeight || 400; // Fallback height

    setBoundingBox({
      left: Math.floor(boundsRect.left),
      top: Math.floor(boundsRect.top),
      right: Math.floor(boundsRect.right - modalWidth),
      bottom: Math.floor(boundsRect.bottom - modalHeight)
    });
  }, [bounds]);

  // Set up bounds calculation and window resize handler
  useEffect(() => {
    if (!isOpen) return;

    // Initial bounds calculation
    updateBounds();

    // Recalculate on resize
    window.addEventListener('resize', updateBounds);
    
    // Set up mutation observer to watch for DOM changes that might affect bounds
    const observer = new MutationObserver(updateBounds);
    const boundsEl = document.querySelector(bounds || '');
    if (boundsEl) {
      observer.observe(boundsEl, { 
        attributes: true,
        childList: true,
        subtree: true 
      });
    }

    return () => {
      window.removeEventListener('resize', updateBounds);
      observer.disconnect();
    };
  }, [isOpen, bounds, updateBounds]);

  // Create portal container
  useEffect(() => {
    let container = document.getElementById(portalContainerId);
    if (!container) {
      container = document.createElement('div');
      container.id = portalContainerId;
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100vw';
      container.style.height = '100vh';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '50';
      document.body.appendChild(container);
    }
    setPortalContainer(container);

    return () => {
      // Only cleanup if this is the last modal being closed
      if (container && container.childNodes.length === 0) {
        // Use a small delay to ensure all cleanup is complete
        setTimeout(() => {
          if (container && container.childNodes.length === 0 && container.parentNode) {
            try {
        document.body.removeChild(container);
            } catch (error) {
              // Container might have already been removed, ignore the error
              console.warn('Portal container cleanup error:', error);
            }
          }
        }, 100);
      }
    };
  }, [portalContainerId]);

  if (!isOpen || !portalContainer) return null;

  const modalContent = (
    <div style={{ pointerEvents: 'auto' }}>
      <Draggable
        nodeRef={nodeRef}
        handle=".drag-handle"
        defaultPosition={initialPosition}
        bounds={boundingBox || undefined}
        onStart={updateBounds}
        onDrag={updateBounds}
      >
        <div 
          ref={nodeRef} 
          className={cn(
            "absolute top-0 left-0 w-72 rounded-lg shadow-2xl",
            "bg-white/10 backdrop-blur-xl border border-white/20",
            className
          )}
          style={{
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))'
          }}
        >
          {/* Title Bar */}
          <div className="drag-handle cursor-move bg-white p-1 rounded-t-md border-b border-black/30 flex items-center gap-1.5 h-7">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-4 h-4 border border-black/80 flex-shrink-0 bg-white hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center group relative"
              aria-label="Close"
            >
              <div className="absolute w-full h-0.5 bg-black transform rotate-45 scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></div>
              <div className="absolute w-full h-0.5 bg-black transform -rotate-45 scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></div>
            </button>

            {/* Title Text and Lines */}
            <div className="flex-grow flex items-center justify-center gap-1.5 overflow-hidden">
              <div className="space-y-0.5 flex-grow">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-px bg-black"></div>
                ))}
              </div>
              <span className="flex-shrink-0 bg-white px-1 text-xs font-mono font-bold text-black">{title}</span>
              <div className="space-y-0.5 flex-grow">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-px bg-black"></div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="p-4 rounded-b-md bg-transparent">
            {children}
          </div>
        </div>
      </Draggable>
    </div>
  );

  return createPortal(modalContent, portalContainer);
} 
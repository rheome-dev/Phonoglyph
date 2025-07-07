import React, { useRef } from 'react';
import Draggable from 'react-draggable';
import { cn } from '@/lib/utils';

interface DraggableModalProps {
  children: React.ReactNode;
  title: string;
  isOpen: boolean;
  onClose: () => void;
  initialPosition?: { x: number; y: number };
  className?: string;
}

export function DraggableModal({
  children,
  title,
  isOpen,
  onClose,
  initialPosition = { x: 0, y: 0 },
  className
}: DraggableModalProps) {
  const nodeRef = useRef(null);
  if (!isOpen) return null;

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".drag-handle"
      defaultPosition={initialPosition}
      bounds="#edit-canvas"
    >
      <div ref={nodeRef} className={cn("absolute top-0 left-0 w-72 rounded-lg shadow-2xl border border-black/20 z-20", className)}>
        {/* Recreated Vintage Mac OS Title Bar */}
        <div className="drag-handle cursor-move bg-white p-1 rounded-t-md border-b border-black/20 flex items-center gap-1.5 h-7">
          {/* Square Close Button */}
          <button
            onClick={onClose}
            className="w-4 h-4 border border-black/80 flex-shrink-0 bg-white hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center group relative"
            aria-label="Close"
          >
            <div className="absolute w-full h-0.5 bg-black transform rotate-45 scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></div>
            <div className="absolute w-full h-0.5 bg-black transform -rotate-45 scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></div>
          </button>

          {/* Title Text (with fixed width) and surrounding lines */}
          <div className="flex-grow flex items-center justify-center gap-1.5 overflow-hidden">
            <div className="space-y-0.5 flex-grow">
                {Array.from({ length: 6 }).map((_, i) => ( <div key={i} className="h-px bg-black"></div> ))}
            </div>
            <span className="flex-shrink-0 bg-white px-1 text-xs font-mono font-bold text-black/80">{title}</span>
            <div className="space-y-0.5 flex-grow">
                {Array.from({ length: 6 }).map((_, i) => ( <div key={i} className="h-px bg-black"></div> ))}
            </div>
          </div>
        </div>
        
        {/* Glassmorphism Content Area */}
        <div className="bg-black/20 backdrop-blur-xl p-4 rounded-b-md">
          {children}
        </div>
      </div>
    </Draggable>
  );
} 
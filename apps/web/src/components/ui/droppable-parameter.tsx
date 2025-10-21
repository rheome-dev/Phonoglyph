'use client';

import React from 'react';
import { useDrop } from 'react-dnd';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { ModulationAttenuator } from '@/components/ui/modulation-attenuator';

export interface DraggableFeatureItem {
  id: string;
  name: string;
  stemType?: string;
}

export interface DroppableParameterProps {
  parameterId: string;
  label: string;
  children: React.ReactNode;
  mappedFeatureId?: string | null;
  mappedFeatureName?: string;
  modulationAmount?: number;
  onFeatureDrop: (parameterId: string, featureId: string, stemType?: string) => void;
  onFeatureUnmap: (parameterId: string) => void;
  onModulationAmountChange?: (parameterId: string, amount: number) => void;
  className?: string;
  dropZoneStyle?: string;
  showTagOnHover?: boolean;
}

export const DroppableParameter: React.FC<DroppableParameterProps> = ({
  parameterId,
  label,
  children,
  mappedFeatureId,
  mappedFeatureName,
  modulationAmount = 1.0,
  onFeatureDrop,
  onFeatureUnmap,
  onModulationAmountChange,
  className = '',
  dropZoneStyle = '',
  showTagOnHover = false
}) => {
  // Wrap useDrop in try-catch to handle context errors
  let dropState = { isOver: false, canDrop: false };
  let dropRef: React.RefCallback<HTMLDivElement> = () => {};
  
  try {
    const dropResult = useDrop({
      accept: 'feature',
      drop: (item: DraggableFeatureItem) => {
        onFeatureDrop(parameterId, item.id, item.stemType);
      },
      canDrop: () => true,
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    });
    
    dropState = dropResult[0];
    const drop = dropResult[1];
    
    dropRef = React.useCallback((node: HTMLDivElement | null) => {
      drop(node);
    }, [drop]);
  } catch (error) {
    // If drop context is not available, just use a no-op
    console.warn('Drop context not available for DroppableParameter:', error);
  }

  // For hover badge
  const [hovered, setHovered] = React.useState(false);

  return (
    <div className={`space-y-2 ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-between">
        <label className="text-white/80 text-xs font-mono">{label}</label>
        <div className="flex items-center gap-2">
          {/* Drop Zone - Embossed Pill */}
          <div
            ref={dropRef}
            className={`
              relative flex items-center justify-center w-8 h-6 rounded-full cursor-pointer
              transition-all duration-200 ease-out
              ${mappedFeatureId 
                ? 'bg-emerald-600/20 border-2 border-emerald-500/50 shadow-lg' 
                : 'bg-stone-700/50 border-2 border-stone-600/50 shadow-inner'
              }
              ${dropState.isOver && dropState.canDrop 
                ? 'scale-110 bg-emerald-500/30 border-emerald-400 shadow-lg ring-2 ring-emerald-400/50' 
                : ''
              }
              ${!mappedFeatureId && !dropState.isOver 
                ? 'hover:bg-stone-600/60 hover:border-stone-500/60' 
                : ''
              }
              ${dropZoneStyle === 'inlayed' ? 'ring-2 ring-stone-900/80 shadow-[inset_0_2px_8px_rgba(0,0,0,0.7),0_2px_8px_rgba(16,185,129,0.15)]' : ''}
            `}
            style={{
              // Embossed effect with multiple shadows
              boxShadow: mappedFeatureId 
                ? `
                  inset 0 1px 0 rgba(255, 255, 255, 0.1),
                  inset 0 -1px 0 rgba(0, 0, 0, 0.2),
                  0 2px 4px rgba(0, 0, 0, 0.3),
                  0 0 8px rgba(16, 185, 129, 0.3),
                  ${dropZoneStyle === 'inlayed' ? 'inset 0 4px 12px rgba(0,0,0,0.7)' : ''}
                `
                : `
                  inset 0 1px 0 rgba(255, 255, 255, 0.05),
                  inset 0 -1px 0 rgba(0, 0, 0, 0.3),
                  0 1px 2px rgba(0, 0, 0, 0.2),
                  ${dropZoneStyle === 'inlayed' ? 'inset 0 4px 12px rgba(0,0,0,0.7)' : ''}
                `,
              // Subtle gradient for depth
              background: mappedFeatureId
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)'
                : 'linear-gradient(135deg, rgba(68, 64, 60, 0.5) 0%, rgba(41, 37, 36, 0.5) 100%)'
            }}
          >
            {/* Drop indicator */}
            {!mappedFeatureId && (
              <div className={`
                w-2 h-2 rounded-full transition-all duration-200
                ${dropState.isOver && dropState.canDrop 
                  ? 'bg-emerald-400 scale-125' 
                  : 'bg-stone-400/50'
                }
              `} />
            )}
            {/* Mapped feature indicator */}
            {mappedFeatureId && (
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>
          
          {/* Modulation Attenuator - only show when feature is mapped */}
          {mappedFeatureId && onModulationAmountChange && (
            <ModulationAttenuator
              value={modulationAmount}
              onChange={(amount) => onModulationAmountChange(parameterId, amount)}
              size="sm"
            />
          )}
        </div>
      </div>
      {/* Parameter Control */}
      <div className="relative">
        {children}
        {/* Mapped Feature Badge */}
        {mappedFeatureId && mappedFeatureName && (!showTagOnHover || hovered) && (
          <div className="absolute -top-2 -right-2 z-10">
            <Badge 
              className="bg-emerald-600/90 text-emerald-100 text-xs px-2 py-1 border border-emerald-500/50 shadow-lg"
              style={{
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3), 0 0 8px rgba(16, 185, 129, 0.2)'
              }}
            >
              <span className="mr-1">{mappedFeatureName}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFeatureUnmap(parameterId);
                }}
                className="ml-1 hover:bg-emerald-500/50 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </div>
        )}
      </div>
      {/* Drop hint */}
      {dropState.isOver && dropState.canDrop && !mappedFeatureId && (
        <div className="text-xs text-emerald-400/80 font-mono animate-pulse">
          Drop to map feature
        </div>
      )}
    </div>
  );
}; 
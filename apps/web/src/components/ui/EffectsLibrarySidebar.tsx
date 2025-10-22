import React, { useState, useMemo } from 'react';
import { useDrag } from 'react-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Extended interface to support categorization and rarity for the UI
export interface EffectUIData {
  id: string;
  name: string;
  description: string;
  category: 'Generative' | 'Overlays' | 'Post-Processing';
  rarity: 'Common' | 'Rare' | 'Mythic';
  parameters?: Record<string, any>; // <-- Added optional parameters property
  image?: string; // <-- Added optional image property
}

interface EffectsLibrarySidebarProps {
  effects: EffectUIData[];
  selectedEffects: Record<string, boolean>;
  onEffectToggle: (effectId: string) => void;
  onEffectDoubleClick: (effectId: string) => void; // New prop for double-click
  isVisible: boolean;
  className?: string;
}

// Draggable Effect Card Component
const DraggableEffectCard: React.FC<{
  effect: EffectUIData;
  cardStyle: any;
  onDoubleClick: () => void;
}> = ({ effect, cardStyle, onDoubleClick }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'EFFECT_CARD',
    item: {
      type: 'EFFECT_CARD',
      id: effect.id,
      name: effect.name,
      category: effect.category,
      rarity: effect.rarity,
      parameters: effect.parameters
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div 
      ref={drag as any}
      className="cursor-grab"
    >
      <div
        className={cn(
          "cursor-grab active:cursor-grabbing transition-all duration-200 border relative overflow-hidden p-2 rounded-md flex flex-col",
          "hover:bg-gray-800",
          cardStyle.background,
          cardStyle.border,
          isDragging ? "opacity-50" : ""
        )}
        onDoubleClick={onDoubleClick}
      >
        {/* Rarity indicator (top right) */}
        <div className={cn("absolute top-1 right-1 w-4 h-4 border flex items-center justify-center", cardStyle.frameColor, "border-gray-600")}>
          <span className="text-black font-bold text-xs">
            {effect.rarity === 'Common' ? 'C' : effect.rarity === 'Rare' ? 'R' : 'M'}
          </span>
        </div>

        {/* Title - fixed height */}
        <div className="relative z-10 mb-1">
          <div className="flex items-center gap-1 font-mono text-[10px] font-bold tracking-wide text-white">
            <div 
              className="w-1 h-1 flex-shrink-0 border border-gray-600"
              style={{ 
                backgroundColor: '#71717a'
              }}
            />
            {effect.name.toUpperCase().replace(' EFFECT', '')}
          </div>
        </div>
        
        {/* Card art area - square and fills width */}
        <div className="relative z-10 w-full aspect-square bg-gray-800 border border-gray-600 overflow-hidden rounded p-1">
          {effect.image ? (
            <img 
              src={effect.image} 
              alt={effect.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-xs">
                  {effect.category === 'Generative' ? '🌊' : effect.category === 'Overlays' ? '📊' : '✨'}
                </div>
                <div className="text-xs font-mono text-gray-300 uppercase tracking-wider">
                  {effect.category.slice(0, 3)}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Drag indicator */}
        <div className="absolute bottom-1 right-1 z-20">
          <div className="bg-gray-600 text-gray-900 text-xs font-bold px-1 py-0.5 border border-gray-700">
            ↙
          </div>
        </div>
      </div>
    </div>
  );
};

export function EffectsLibrarySidebar({
  effects,
  selectedEffects,
  onEffectToggle,
  onEffectDoubleClick,
  isVisible,
  className
}: EffectsLibrarySidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Generative': true,
    'Overlays': true,
    'Post-Processing': true
  });

  // Filter effects based on search query
  const filteredEffects = useMemo(() => {
    if (!searchQuery.trim()) return effects;
    
    const query = searchQuery.toLowerCase();
    return effects.filter(effect => 
      effect.name.toLowerCase().includes(query) ||
      effect.description.toLowerCase().includes(query) ||
      effect.category.toLowerCase().includes(query) ||
      effect.rarity.toLowerCase().includes(query)
    );
  }, [effects, searchQuery]);

  // Group filtered effects by category
  const categorizedEffects = useMemo(() => {
    const categories: Record<string, EffectUIData[]> = {
      'Generative': [],
      'Overlays': [],
      'Post-Processing': []
    };

    filteredEffects.forEach(effect => {
      if (categories[effect.category]) {
        categories[effect.category].push(effect);
      }
    });

    return categories;
  }, [filteredEffects]);

  // Get card styling - all cards are now grey
  const getCardStyle = (rarity: string, isActive: boolean) => {
    // All cards use the same grey styling regardless of rarity
    return {
      name: rarity,
      background: 'bg-gray-700',
      border: 'border-gray-600',
      glow: 'shadow-gray-600/50',
      textColor: 'text-white',
      frameColor: 'bg-gray-500'
    };
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={cn("h-full flex flex-col bg-black border-l border-gray-800", className)}>
      {/* Header */}
      <div className="p-3 border-b border-gray-800">
        <h2 className="font-mono text-sm font-bold text-gray-100 uppercase tracking-wider mb-2">
          Effects Library
        </h2>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search effects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-7 py-1.5 bg-gray-900 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-600 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {Object.entries(categorizedEffects).map(([category, categoryEffects]) => {
          if (categoryEffects.length === 0) return null;
          
          const isExpanded = expandedCategories[category];
          
          return (
            <div key={category} className="space-y-1.5">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-2 bg-gray-900 border border-gray-700 hover:bg-gray-800 transition-colors"
              >
                <span className="font-mono text-xs font-semibold text-gray-300 uppercase tracking-wide">
                  {category}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {categoryEffects.length}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Category Effects Grid */}
              {isExpanded && (
                <div className="grid grid-cols-2 gap-1.5 w-full">
                  {categoryEffects.map((effect, index) => {
                    const cardStyle = getCardStyle(effect.rarity, selectedEffects[effect.id]);
                    
                    return (
                      <DraggableEffectCard
                        key={effect.id}
                        effect={effect}
                        cardStyle={cardStyle}
                        onDoubleClick={() => onEffectDoubleClick(effect.id)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* No results message */}
        {filteredEffects.length === 0 && (
          <div className="text-center py-4">
            <div className="text-gray-500 text-xs">
              No effects found matching "{searchQuery}"
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearSearch}
              className="mt-2 text-xs text-gray-400 border-gray-700 hover:bg-gray-800"
            >
              Clear search
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 
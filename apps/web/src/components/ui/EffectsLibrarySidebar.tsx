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
      ref={drag}
      className="group perspective-1000"
    >
      <Card
        className={cn(
          "h-36 cursor-grab active:cursor-grabbing transition-all duration-500 ease-out border-4 relative overflow-hidden p-0",
          "transform-gpu hover:scale-105 rounded-xl",
          "group-hover:rotate-y-6 group-hover:rotate-x-2",
          cardStyle.background,
          cardStyle.border,
          isDragging ? "opacity-50 scale-95" : "hover:shadow-xl"
        )}
        style={{ 
          transformStyle: 'preserve-3d',
        }}
        onDoubleClick={onDoubleClick}
        onMouseMove={(e) => {
          if (isDragging) return;
          const card = e.currentTarget;
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const rotateX = (y - centerY) / 20;
          const rotateY = (centerX - x) / 20;
          
          card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
        }}
        onMouseLeave={(e) => {
          if (isDragging) return;
          e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
        }}
      >
        {/* MTG-style card frame overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 rounded-xl" />
        
        {/* Ornate frame border */}
        <div className={cn("absolute inset-2 border-2 rounded-lg", cardStyle.frameColor)} />
        
        {/* Rarity indicator (top right) */}
        <div className={cn("absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center", cardStyle.frameColor, "border-white/60")}>
          <span className="text-black font-bold text-xs">
            {effect.rarity === 'Common' ? 'C' : effect.rarity === 'Rare' ? 'R' : 'M'}
          </span>
        </div>

        <CardHeader className="relative z-10 pb-0 p-2">
          <CardTitle className="flex items-center gap-1 font-serif text-xs font-bold tracking-wide text-black">
            <div 
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 border border-white/60"
              style={{ 
                backgroundColor: '#71717a'
              }}
            />
            {effect.name.toUpperCase().replace(' EFFECT', '')}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="relative z-10 p-2 flex-1 flex flex-col">
          {/* Card art area */}
          <div className="h-12 mb-1 rounded-lg bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-600 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
            <div className="text-center relative z-10">
              <div className="text-sm drop-shadow-lg">
                {effect.category === 'Generative' ? '🌊' : effect.category === 'Overlays' ? '📊' : '✨'}
              </div>
              <div className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                {effect.category.slice(0, 3)}
              </div>
            </div>
          </div>
          
          {/* Drag indicator */}
          <div className="absolute bottom-1 right-1 z-20">
            <div className="bg-stone-400 text-stone-900 text-xs font-bold px-1 py-0.5 rounded border border-stone-600 shadow-lg">
              ↙
            </div>
          </div>
        </CardContent>
      </Card>
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

  // Get card styling based on rarity
  const getCardStyle = (rarity: string, isActive: boolean) => {
    const rarityStyles = {
      'Common': {
        name: 'Common',
        background: 'bg-gradient-to-b from-zinc-500 via-stone-600 to-neutral-700',
        border: 'border-zinc-400',
        glow: 'shadow-zinc-400/50',
        textColor: 'text-white',
        frameColor: 'bg-gradient-to-b from-zinc-300 to-stone-400'
      },
      'Rare': {
        name: 'Rare',
        background: 'bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700',
        border: 'border-blue-400',
        glow: 'shadow-blue-400/50',
        textColor: 'text-white',
        frameColor: 'bg-gradient-to-b from-blue-300 to-blue-400'
      },
      'Mythic': {
        name: 'Mythic Rare',
        background: 'bg-gradient-to-b from-orange-500 via-amber-600 to-yellow-700',
        border: 'border-orange-400',
        glow: 'shadow-orange-400/50',
        textColor: 'text-white',
        frameColor: 'bg-gradient-to-b from-orange-300 to-amber-400'
      }
    };

    return rarityStyles[rarity as keyof typeof rarityStyles] || rarityStyles['Common'];
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
    <div className={cn("h-full flex flex-col bg-stone-900/95 border-l border-stone-600", className)}>
      {/* Header */}
      <div className="p-4 border-b border-stone-600">
        <h2 className="font-sans text-lg font-bold text-white uppercase tracking-wider mb-3">
          Effects Library
        </h2>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search effects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 bg-stone-800 border border-stone-600 rounded-lg text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-stone-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(categorizedEffects).map(([category, categoryEffects]) => {
          if (categoryEffects.length === 0) return null;
          
          const isExpanded = expandedCategories[category];
          
          return (
            <div key={category} className="space-y-2">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-3 bg-stone-800/50 border border-stone-600 rounded-lg hover:bg-stone-700/50 transition-colors"
              >
                <span className="font-semibold text-white uppercase tracking-wide">
                  {category}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">
                    {categoryEffects.length} effect{categoryEffects.length !== 1 ? 's' : ''}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-stone-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-stone-400" />
                  )}
                </div>
              </button>

              {/* Category Effects Grid */}
              {isExpanded && (
                <div className="grid grid-cols-2 gap-2 w-full">
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
          <div className="text-center py-8">
            <div className="text-stone-400 text-sm">
              No effects found matching "{searchQuery}"
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearSearch}
              className="mt-2 text-stone-300 border-stone-600 hover:bg-stone-700"
            >
              Clear search
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 
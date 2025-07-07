import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EffectCarouselProps {
  effects: { id: string; name: string; description: string }[];
  selectedEffects: Record<string, boolean>;
  onSelectEffect: (id: string) => void;
  className?: string;
}

export function EffectCarousel({
  effects,
  selectedEffects,
  onSelectEffect,
  className
}: EffectCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
    slidesToScroll: 1,
    skipSnaps: false,
  });

  const [isCollapsed, setIsCollapsed] = useState(false);

  // Handle wheel scrolling for horizontal scroll
  const handleWheel = useCallback((event: WheelEvent) => {
    if (!emblaApi) return;
    
    // Prevent default vertical scrolling
    event.preventDefault();
    
    // Convert vertical scroll to horizontal scroll
    const scrollAmount = event.deltaY > 0 ? 1 : -1;
    emblaApi.scrollTo(emblaApi.selectedScrollSnap() + scrollAmount);
  }, [emblaApi]);

  // Add wheel event listener when embla is ready
  useEffect(() => {
    if (!emblaApi) return;

    const emblaContainer = emblaApi.containerNode();
    if (!emblaContainer) return;

    emblaContainer.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      emblaContainer.removeEventListener('wheel', handleWheel);
    };
  }, [emblaApi, handleWheel]);

  // Unified soft grey-beige color scheme for all cards
  const getCardStyle = (index: number, isActive: boolean) => {
    const cardTypes = [
      { 
        name: 'Mythic Rare',
        background: 'bg-gradient-to-b from-zinc-500 via-stone-600 to-neutral-700',
        border: 'border-zinc-400',
        glow: 'shadow-zinc-400/50',
        textColor: 'text-white',
        frameColor: 'bg-gradient-to-b from-zinc-300 to-stone-400'
      },
      { 
        name: 'Rare',
        background: 'bg-gradient-to-b from-zinc-500 via-stone-600 to-neutral-700',
        border: 'border-zinc-400',
        glow: 'shadow-zinc-400/50',
        textColor: 'text-white',
        frameColor: 'bg-gradient-to-b from-zinc-300 to-stone-400'
      },
      { 
        name: 'Uncommon',
        background: 'bg-gradient-to-b from-zinc-500 via-stone-600 to-neutral-700',
        border: 'border-zinc-400',
        glow: 'shadow-zinc-400/50',
        textColor: 'text-white',
        frameColor: 'bg-gradient-to-b from-zinc-300 to-stone-400'
      }
    ];
    
    return cardTypes[index % cardTypes.length];
  };

  return (
    <div className={cn("w-full relative", className)}>
      {/* Show/Hide Toggle - Positioned to overlap with canvas */}
      <div className="absolute top-0 right-0 z-10" style={{ transform: 'translateY(-50px)' }}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="bg-stone-200 border-stone-400 text-stone-700 hover:bg-stone-100 hover:border-stone-500 font-sans text-xs uppercase tracking-wide"
        >
          {isCollapsed ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronUp className="h-4 w-4 mr-1" />}
          {isCollapsed ? 'Show' : 'Hide'} Effects
        </Button>
      </div>

      {/* Collapsible Carousel Container */}
      <div 
        className={cn(
          "overflow-hidden border-t-2 border-b-2 border-stone-400 bg-gradient-to-r from-stone-400 via-stone-300 to-stone-400 transition-all duration-500 ease-in-out",
          isCollapsed ? "max-h-0 py-0 opacity-0" : "max-h-[500px] py-8 opacity-100"
        )}
        ref={emblaRef}
      >
          <div className="flex gap-8 px-8">
            {effects.map((effect, index) => {
              const cardStyle = getCardStyle(index, selectedEffects[effect.id]);
              
              return (
                <div 
                  key={effect.id} 
                  className="flex-shrink-0 w-64 group perspective-1000"
                >
                  <Card
                    className={cn(
                      "h-96 cursor-pointer transition-all duration-500 ease-out border-4 relative overflow-hidden p-0",
                      "transform-gpu hover:scale-105 rounded-xl",
                      "group-hover:rotate-y-12 group-hover:rotate-x-3",
                      cardStyle.background,
                      cardStyle.border,
                      selectedEffects[effect.id]
                        ? `${cardStyle.glow} shadow-2xl ring-4 ring-white/30`
                        : "hover:shadow-xl"
                    )}
                    style={{ 
                      transformStyle: 'preserve-3d',
                    }}
                    onClick={() => onSelectEffect(effect.id)}
                    onMouseMove={(e) => {
                      const card = e.currentTarget;
                      const rect = card.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const y = e.clientY - rect.top;
                      const centerX = rect.width / 2;
                      const centerY = rect.height / 2;
                      const rotateX = (y - centerY) / 15;
                      const rotateY = (centerX - x) / 15;
                      
                      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
                    }}
                  >
                    {/* MTG-style card frame overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 rounded-xl" />
                    
                    {/* Ornate frame border */}
                    <div className={cn("absolute inset-2 border-2 rounded-lg", cardStyle.frameColor)} />
                    
                    {/* Mana cost indicator (top right) */}
                    <div className={cn("absolute top-3 right-3 w-8 h-8 rounded-full border-2 flex items-center justify-center", cardStyle.frameColor, "border-white/60")}>
                      <span className="text-black font-bold text-sm">{index + 1}</span>
                    </div>

                    <CardHeader className="relative z-10 pb-2">
                      <CardTitle className="flex items-center gap-2 font-serif text-sm font-bold tracking-wide text-black">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0 border-2 border-white/60"
                          style={{ 
                            backgroundColor: '#71717a'
                          }}
                        />
                        {effect.name.toUpperCase().replace(' EFFECT', '')}
                      </CardTitle>
                      
                      {/* Card type line */}
                      <div className="text-xs font-mono uppercase tracking-wider text-black opacity-70">
                        {cardStyle.name} — Visual
                      </div>
                    </CardHeader>
                    
                    <CardContent className="relative z-10 p-4 flex-1 flex flex-col">
                      {/* Card art area - larger like MTG */}
                      <div className="h-36 mb-2 rounded-lg bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-600 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
                        <div className="text-center relative z-10">
                          <div className="text-3xl mb-1 drop-shadow-lg">
                            {index === 0 ? '🌊' : index === 1 ? '📊' : '✨'}
                          </div>
                          <div className="text-xs font-mono text-slate-300 uppercase tracking-wider">
                            ART
                          </div>
                        </div>
                      </div>
                      
                      {/* Card text - extends to bottom with matching spacing */}
                      <div className="bg-gradient-to-b from-slate-100 to-slate-200 rounded-lg p-3 pr-6 pb-4 border border-slate-400 flex-1 -mb-6 relative">
                        <p className="text-xs text-slate-900 font-serif leading-relaxed">
                          {effect.description.replace(/effect/gi, '').replace(/visual/gi, 'visual')}
                        </p>
                        
                        {/* Active status - MTG power/toughness style overlay */}
                        {selectedEffects[effect.id] && (
                          <div className="absolute -bottom-1 -right-1 z-20">
                            <div className="bg-slate-200 text-slate-900 text-xs font-bold px-2 py-1 rounded-md border-2 border-slate-600 shadow-lg">
                              ⚡
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
            
            {/* Placeholder MTG-style cards */}
            {Array.from({ length: 3 }).map((_, index) => (
              <div 
                key={`placeholder-${index}`} 
                className="flex-shrink-0 w-64 group perspective-1000"
              >
                <Card
                  className="h-96 border-4 border-dashed border-stone-500 bg-gradient-to-b from-stone-700 to-stone-800 opacity-60 rounded-xl relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/30 rounded-xl" />
                  
                  <CardHeader className="relative z-10 pb-3">
                    <CardTitle className="text-stone-300 flex items-center gap-3 font-serif text-lg font-bold tracking-wide">
                      <div className="w-3 h-3 rounded-full bg-stone-500 border-2 border-stone-400" />
                      Coming Soon
                    </CardTitle>
                    <div className="text-xs font-mono uppercase tracking-wider text-stone-400">
                      Future — Visual Effect
                    </div>
                  </CardHeader>
                  
                  <CardContent className="relative z-10 p-4">
                    <div className="h-32 mb-4 rounded-lg bg-black/50 border border-stone-600 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl mb-2 text-stone-400">❓</div>
                        <div className="text-xs font-mono text-stone-300 uppercase tracking-wider">
                          UNKNOWN
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-stone-600/50 rounded-lg p-3">
                      <p className="text-xs text-stone-300 font-serif leading-relaxed">
                        More visual effects will be added here as the library expands.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
      </div>

      {/* Title bar at bottom */}
      <div className="mt-4">
        <h2 className="font-sans text-lg font-bold text-gray-900 uppercase tracking-wider mb-2">
          Visual Effects Library
        </h2>
        <p className="font-sans text-xs text-gray-600 uppercase tracking-wide">
          ← Drag or scroll to explore effects → Select effects to configure and activate
        </p>
      </div>
    </div>
  );
} 
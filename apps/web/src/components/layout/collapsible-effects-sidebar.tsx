'use client';

import * as React from 'react';
import { ChevronsLeft, ChevronsRight, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleEffectsSidebarProps {
  children: React.ReactNode;
}

export function CollapsibleEffectsSidebar({ children }: CollapsibleEffectsSidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  return (
    <div
      className={cn(
        "relative bg-stone-900 border-l border-white/10 transition-all duration-300 ease-in-out z-20",
        isCollapsed ? "w-16" : "w-80"
      )}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className={cn("flex items-center p-4 border-b border-white/10", isCollapsed ? 'justify-center' : 'justify-between')}>
          <div className={cn("flex items-center gap-2", isCollapsed && "hidden")}>
            <Palette className="h-5 w-5 text-white/70" />
            <span className="text-lg font-semibold text-white">Effects Library</span>
          </div>
          {isCollapsed && (
            <Palette className="h-6 w-6 text-white/70" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isCollapsed ? (
            <div className="flex justify-center items-center p-4 h-full">
              <div className="text-center space-y-3 text-white/50">
                <Palette className="w-8 h-8 mx-auto" />
                <div className="text-xs">Effects</div>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
      
      {/* Collapse/Expand Button */}
      <button
        onClick={toggleSidebar}
        className="absolute top-1/2 -translate-y-1/2 -left-4 w-8 h-28 bg-stone-800 hover:bg-stone-700 rounded-l-lg border-y border-l border-white/10 flex items-center justify-center transition-colors"
        aria-label="Toggle effects sidebar"
      >
        {isCollapsed ? <ChevronsLeft className="h-6 w-6 text-white/60" /> : <ChevronsRight className="h-6 w-6 text-white/60" />}
      </button>
    </div>
  );
} 
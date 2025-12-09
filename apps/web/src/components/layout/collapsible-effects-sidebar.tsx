'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleEffectsSidebarProps {
  children: React.ReactNode;
  expandedWidth?: string; // Optional custom width when expanded (default: 'w-80')
}

export function CollapsibleEffectsSidebar({ 
  children,
  expandedWidth = 'w-80' 
}: CollapsibleEffectsSidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  return (
    <div className="relative flex h-full">
      {/* Collapse/Expand Tab Container - positioned to float */}
      <div className="relative flex-shrink-0 self-center z-10">
        {/* Top rounded corner connector */}
        <div 
          className="absolute -top-[6px] right-0 w-[6px] h-[6px]"
          style={{
            background: 'radial-gradient(circle at 100% 100%, transparent 6px, rgb(28 25 23) 6px)'
          }}
        />
        
        {/* The tab button */}
        <button
          onClick={toggleSidebar}
          className={cn(
            "w-5 h-14",
            "bg-stone-900 hover:bg-stone-800",
            "border-y border-l border-white/10 rounded-l-md",
            "flex items-center justify-center transition-all duration-200",
            "hover:w-6 group"
          )}
          aria-label="Toggle effects sidebar"
        >
          {isCollapsed ? (
            <ChevronLeft className="h-4 w-4 text-white/50 group-hover:text-white/80 transition-colors" />
          ) : (
            <ChevronRight className="h-4 w-4 text-white/50 group-hover:text-white/80 transition-colors" />
          )}
        </button>

        {/* Bottom rounded corner connector */}
        <div 
          className="absolute -bottom-[6px] right-0 w-[6px] h-[6px]"
          style={{
            background: 'radial-gradient(circle at 100% 0%, transparent 6px, rgb(28 25 23) 6px)'
          }}
        />
      </div>

      {/* Main Sidebar */}
      <div
        className={cn(
          "bg-stone-900 border-l border-white/10 transition-all duration-300 ease-in-out h-full",
          isCollapsed ? "w-0 overflow-hidden" : expandedWidth
        )}
      >
        <div className="h-full flex flex-col min-w-0">
          {/* Header */}
          <div className={cn(
            "flex items-center p-4 border-b border-white/10",
            isCollapsed ? 'justify-center' : 'justify-between'
          )}>
            <div className={cn("flex items-center gap-2", isCollapsed && "hidden")}>
              <Palette className="h-5 w-5 text-white/70" />
              <span className="text-lg font-semibold text-white">Effects Library</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {!isCollapsed && children}
          </div>
        </div>
      </div>
    </div>
  );
}

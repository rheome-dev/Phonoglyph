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
    <div className="relative flex">
      {/* Collapse/Expand Tab - sits completely outside the sidebar */}
      <button
        onClick={toggleSidebar}
        className={cn(
          "flex-shrink-0 w-5 h-16 self-center",
          "bg-stone-800/80 hover:bg-stone-700 backdrop-blur-sm",
          "border border-r-0 border-white/10 rounded-l-md",
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

      {/* Main Sidebar */}
      <div
        className={cn(
          "bg-stone-900 border-l border-white/10 transition-all duration-300 ease-in-out",
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

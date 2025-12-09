'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleEffectsSidebarProps {
  children: React.ReactNode;
  expandedWidth?: string;
}

export function CollapsibleEffectsSidebar({ 
  children,
  expandedWidth = 'w-80' 
}: CollapsibleEffectsSidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  return (
    <div className="relative flex h-full">
      {/* Collapse/Expand Tab - uses pseudo-elements for corner connectors */}
      <div className="relative flex-shrink-0 self-center z-10">
        <button
          onClick={toggleSidebar}
          className="collapse-tab-right group"
          aria-label="Toggle effects sidebar"
        >
          {isCollapsed ? (
            <ChevronLeft className="h-4 w-4 text-white/50 group-hover:text-white/80 transition-colors" />
          ) : (
            <ChevronRight className="h-4 w-4 text-white/50 group-hover:text-white/80 transition-colors" />
          )}
        </button>
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

      <style jsx>{`
        .collapse-tab-right {
          --tab-bg: rgb(28 25 23); /* stone-900 */
          position: relative;
          width: 20px;
          height: 56px;
          background: var(--tab-bg);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-right: none;
          border-top-left-radius: 8px;
          border-bottom-left-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.2s ease, width 0.2s ease;
        }
        
        .collapse-tab-right:hover {
          --tab-bg: rgb(41 37 36); /* stone-800 */
          background: var(--tab-bg);
          width: 24px;
        }
        
        /* Top corner connector - circle at bottom-right creates curve connecting to sidebar */
        .collapse-tab-right::before {
          content: '';
          position: absolute;
          top: -12px;
          right: -1px;
          width: 12px;
          height: 12px;
          background: radial-gradient(circle at 100% 100%, transparent 11px, var(--tab-bg) 11px);
          pointer-events: none;
        }
        
        /* Bottom corner connector - circle at top-right creates curve connecting to sidebar */
        .collapse-tab-right::after {
          content: '';
          position: absolute;
          bottom: -12px;
          right: -1px;
          width: 12px;
          height: 12px;
          background: radial-gradient(circle at 100% 0%, transparent 11px, var(--tab-bg) 11px);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

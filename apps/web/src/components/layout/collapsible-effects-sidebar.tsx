'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
    <div className="relative h-full">
      {/* Main Sidebar */}
      <div
        className={cn(
          "bg-stone-900 border-l border-white/10 transition-all duration-300 ease-in-out h-full",
          isCollapsed ? "w-0 overflow-hidden" : expandedWidth
        )}
      >
        <div className="h-full flex flex-col min-w-0">
          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {!isCollapsed && children}
          </div>
        </div>
      </div>

      {/* Collapse/Expand Tab - absolutely positioned to float over main content */}
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

      <style jsx>{`
        .collapse-tab-right {
          --tab-bg: rgb(0 0 0); /* black */
          position: absolute;
          top: 50%;
          left: -20px;
          transform: translateY(-50%);
          width: 20px;
          height: 80px;
          background: var(--tab-bg);
          border: none;
          border-top-left-radius: 8px;
          border-bottom-left-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.2s ease;
          z-index: 10;
        }
        
        .collapse-tab-right:hover {
          --tab-bg: rgb(24 24 27); /* zinc-900 */
          background: var(--tab-bg);
        }
        
        /* Top corner connector - flipped Y axis */
        .collapse-tab-right::before {
          content: '';
          position: absolute;
          top: -12px;
          right: 0;
          width: 12px;
          height: 12px;
          background: radial-gradient(circle at 0% 0%, transparent 12px, var(--tab-bg) 12px);
          pointer-events: none;
        }
        
        /* Bottom corner connector - flipped Y axis */
        .collapse-tab-right::after {
          content: '';
          position: absolute;
          bottom: -12px;
          right: 0;
          width: 12px;
          height: 12px;
          background: radial-gradient(circle at 0% 100%, transparent 12px, var(--tab-bg) 12px);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

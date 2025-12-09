'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, Home, Folder, User, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RayboxLogo } from '@/components/ui/phonoglyph-logo';

interface CollapsibleSidebarProps {
  children: React.ReactNode;
}

const NavLink = ({ href, icon: Icon, label, isCollapsed }: { href: string; icon: React.ElementType; label: string; isCollapsed: boolean }) => (
  <a
    href={href}
    className="flex items-center p-2 text-gray-300 rounded-lg hover:bg-gray-800 group"
  >
    <Icon className="w-6 h-6 text-gray-400 transition duration-75 group-hover:text-gray-200" />
    <span className={cn("ml-3", isCollapsed && "hidden")}>{label}</span>
  </a>
);

export function CollapsibleSidebar({ children }: CollapsibleSidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  return (
    <div className="relative flex h-full">
      {/* Main Sidebar */}
      <div
        className={cn(
          "bg-black border-r border-gray-800 transition-all duration-300 ease-in-out h-full",
          isCollapsed ? "w-0 overflow-hidden" : "w-64"
        )}
      >
        <div className="h-full flex flex-col p-4 min-w-0">
          <div className={cn("flex items-center mb-6", isCollapsed ? 'justify-center' : 'justify-between')}>
            <div className={cn("text-2xl font-semibold text-gray-100", isCollapsed && "hidden")}>
              <RayboxLogo size="md" className="text-gray-100" />
            </div>
          </div>

          <nav className="flex-grow space-y-2">
            <NavLink href="/dashboard" icon={Home} label="Home" isCollapsed={isCollapsed} />
            <NavLink href="/files" icon={Folder} label="Files" isCollapsed={isCollapsed} />
            <NavLink href="/profile" icon={User} label="Profile" isCollapsed={isCollapsed} />
          </nav>

          <div className="flex-shrink-0">
            {isCollapsed ? (
              <div className="flex justify-center items-center p-4">
                <UploadCloud className="w-8 h-8 text-gray-400" />
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </div>

      {/* Collapse/Expand Tab - uses pseudo-elements for corner connectors */}
      <div className="relative flex-shrink-0 self-center z-10">
        <button
          onClick={toggleSidebar}
          className="collapse-tab-left group"
          aria-label="Toggle sidebar"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-200 transition-colors" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-400 group-hover:text-gray-200 transition-colors" />
          )}
        </button>
      </div>

      <style jsx>{`
        .collapse-tab-left {
          --tab-bg: rgb(0 0 0); /* black */
          position: relative;
          width: 20px;
          height: 56px;
          background: var(--tab-bg);
          border: 1px solid rgb(31 41 55); /* gray-800 */
          border-left: none;
          border-top-right-radius: 8px;
          border-bottom-right-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.2s ease, width 0.2s ease;
        }
        
        .collapse-tab-left:hover {
          --tab-bg: rgb(17 24 39); /* gray-900 */
          background: var(--tab-bg);
          width: 24px;
        }
        
        /* Top corner connector - circle at bottom-left creates curve connecting to sidebar */
        .collapse-tab-left::before {
          content: '';
          position: absolute;
          top: -12px;
          left: -1px;
          width: 12px;
          height: 12px;
          background: radial-gradient(circle at 0% 100%, transparent 11px, var(--tab-bg) 11px);
          pointer-events: none;
        }
        
        /* Bottom corner connector - circle at top-left creates curve connecting to sidebar */
        .collapse-tab-left::after {
          content: '';
          position: absolute;
          bottom: -12px;
          left: -1px;
          width: 12px;
          height: 12px;
          background: radial-gradient(circle at 0% 0%, transparent 11px, var(--tab-bg) 11px);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

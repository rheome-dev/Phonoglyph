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
    <div className="relative h-full">
      {/* Main Sidebar */}
      <div
        className={cn(
          "bg-black border-r border-gray-800 transition-all duration-300 ease-in-out h-full",
          isCollapsed ? "w-0 overflow-hidden" : "w-64"
        )}
      >
        <div className="h-full flex flex-col p-4 min-w-0">
          <div className={cn("flex items-center mb-6", isCollapsed ? 'justify-center' : 'justify-between')}>
            <div className={cn("flex items-center gap-3 text-2xl font-semibold text-gray-100", isCollapsed && "hidden")}>
              <img 
                src="/logo/IMG_1255.PNG" 
                alt="Raybox Logo" 
                className="h-8 w-auto object-contain"
              />
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

      {/* Collapse/Expand Tab - absolutely positioned to float over main content */}
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

      <style jsx>{`
        .collapse-tab-left {
          --tab-bg: rgb(0 0 0); /* black */
          position: absolute;
          top: 50%;
          right: -20px;
          transform: translateY(-50%);
          width: 20px;
          height: 80px;
          background: var(--tab-bg);
          border: none;
          border-top-right-radius: 8px;
          border-bottom-right-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.2s ease;
          z-index: 10;
        }
        
        .collapse-tab-left:hover {
          --tab-bg: rgb(24 24 27); /* zinc-900 */
          background: var(--tab-bg);
        }
        
        /* Top corner connector - flipped Y axis */
        .collapse-tab-left::before {
          content: '';
          position: absolute;
          top: -12px;
          left: 0;
          width: 12px;
          height: 12px;
          background: radial-gradient(circle at 100% 0%, transparent 12px, var(--tab-bg) 12px);
          pointer-events: none;
        }
        
        /* Bottom corner connector - flipped Y axis */
        .collapse-tab-left::after {
          content: '';
          position: absolute;
          bottom: -12px;
          left: 0;
          width: 12px;
          height: 12px;
          background: radial-gradient(circle at 100% 100%, transparent 12px, var(--tab-bg) 12px);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

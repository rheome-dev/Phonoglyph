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
    <div className="relative flex">
      {/* Main Sidebar */}
      <div
        className={cn(
          "bg-black border-r border-gray-800 transition-all duration-300 ease-in-out",
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

      {/* Collapse/Expand Tab - sits completely outside the sidebar */}
      <button
        onClick={toggleSidebar}
        className={cn(
          "flex-shrink-0 w-5 h-16 self-center",
          "bg-gray-900/80 hover:bg-gray-800 backdrop-blur-sm",
          "border border-l-0 border-gray-700 rounded-r-md",
          "flex items-center justify-center transition-all duration-200",
          "hover:w-6 group"
        )}
        aria-label="Toggle sidebar"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-200 transition-colors" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-gray-400 group-hover:text-gray-200 transition-colors" />
        )}
      </button>
    </div>
  );
}

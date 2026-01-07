import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { ProfileMenu } from "@/components/auth/profile-menu"
import { EnhancedBreadcrumbNav } from "@/components/layout/breadcrumb-nav"
import { RayboxLogo } from "@/components/ui/phonoglyph-logo"

export interface NavigationProps {
  user: any | null
  currentPath: string
  currentProject?: any
  recentProjects?: any[]
  showBreadcrumbs?: boolean
  variant?: 'light' | 'dark'
}

const Navigation = React.forwardRef<HTMLElement, NavigationProps>(
  ({ user, currentPath, currentProject, recentProjects = [], showBreadcrumbs = true, variant = 'light' }, ref) => {
    const navItems = [
      { href: "/", label: "Home" },
      { href: "/creative-visualizer", label: "Visualizer" },
      { href: "/files", label: "Files" },
      { href: "/dashboard", label: "Dashboard" },
    ]

    const isDark = variant === 'dark' || currentPath === '/'

    return (
      <motion.nav
        ref={ref}
        className={cn(
          "fixed top-0 z-50 w-full",
          isDark
            ? "bg-transparent"
            : "glass-strong border-b border-white/20"
        )}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Blurred bottom edge for dark mode */}
        {isDark && (
          <div
            className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
            style={{
              boxShadow: '0 1px 20px 0 rgba(139, 92, 246, 0.15)'
            }}
          />
        )}
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <motion.div
                className="flex items-center"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <RayboxLogo size="md" className={isDark ? "text-white" : "text-stone-700"} />
              </motion.div>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-sans font-medium transition-colors duration-200",
                    currentPath === item.href
                      ? isDark
                        ? "text-white border-b-2 border-purple-400"
                        : "text-stone-700 border-b-2 border-stone-600"
                      : isDark
                        ? "text-gray-400 hover:text-white"
                        : "text-stone-600 hover:text-stone-700"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Auth Section */}
            <div className="flex items-center space-x-4">
              {user ? (
                <ProfileMenu user={user} />
              ) : (
                <div className="flex items-center space-x-3">
                  <Link href="/login">
                    <button className={cn(
                      "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                      isDark
                        ? "text-gray-300 hover:text-white hover:bg-white/10"
                        : "text-stone-600 hover:text-stone-700 hover:bg-stone-100"
                    )}>
                      Sign In
                    </button>
                  </Link>
                  <Link href="/signup">
                    <button className={cn(
                      "px-4 py-2 text-sm font-medium rounded-lg transition-all",
                      isDark
                        ? "btn-gradient"
                        : "technical-button-primary"
                    )}>
                      Sign Up
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Breadcrumb Navigation */}
          {showBreadcrumbs && !isDark && (
            <div className="border-t border-white/10 px-0 py-2">
              <EnhancedBreadcrumbNav
                currentProject={currentProject}
                recentProjects={recentProjects}
                className="text-xs"
              />
            </div>
          )}
        </div>
      </motion.nav>
    )
  }
)
Navigation.displayName = "Navigation"

export { Navigation }
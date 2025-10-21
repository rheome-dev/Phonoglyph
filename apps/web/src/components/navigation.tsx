import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { TechnicalButton } from "@/components/ui/technical-button"
import { ProfileMenu } from "@/components/auth/profile-menu"
import { EnhancedBreadcrumbNav } from "@/components/layout/breadcrumb-nav"
import { PhonoglyphLogo } from "@/components/ui/phonoglyph-logo"

export interface NavigationProps {
  user: any | null
  currentPath: string
  currentProject?: any
  recentProjects?: any[]
  showBreadcrumbs?: boolean
}

const Navigation = React.forwardRef<HTMLElement, NavigationProps>(
  ({ user, currentPath, currentProject, recentProjects = [], showBreadcrumbs = true }, ref) => {
    const navItems = [
      { href: "/", label: "Home" },
      { href: "/creative-visualizer", label: "Visualizer" },
      { href: "/files", label: "Files" },
      { href: "/dashboard", label: "Dashboard" },
    ]

    return (
      <motion.nav
        ref={ref}
        className="sticky top-0 z-40 w-full glass-strong border-b border-white/20"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <motion.div
                className="flex items-center"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <PhonoglyphLogo size="md" className="text-stone-700" />
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
                      ? "text-stone-700 border-b-2 border-stone-600"
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
                    <TechnicalButton variant="secondary" size="sm">
                      Sign In
                    </TechnicalButton>
                  </Link>
                  <Link href="/signup">
                    <TechnicalButton variant="primary" size="sm">
                      Sign Up
                    </TechnicalButton>
                  </Link>
                </div>
              )}
            </div>
          </div>
          
          {/* Breadcrumb Navigation */}
          {showBreadcrumbs && (
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
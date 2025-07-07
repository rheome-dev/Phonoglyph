"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string
  href: string
  icon?: string
}

interface BreadcrumbNavProps {
  items?: BreadcrumbItem[]
  className?: string
}

export function BreadcrumbNav({ items = [], className }: BreadcrumbNavProps) {
  const router = useRouter()
  const pathname = usePathname()

  // Auto-generate breadcrumbs from path if not provided
  const generatedItems = generateBreadcrumbs(pathname)
  const breadcrumbItems = items.length > 0 ? items : generatedItems

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'b':
          case 'B':
            event.preventDefault()
            router.push('/dashboard')
            break
          case 'h':
          case 'H':
            event.preventDefault()
            router.push('/')
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  if (breadcrumbItems.length <= 1) {
    return null
  }

  return (
    <nav 
      className={cn("flex items-center space-x-2 text-sm font-mono text-stone-600", className)}
      aria-label="Breadcrumb"
    >
      {breadcrumbItems.map((item, index) => (
        <div key={item.href} className="flex items-center">
          {index > 0 && (
            <span className="mx-2 text-stone-400">/</span>
          )}
          {index === breadcrumbItems.length - 1 ? (
            // Current page - not a link
            <span className="flex items-center text-stone-800 font-medium">
              {item.icon && <span className="mr-1">{item.icon}</span>}
              {item.label}
            </span>
          ) : (
            // Previous pages - links
            <Link
              href={item.href}
              className="flex items-center text-stone-600 hover:text-stone-800 transition-colors"
            >
              {item.icon && <span className="mr-1">{item.icon}</span>}
              {item.label}
            </Link>
          )}
        </div>
      ))}
      
      {/* Keyboard shortcuts hint */}
      <div className="ml-6 text-xs text-stone-400 hidden lg:block">
        <span className="mr-3">⌘B Dashboard</span>
        <span>⌘H Home</span>
      </div>
    </nav>
  )
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  const items: BreadcrumbItem[] = [
    { label: 'Home', href: '/', icon: '🏠' }
  ]

  let currentPath = ''
  
  for (let i = 0; i < segments.length; i++) {
    currentPath += `/${segments[i]}`
    const segment = segments[i]
    
    // Generate appropriate labels and icons based on route
    let label = segment
    let icon = ''
    
    switch (segment) {
      case 'dashboard':
        label = 'Dashboard'
        icon = '📊'
        break
      case 'projects':
        if (i === segments.length - 1) {
          label = 'Projects'
          icon = '📁'
        } else {
          // This is a project ID, try to get the actual project name
          const projectId = segments[i + 1]
          label = getProjectName(projectId) || `Project ${projectId.slice(0, 8)}`
          icon = '🎵'
          currentPath += `/${projectId}`
          i++ // Skip the next segment as we've processed it
        }
        break
      case 'settings':
        label = 'Settings'
        icon = '⚙️'
        break
      case 'shared':
        label = 'Shared Project'
        icon = '🔗'
        break
      case 'files':
        label = 'Files'
        icon = '📄'
        break
      case 'upload-demo':
        label = 'Upload Demo'
        icon = '📤'
        break
      case 'creative-visualizer':
        label = 'Visualizer'
        icon = '🎨'
        break
      case 'profile':
        label = 'Profile'
        icon = '👤'
        break
      default:
        // Capitalize first letter
        label = segment.charAt(0).toUpperCase() + segment.slice(1)
        break
    }
    
    items.push({
      label,
      href: currentPath,
      icon
    })
  }
  
  return items
}

// Helper function to get project name (could be enhanced with tRPC query)
function getProjectName(projectId: string): string | null {
  // This would ideally be fetched from your project data
  // For now, return null to use the fallback
  return null
}

// Enhanced breadcrumb component with project quick switcher
interface EnhancedBreadcrumbNavProps extends BreadcrumbNavProps {
  currentProject?: any
  recentProjects?: any[]
  onProjectSwitch?: (projectId: string) => void
}

export function EnhancedBreadcrumbNav({ 
  currentProject, 
  recentProjects = [], 
  onProjectSwitch,
  ...props 
}: EnhancedBreadcrumbNavProps) {
  const router = useRouter()

  const handleProjectSwitch = (projectId: string) => {
    if (onProjectSwitch) {
      onProjectSwitch(projectId)
    } else {
      router.push(`/projects/${projectId}`)
    }
  }

  return (
    <div className="flex items-center justify-between">
      <BreadcrumbNav {...props} />
      
      {/* Project Quick Switcher */}
      {currentProject && recentProjects.length > 0 && (
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-stone-500">Quick Switch:</span>
          <select
            value={currentProject.id}
            onChange={(e) => handleProjectSwitch(e.target.value)}
            className="text-xs border border-stone-300 rounded px-2 py-1 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value={currentProject.id}>{currentProject.name}</option>
            {recentProjects
              .filter(p => p.id !== currentProject.id)
              .slice(0, 5)
              .map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))
            }
          </select>
        </div>
      )}
    </div>
  )
} 
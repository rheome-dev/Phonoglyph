"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { TechnicalButton } from "@/components/ui/technical-button"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ProjectCreationModal } from "./project-creation-modal"
import { trpc } from "@/lib/trpc"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { Trash2 } from 'lucide-react'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'

export interface ProjectDashboardProps {
  user: any
}

const ProjectDashboard = React.forwardRef<HTMLDivElement, ProjectDashboardProps>(
  ({ user }, ref) => {
    const [isCreationModalOpen, setIsCreationModalOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")
    const { toast } = useToast()
    const router = useRouter()
    const [deleteProjectId, setDeleteProjectId] = React.useState<string | null>(null)
    const [isDeleting, setIsDeleting] = React.useState(false)

    // Fetch projects
    const { data: projects = [], isLoading, refetch } = trpc.project.list.useQuery()

    // Search projects - only when there's actually a search query or genre filter
    const hasSearchCriteria = !!(searchQuery?.trim())
    const { data: searchResults, isLoading: isSearching } = trpc.project.search.useQuery(
      {
        query: searchQuery?.trim() || '',
        sort_by: 'updated_at',
        sort_order: 'desc'
      },
      {
        enabled: hasSearchCriteria,
      }
    )

    const displayProjects = hasSearchCriteria ? searchResults || [] : projects

    // Debug logging
    console.log('🔍 ProjectDashboard State:', {
      searchQuery: `"${searchQuery}"`,
      hasSearchCriteria,
      isLoading,
      isSearching,
      projectsLength: projects?.length,
      searchResultsLength: searchResults?.length,
      displayProjectsLength: displayProjects?.length
    })

    const handleProjectClick = (projectId: string) => {
      router.push(`/creative-visualizer?projectId=${projectId}`)
    }

    const openCreationModal = () => {
      setIsCreationModalOpen(true)
    }

    const deleteProjectMutation = trpc.project.delete.useMutation({
      onSuccess: () => {
        toast({ title: 'Project deleted', description: 'The project was deleted.' })
        setDeleteProjectId(null)
        refetch()
      },
      onError: (error) => {
        toast({ title: 'Delete failed', description: error.message, variant: 'destructive' })
        setDeleteProjectId(null)
      },
      onSettled: () => setIsDeleting(false)
    })

    const handleDeleteProject = (projectId: string) => {
      setIsDeleting(true)
      deleteProjectMutation.mutate({ id: projectId })
    }

    return (
      <div ref={ref} className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100">
        <div className="container mx-auto px-4 lg:px-8 py-8">
          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h1 className="text-3xl lg:text-4xl font-display font-bold text-stone-800">
                  PROJECTS
                </h1>
                <p className="text-lg font-mono text-stone-600">
                  Welcome back, {user?.user_metadata?.name || user?.email}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <StatusIndicator status="live">
                  SYSTEM ONLINE
                </StatusIndicator>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <TechnicalButton 
                    variant="primary" 
                    size="lg"
                    onClick={openCreationModal}
                  >
                    + Create New Project
                  </TechnicalButton>
                </motion.div>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <motion.aside
              className="lg:col-span-1 space-y-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {/* Search & Filter Panel */}
              <GlassCard variant="panel" className="p-6">
                <h3 className="text-lg font-display font-bold text-stone-700 mb-4">
                  SEARCH & FILTER
                </h3>
                
                {/* Search Input */}
                <div className="mb-4">
                  <label className="block text-sm font-mono text-stone-600 mb-2">
                    SEARCH PROJECTS
                  </label>
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-md text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Clear Filters */}
                {searchQuery && (
                  <TechnicalButton
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSearchQuery("")
                    }}
                  >
                    Clear Filters
                  </TechnicalButton>
                )}
              </GlassCard>

              {/* Project Stats Panel */}
              <GlassCard variant="panel" className="p-6">
                <h3 className="text-lg font-display font-bold text-stone-700 mb-4">
                  STATS
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-mono text-stone-600">TOTAL PROJECTS</span>
                    <span className="text-sm font-mono font-bold text-stone-700">{projects.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-mono text-stone-600">ACTIVE</span>
                    <span className="text-sm font-mono font-bold text-green-600">{projects.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-mono text-stone-600">LAST UPDATED</span>
                    <span className="text-xs font-mono text-stone-500">
                      {projects[0]?.updated_at ? new Date(projects[0].updated_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </GlassCard>
            </motion.aside>

            {/* Main Content */}
            <motion.main
              className="lg:col-span-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <GlassCard className="p-8 min-h-[600px]">
                {(isLoading || (hasSearchCriteria && isSearching)) ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <LoadingSpinner size="lg" className="mb-4" />
                    <p className="text-lg font-mono text-stone-600">
                      {hasSearchCriteria && isSearching ? 'SEARCHING PROJECTS...' : 'LOADING PROJECTS...'}
                    </p>
                  </div>
                ) : displayProjects.length > 0 ? (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-display font-bold text-stone-700">
                        {searchQuery ? 'Search Results' : 'Your Projects'}
                      </h2>
                      <StatusIndicator status="completed">
                        {displayProjects.length} PROJECT{displayProjects.length !== 1 ? 'S' : ''}
                      </StatusIndicator>
                    </div>
                    
                    {/* Project Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {displayProjects.map((project: any, index: number) => (
                        <motion.div
                          key={project.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.1 }}
                          whileHover={{ y: -4 }}
                          className="cursor-pointer"
                          onClick={() => handleProjectClick(project.id)}
                        >
                          <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 relative group">
                            {/* Project Thumbnail */}
                            <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-4 flex items-center justify-center">
                              {project.thumbnail_url ? (
                                <img 
                                  src={project.thumbnail_url} 
                                  alt={project.name}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <div className="text-4xl">🎵</div>
                              )}
                            </div>

                            {/* Project Info */}
                            <div className="space-y-2 pb-8">
                              <h3 className="font-display font-bold text-stone-800 truncate">
                                {project.name}
                              </h3>
                              {project.description && (
                                <p className="text-sm text-stone-600 line-clamp-2">
                                  {project.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between text-xs font-mono text-stone-500 mb-1">
                                <span>{new Date(project.updated_at).toLocaleDateString()}</span>
                                <span>{project.file_count || 0} files</span>
                              </div>
                              <span className={cn(
                                "px-2 py-1 rounded text-xs font-mono uppercase",
                                project.privacy_setting === 'private' && "bg-red-100 text-red-700",
                                project.privacy_setting === 'unlisted' && "bg-yellow-100 text-yellow-700",
                                project.privacy_setting === 'public' && "bg-green-100 text-green-700"
                              )}>
                                {project.privacy_setting}
                              </span>
                            </div>

                            {/* Delete Button - bottom right, only on hover */}
                            <button
                              onClick={e => { e.stopPropagation(); setDeleteProjectId(project.id); }}
                              className="absolute bottom-4 right-4 bg-white border border-stone-200 rounded-full p-2 shadow-md text-red-500 hover:text-white hover:bg-red-500 transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none"
                              title="Delete project"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="text-6xl mb-6">🎼</div>
                    <h2 className="text-2xl font-display font-bold text-stone-700 mb-4">
                      {searchQuery ? 'No Matching Projects' : 'No Projects Yet'}
                    </h2>
                    <p className="text-lg font-mono text-stone-600 mb-6 max-w-md">
                      {searchQuery 
                        ? 'Try adjusting your search criteria or create a new project.'
                        : 'Create your first music visualization project to get started.'
                      }
                    </p>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <TechnicalButton 
                        variant="primary" 
                        size="lg"
                        onClick={openCreationModal}
                      >
                        Create First Project
                      </TechnicalButton>
                    </motion.div>
                  </div>
                )}
              </GlassCard>
            </motion.main>
          </div>
        </div>

        {/* Project Creation Modal */}
        <ProjectCreationModal
          isOpen={isCreationModalOpen}
          onClose={() => setIsCreationModalOpen(false)}
        />

        <ConfirmationModal
          isOpen={!!deleteProjectId}
          onClose={() => setDeleteProjectId(null)}
          onConfirm={() => deleteProjectId && handleDeleteProject(deleteProjectId)}
          title="Delete Project?"
          description="Are you sure you want to delete this project and all its files? This action cannot be undone."
          confirmText={isDeleting ? 'Deleting...' : 'Delete'}
          confirmVariant="danger"
        />
      </div>
    )
  }
)

ProjectDashboard.displayName = "ProjectDashboard"

export { ProjectDashboard } 
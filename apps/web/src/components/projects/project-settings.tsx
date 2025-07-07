"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GlassCard } from "@/components/ui/glass-card"
import { TechnicalButton } from "@/components/ui/technical-button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { updateProjectSchema, type UpdateProjectInput } from "@/lib/validations"
import { useToast } from "@/hooks/use-toast"
import { trpc } from "@/lib/trpc"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface ProjectSettingsProps {
  project: any
  onClose?: () => void
}

type TabId = 'general' | 'privacy' | 'sharing' | 'danger'

export function ProjectSettings({ project, onClose }: ProjectSettingsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general')
  const [isLoading, setIsLoading] = useState(false)
  const [shareToken, setShareToken] = useState<string>('')
  const { toast } = useToast()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      name: project.name,
      description: project.description || '',
      privacy_setting: project.privacy_setting,
      thumbnail_url: project.thumbnail_url || '',
    }
  })

  // Update project mutation
  const updateProjectMutation = trpc.project.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Project Updated! ✨",
        description: "Your changes have been saved successfully.",
      })
      setIsLoading(false)
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update project. Please try again.",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  })

  // Share project mutation
  const shareProjectMutation = trpc.project.share.useMutation({
    onSuccess: (share) => {
      setShareToken(share.share_token)
      toast({
        title: "Share Link Created! 🔗",
        description: "Your project share link is ready to use.",
      })
    },
    onError: (error) => {
      toast({
        title: "Share Failed",
        description: error.message || "Failed to create share link.",
        variant: "destructive",
      })
    }
  })

  // Duplicate project mutation
  const duplicateProjectMutation = trpc.project.duplicate.useMutation({
    onSuccess: (newProject) => {
      toast({
        title: "Project Duplicated! 🎵",
        description: `"${newProject.name}" has been created successfully.`,
      })
      router.push(`/projects/${newProject.id}`)
    },
    onError: (error) => {
      toast({
        title: "Duplication Failed",
        description: error.message || "Failed to duplicate project.",
        variant: "destructive",
      })
    }
  })

  // Delete project mutation
  const deleteProjectMutation = trpc.project.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "Project Deleted",
        description: "The project has been permanently removed.",
      })
      router.push('/dashboard')
    },
    onError: (error) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete project.",
        variant: "destructive",
      })
    }
  })

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true)
      await updateProjectMutation.mutateAsync({
        id: project.id,
        ...data,
      } as UpdateProjectInput & { id: string })
    } catch (error) {
      // Error handled in mutation
    }
  }

  const handleCreateShareLink = async () => {
    try {
      await shareProjectMutation.mutateAsync({
        project_id: project.id,
        access_type: 'view',
      })
    } catch (error) {
      // Error handled in mutation
    }
  }

  const handleDuplicate = async () => {
    const newName = prompt('Enter a name for the duplicate project:', `${project.name} (Copy)`)
    if (newName && newName.trim()) {
      try {
        await duplicateProjectMutation.mutateAsync({
          project_id: project.id,
          new_name: newName.trim(),
          copy_files: true,
        })
      } catch (error) {
        // Error handled in mutation
      }
    }
  }

  const handleDelete = async () => {
    const confirmation = prompt(
      `Type "${project.name}" to confirm deletion. This action cannot be undone.`
    )
    if (confirmation === project.name) {
      try {
        await deleteProjectMutation.mutateAsync({ id: project.id })
      } catch (error) {
        // Error handled in mutation
      }
    } else if (confirmation !== null) {
      toast({
        title: "Deletion Cancelled",
        description: "Project name didn't match. Deletion cancelled for safety.",
        variant: "destructive",
      })
    }
  }

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/shared/${shareToken}`
    navigator.clipboard.writeText(shareUrl)
    toast({
      title: "Link Copied! 📋",
      description: "Share link has been copied to your clipboard.",
    })
  }

  const tabs = [
    { id: 'general' as const, label: 'General', icon: '⚙️' },
    { id: 'privacy' as const, label: 'Privacy', icon: '🔒' },
    { id: 'sharing' as const, label: 'Sharing', icon: '🔗' },
    { id: 'danger' as const, label: 'Danger Zone', icon: '⚠️' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold text-stone-800">
                Project Settings
              </h1>
              <p className="text-lg font-mono text-stone-600">
                {project.name}
              </p>
            </div>
            {onClose && (
              <TechnicalButton variant="secondary" onClick={onClose}>
                Back to Project
              </TechnicalButton>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Tab Navigation */}
          <div className="lg:col-span-1">
            <GlassCard variant="panel" className="p-6">
              <h3 className="text-lg font-display font-bold text-stone-700 mb-4">
                Settings
              </h3>
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      activeTab === tab.id
                        ? "bg-blue-100 text-blue-700 border border-blue-200"
                        : "text-stone-600 hover:bg-stone-100"
                    )}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </GlassCard>
          </div>

          {/* Tab Content */}
          <div className="lg:col-span-3">
            <GlassCard className="p-8">
              {activeTab === 'general' && (
                <div>
                  <h2 className="text-2xl font-display font-bold text-stone-700 mb-6">
                    General Settings
                  </h2>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Project Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name">Project Name</Label>
                      <Input
                        id="name"
                        {...register("name")}
                        disabled={isLoading}
                      />
                      {errors.name && (
                        <p className="text-sm text-red-600">{errors.name.message}</p>
                      )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <textarea
                        id="description"
                        {...register("description")}
                        disabled={isLoading}
                        rows={4}
                        className="w-full px-3 py-2 border border-stone-300 rounded-md text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Describe your project..."
                      />
                      {errors.description && (
                        <p className="text-sm text-red-600">{errors.description.message}</p>
                      )}
                    </div>

                    {/* Thumbnail URL */}
                    <div className="space-y-2">
                      <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
                      <Input
                        id="thumbnail_url"
                        type="url"
                        placeholder="https://example.com/thumbnail.jpg"
                        {...register("thumbnail_url")}
                        disabled={isLoading}
                      />
                      {errors.thumbnail_url && (
                        <p className="text-sm text-red-600">{errors.thumbnail_url.message}</p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <TechnicalButton
                        type="submit"
                        variant="primary"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <LoadingSpinner className="mr-2 h-4 w-4" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </TechnicalButton>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div>
                  <h2 className="text-2xl font-display font-bold text-stone-700 mb-6">
                    Privacy Settings
                  </h2>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          id="private"
                          value="private"
                          {...register("privacy_setting")}
                          disabled={isLoading}
                        />
                        <div>
                          <Label htmlFor="private" className="font-medium">
                            Private
                          </Label>
                          <p className="text-sm text-stone-600">
                            Only you can see this project
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          id="unlisted"
                          value="unlisted"
                          {...register("privacy_setting")}
                          disabled={isLoading}
                        />
                        <div>
                          <Label htmlFor="unlisted" className="font-medium">
                            Unlisted
                          </Label>
                          <p className="text-sm text-stone-600">
                            Accessible via direct link only
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          id="public"
                          value="public"
                          {...register("privacy_setting")}
                          disabled={isLoading}
                        />
                        <div>
                          <Label htmlFor="public" className="font-medium">
                            Public
                          </Label>
                          <p className="text-sm text-stone-600">
                            Visible to everyone
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <TechnicalButton
                        type="submit"
                        variant="primary"
                        disabled={isLoading}
                      >
                        Update Privacy
                      </TechnicalButton>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'sharing' && (
                <div>
                  <h2 className="text-2xl font-display font-bold text-stone-700 mb-6">
                    Project Sharing
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-stone-700 mb-2">
                        Share Link
                      </h3>
                      <p className="text-sm text-stone-600 mb-4">
                        Create a shareable link for others to view your project.
                      </p>
                      
                      {shareToken ? (
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <Input
                              value={`${window.location.origin}/shared/${shareToken}`}
                              readOnly
                              className="flex-1"
                            />
                            <TechnicalButton
                              variant="secondary"
                              onClick={copyShareLink}
                            >
                              Copy
                            </TechnicalButton>
                          </div>
                          <p className="text-xs text-stone-500">
                            This link allows view-only access to your project.
                          </p>
                        </div>
                      ) : (
                        <TechnicalButton
                          variant="primary"
                          onClick={handleCreateShareLink}
                          disabled={shareProjectMutation.isLoading}
                        >
                          {shareProjectMutation.isLoading ? (
                            <>
                              <LoadingSpinner className="mr-2 h-4 w-4" />
                              Creating...
                            </>
                          ) : (
                            'Create Share Link'
                          )}
                        </TechnicalButton>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'danger' && (
                <div>
                  <h2 className="text-2xl font-display font-bold text-red-700 mb-6">
                    Danger Zone
                  </h2>
                  <div className="space-y-6">
                    {/* Duplicate Project */}
                    <div className="border border-orange-200 rounded-lg p-6 bg-orange-50">
                      <h3 className="text-lg font-medium text-orange-800 mb-2">
                        Duplicate Project
                      </h3>
                      <p className="text-sm text-orange-700 mb-4">
                        Create a copy of this project with all its settings and files.
                      </p>
                      <TechnicalButton
                        variant="secondary"
                        onClick={handleDuplicate}
                        disabled={duplicateProjectMutation.isLoading}
                      >
                        {duplicateProjectMutation.isLoading ? (
                          <>
                            <LoadingSpinner className="mr-2 h-4 w-4" />
                            Duplicating...
                          </>
                        ) : (
                          'Duplicate Project'
                        )}
                      </TechnicalButton>
                    </div>

                    {/* Delete Project */}
                    <div className="border border-red-200 rounded-lg p-6 bg-red-50">
                      <h3 className="text-lg font-medium text-red-800 mb-2">
                        Delete Project
                      </h3>
                      <p className="text-sm text-red-700 mb-4">
                        Permanently delete this project and all associated files. This action cannot be undone.
                      </p>
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleteProjectMutation.isLoading}
                      >
                        {deleteProjectMutation.isLoading ? (
                          <>
                            <LoadingSpinner className="mr-2 h-4 w-4" />
                            Deleting...
                          </>
                        ) : (
                          'Delete Project'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  )
} 
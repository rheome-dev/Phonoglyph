import * as React from "react"
import { motion } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { TechnicalButton } from "@/components/ui/technical-button"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/lib/utils"

export interface DashboardProps {
  user: any
  files?: any[]
  currentFile?: any
  onFileSelect?: (file: any) => void
  onFileUpload?: (files: FileList) => void
  isLoading?: boolean
}

const Dashboard = React.forwardRef<HTMLDivElement, DashboardProps>(
  ({ user, files = [], currentFile, onFileSelect, onFileUpload, isLoading = false }, ref) => {
    const [isUploading, setIsUploading] = React.useState(false)

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = event.target.files
      if (fileList && onFileUpload) {
        setIsUploading(true)
        try {
          await onFileUpload(fileList)
        } finally {
          setIsUploading(false)
        }
      }
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
                  DASHBOARD
                </h1>
                <p className="text-lg font-mono text-stone-600">
                  Welcome back, {user?.user_metadata?.name || user?.email}
                </p>
              </div>
              <StatusIndicator status="live">
                SYSTEM ONLINE
              </StatusIndicator>
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
              {/* File Library Panel */}
              <GlassCard variant="panel" className="p-6">
                <h3 className="text-lg font-display font-bold text-stone-700 mb-4">
                  FILE LIBRARY
                </h3>
                
                {/* Upload Zone */}
                <div className="mb-4">
                  <label className="upload-zone-compact cursor-pointer">
                    <input
                      type="file"
                      accept=".mid,.midi"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                    {isUploading ? (
                      <div className="flex flex-col items-center">
                        <LoadingSpinner size="sm" className="mb-2" />
                        <span className="text-xs font-mono text-stone-600">UPLOADING...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-2xl mb-2">📁</span>
                        <span className="text-sm font-mono text-stone-600">DROP MIDI FILE</span>
                        <span className="text-xs font-mono text-stone-500">OR CLICK TO BROWSE</span>
                      </div>
                    )}
                  </label>
                </div>

                {/* File List */}
                <div className="space-y-2">
                  {files.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm font-mono text-stone-500">NO FILES UPLOADED</p>
                      <p className="text-xs font-mono text-stone-400 mt-1">Upload your first MIDI file to get started</p>
                    </div>
                  ) : (
                    files.map((file) => (
                      <div
                        key={file.id}
                        className={cn(
                          "file-list-item",
                          currentFile?.id === file.id && "selected"
                        )}
                        onClick={() => onFileSelect?.(file)}
                      >
                        <div className="font-sans font-medium text-stone-700">
                          {file.name}
                        </div>
                        <div className="file-metadata">
                          {file.size} • {file.uploaded_at}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>

              {/* Settings Panel */}
              <GlassCard variant="panel" className="p-6">
                <h3 className="text-lg font-display font-bold text-stone-700 mb-4">
                  SETTINGS
                </h3>
                <div className="space-y-3">
                  <TechnicalButton variant="secondary" size="sm" className="w-full">
                    Account Settings
                  </TechnicalButton>
                  <TechnicalButton variant="secondary" size="sm" className="w-full">
                    Preferences
                  </TechnicalButton>
                  <TechnicalButton variant="secondary" size="sm" className="w-full">
                    Help & Support
                  </TechnicalButton>
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
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <LoadingSpinner size="lg" className="mb-4" />
                    <p className="text-lg font-mono text-stone-600">LOADING VISUALIZATION...</p>
                  </div>
                ) : currentFile ? (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h2 className="text-2xl font-display font-bold text-stone-700">
                          {currentFile.name}
                        </h2>
                        <p className="text-sm font-mono text-stone-500">
                          Currently visualizing
                        </p>
                      </div>
                      <StatusIndicator status="completed">
                        READY
                      </StatusIndicator>
                    </div>
                    
                    {/* Visualization Area */}
                    <div className="bg-stone-500 rounded-xl p-4 shadow-inner">
                      <div className="bg-stone-400 rounded-lg h-96 flex items-center justify-center">
                        <p className="text-stone-600 font-mono">
                          VISUALIZATION CANVAS
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="text-6xl mb-6">🎵</div>
                    <h2 className="text-2xl font-display font-bold text-stone-700 mb-4">
                      NO FILE SELECTED
                    </h2>
                    <p className="text-lg font-mono text-stone-600 mb-6 max-w-md">
                      Select a MIDI file from your library to begin visualization
                    </p>
                    <TechnicalButton variant="primary" size="lg">
                      Upload First File
                    </TechnicalButton>
                  </div>
                )}
              </GlassCard>
            </motion.main>
          </div>
        </div>
      </div>
    )
  }
)
Dashboard.displayName = "Dashboard"

export { Dashboard } 
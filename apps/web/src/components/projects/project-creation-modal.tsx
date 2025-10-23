"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GlassModal } from "@/components/ui/glass-modal"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Badge } from "@/components/ui/badge"
import { createProjectSchema, type CreateProjectInput } from "@/lib/validations"
import { useToast } from "@/hooks/use-toast"
import { useUpload } from "@/hooks/use-upload"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc"
import { 
  Music, 
  FileAudio, 
  FileMusic, 
  Upload, 
  Zap, 
  Clock, 
  DollarSign, 
  Target,
  ArrowRight,
  CheckCircle,
  XCircle,
  Minus
} from "lucide-react"
import { cn } from "@/lib/utils"
import { StatBar } from "@/components/ui/stat-bar"
import React from "react"
import { debugLog } from '@/lib/utils';

interface ProjectCreationModalProps {
  isOpen: boolean
  onClose: () => void
  defaultMidiFilePath?: string
}

type UploadMethod = 'single-audio' | 'stems'

interface UploadOption {
  id: UploadMethod
  title: string
  description: string
  icon: React.ReactNode
  stats: {
    complexity: number
    speed: number
    control: number
  }
  usesCredits: boolean
  color: string
  gradient: string
}

const uploadOptions: UploadOption[] = [
  {
    id: 'single-audio',
    title: 'Single Audio File',
    description: 'AI separates your audio into stems',
    icon: <Music className="h-6 w-6" />,
    stats: {
      complexity: 1,
      speed: 1,
      control: 1,
    },
    usesCredits: true,
    color: 'bg-emerald-600',
    gradient: 'from-emerald-600 to-emerald-700'
  },
  {
    id: 'stems',
    title: 'Stems',
    description: 'Upload pre-separated audio and/or MIDI stems for max control',
    icon: <FileAudio className="h-6 w-6" />,
    stats: {
      complexity: 3,
      speed: 5,
      control: 5,
    },
    usesCredits: false,
    color: 'bg-emerald-600',
    gradient: 'from-emerald-600 to-emerald-700'
  }
]

function StemsUpload({ 
  isLoading, 
  errors, 
  onFilesChange 
}: { 
  isLoading: boolean; 
  errors: any; 
  onFilesChange: (files: File[], masterFileName: string | null, stemTypes: Record<string, string>) => void;
}) {
  const [files, setFiles] = React.useState<File[]>([]);
  const [masterFileName, setMasterFileName] = React.useState<string | null>(null);
  const [stemTypes, setStemTypes] = React.useState<Record<string, string>>({});
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = React.useState(false);

  const stemTypeOptions = [
    { value: 'drums', label: 'Drums' },
    { value: 'bass', label: 'Bass' },
    { value: 'vocals', label: 'Vocals' },
    { value: 'melody', label: 'Melody' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(newFiles);
      // Auto-select master if only one file
      if (newFiles.length === 1) setMasterFileName(newFiles[0].name);
      // Reset stem types for new files
      const newStemTypes: Record<string, string> = {};
      newFiles.forEach(f => {
        // Try to guess stem type from file name
        const lower = f.name.toLowerCase();
        if (lower.includes('drum')) newStemTypes[f.name] = 'drums';
        else if (lower.includes('bass')) newStemTypes[f.name] = 'bass';
        else if (lower.includes('vocal')) newStemTypes[f.name] = 'vocals';
        else newStemTypes[f.name] = 'melody';
      });
      setStemTypes(newStemTypes);
      onFilesChange(newFiles, masterFileName, newStemTypes);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles(newFiles);
      // Auto-select master if only one file
      if (newFiles.length === 1) setMasterFileName(newFiles[0].name);
      // Reset stem types for new files
      const newStemTypes: Record<string, string> = {};
      newFiles.forEach(f => {
        const lower = f.name.toLowerCase();
        if (lower.includes('drum')) newStemTypes[f.name] = 'drums';
        else if (lower.includes('bass')) newStemTypes[f.name] = 'bass';
        else if (lower.includes('vocal')) newStemTypes[f.name] = 'vocals';
        else newStemTypes[f.name] = 'melody';
      });
      setStemTypes(newStemTypes);
      onFilesChange(newFiles, masterFileName, newStemTypes);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  // When masterFileName or stemTypes change, notify parent
  React.useEffect(() => {
    onFilesChange(files, masterFileName, stemTypes);
  }, [files, masterFileName, stemTypes]);

  const handleStemTypeChange = (fileName: string, type: string) => {
    setStemTypes(prev => ({ ...prev, [fileName]: type }));
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="stems-files" className="text-stone-200 font-medium">
        Stems (Audio and/or MIDI)
      </Label>
      <div
        className={cn(
          "flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer bg-stone-800",
          isDragActive ? "border-emerald-400 bg-stone-700/80" : "border-stone-600 hover:border-emerald-400 hover:bg-stone-700/60"
        )}
        onClick={handleBrowseClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        tabIndex={0}
        role="button"
        aria-label="File upload dropzone"
      >
        <div className="text-stone-300 text-sm mb-2 select-none">
          Drag and drop files here, or
        </div>
        <button
          type="button"
          className="px-4 py-2 bg-emerald-400 text-stone-900 font-bold rounded shadow hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          onClick={e => { e.stopPropagation(); handleBrowseClick(); }}
          disabled={isLoading}
        >
          Browse
        </button>
        <input
          id="stems-files"
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mid,.midi"
          multiple
          disabled={isLoading}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      <ul className="mt-2 space-y-1">
        {files.map((file) => (
          <li key={file.name} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="master-file"
              checked={masterFileName === file.name}
              onChange={() => setMasterFileName(file.name)}
              className="accent-emerald-500"
              disabled={isLoading}
            />
            <span className={masterFileName === file.name ? 'font-bold text-emerald-400' : ''}>
              {file.type.startsWith('audio/') ? '🎵' : (file.name.endsWith('.mid') || file.name.endsWith('.midi')) ? '🎹' : '📄'}
              {file.name}
              {masterFileName === file.name && <span className="ml-2 px-2 py-0.5 bg-emerald-600 text-xs rounded text-white">MASTER</span>}
            </span>
            {masterFileName !== file.name && (
              <>
                <select
                  value={stemTypes[file.name] || 'melody'}
                  onChange={e => handleStemTypeChange(file.name, e.target.value)}
                  className="ml-2 px-2 py-1 rounded border border-stone-600 bg-stone-900 text-stone-200 text-xs focus:outline-none focus:ring-emerald-400"
                  disabled={isLoading}
                >
                  {stemTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <span className="ml-1 text-xs text-stone-400">{stemTypes[file.name] ? stemTypeOptions.find(o => o.value === stemTypes[file.name])?.label : 'Melody'}</span>
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-stone-400">You can upload audio stems, MIDI stems, or both.</p>
      <p className="text-xs text-stone-400">
        <span className="font-bold text-emerald-400">Step 1:</span> Select the master track with the radio button. <br/>
        <span className="font-bold text-emerald-400">Step 2:</span> Categorize all other files as stems.
      </p>
      {errors && errors["stems-files"] && (
        <p className="text-sm text-red-600">{errors["stems-files"].message}</p>
      )}
      {!masterFileName && files.length > 0 && (
        <p className="text-sm text-red-500">Please select a master track.</p>
      )}
      {Object.values(stemTypes).filter(Boolean).length !== files.length && files.length > 0 && (
        <p className="text-sm text-red-500">Please tag each file with a stem type.</p>
      )}
    </div>
  );
}

function SingleAudioUpload({ isLoading, onFileChange }: { isLoading: boolean; onFileChange: (file: File | null) => void }) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      onFileChange(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      onFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="audio-file" className="text-stone-200 font-medium">
        Audio File
      </Label>
      <div
        className={cn(
          "flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer bg-stone-800",
          isDragActive ? "border-emerald-400 bg-stone-700/80" : "border-stone-600 hover:border-emerald-400 hover:bg-stone-700/60"
        )}
        onClick={handleBrowseClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        tabIndex={0}
        role="button"
        aria-label="File upload dropzone"
      >
        <div className="text-stone-300 text-sm mb-2 select-none">
          Drag and drop your audio file here, or
        </div>
        <button
          type="button"
          className="px-4 py-2 bg-emerald-400 text-stone-900 font-bold rounded shadow hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          onClick={e => { e.stopPropagation(); handleBrowseClick(); }}
          disabled={isLoading}
        >
          Browse
        </button>
        <input
          id="audio-file"
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          disabled={isLoading}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      {selectedFile && (
        <div className="mt-2 text-sm text-stone-200 flex items-center gap-2">
          🎵 {selectedFile.name}
        </div>
      )}
      <p className="text-xs text-stone-400">This will use credits. Only one audio file allowed.</p>
    </div>
  );
}

export function ProjectCreationModal({ isOpen, onClose, defaultMidiFilePath }: ProjectCreationModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<UploadMethod | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [masterFileName, setMasterFileName] = useState<string | null>(null)
  const [stemTypes, setStemTypes] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const router = useRouter()
  const { addAndUploadFiles } = useUpload()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      privacy_setting: 'private' as const,
      midi_file_path: defaultMidiFilePath || '',
    }
  })

  const createProjectMutation = trpc.project.create.useMutation({
    onSuccess: (project) => {
      toast({
        title: "Project Created! 🎵",
        description: `"${project.name}" is ready for your creative vision.`,
      })
      reset()
      onClose()
      // Navigate to creative visualizer with the new project loaded
      router.push(`/creative-visualizer?projectId=${project.id}`)
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create project. Please try again.",
        variant: "destructive",
      })
    },
    onSettled: () => {
      setIsLoading(false)
    }
  })

  const uploadFileMutation = trpc.file.uploadFile.useMutation({
    onSuccess: (result) => {
      debugLog.log('File uploaded successfully:', result.fileId)
    },
    onError: (error) => {
      debugLog.error('Upload error:', error)
      throw error
    }
  })

  // Get tRPC utils for query invalidation
  const utils = trpc.useUtils()

  const onSubmit = async (data: any) => {
    if (selectedMethod === 'stems' && (!masterFileName || selectedFiles.length < 2 || Object.values(stemTypes).filter(Boolean).length !== selectedFiles.length)) {
      toast({
        title: "Missing Tags",
        description: "You must select a master track, upload at least two files, and tag each file with a stem type.",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsLoading(true)
      debugLog.log('Form submission data:', data)
      
      // Use the actual form data
      const projectData = {
        name: data.name,
        description: data.description || '',
        privacy_setting: data.privacy_setting || 'private',
        render_configuration: data.render_configuration || {}
      };
      
      // Debug: Log the exact payload being sent
      debugLog.log('=== DEBUG PROJECT CREATION ===');
      debugLog.log('projectData to send:', JSON.stringify(projectData, null, 2));
      debugLog.log('projectData.name:', projectData.name);
      debugLog.log('projectData.name type:', typeof projectData.name);
      debugLog.log('=== END DEBUG ===');
      
      const project = await createProjectMutation.mutateAsync(projectData as CreateProjectInput)
      debugLog.log('Project created:', project.id)
      
      // Upload files if stems method is selected
      if (selectedMethod === 'stems' && selectedFiles.length > 0) {
        // Upload files using tRPC mutation with project ID
        const uploadPromises = selectedFiles.map(async (file) => {
          // Convert file to base64
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              const result = reader.result as string
              // Remove the data URL prefix
              const base64 = result.split(',')[1]
              resolve(base64)
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
          
          // Determine file type
          const extension = file.name.toLowerCase().split('.').pop()
          let fileType: 'midi' | 'audio' | 'video' | 'image'
          
          if (['mid', 'midi'].includes(extension || '')) {
            fileType = 'midi'
          } else if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(extension || '')) {
            fileType = 'audio'
          } else if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension || '')) {
            fileType = 'video'
          } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension || '')) {
            fileType = 'image'
          } else {
            throw new Error(`Unsupported file type: ${extension}`)
          }
          
          return uploadFileMutation.mutateAsync({
            fileName: file.name,
            fileType,
            mimeType: file.type || 'application/octet-stream',
            fileSize: file.size,
            fileData: base64Data,
            projectId: project.id, // Pass the project ID
            isMaster: file.name === masterFileName, // Tag master file
            stemType: file.name === masterFileName ? 'master' : (stemTypes[file.name] || 'melody') // Master files get 'master' type, others get their assigned type
          })
        })

        try {
          const uploadResults = await Promise.all(uploadPromises)
          const fileIds = uploadResults.map(result => result.fileId)
          
          // Invalidate file queries to refresh the sidebar
          utils.file.getUserFiles.invalidate()
          
        } catch (uploadError) {
          debugLog.error('Upload error:', uploadError)
          toast({
            title: "Upload Failed",
            description: "Some files failed to upload. Please try again.",
            variant: "destructive",
          })
          return
        }
      }
      
    } catch (error) {
      debugLog.error('Form submission error:', error)
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload files or create project.",
        variant: "destructive",
      })
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      reset()
      setSelectedMethod(null)
      setShowProjectForm(false)
      onClose()
    }
  }

  const handleMethodSelect = (method: UploadMethod) => {
    setSelectedMethod(method)
    setShowProjectForm(true)
  }

  const getStatIcon = (stat: string) => {
    switch (stat) {
      case 'Easy':
      case 'Fast':
      case 'Free':
      case 'Maximum':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'Medium':
        return <Minus className="h-4 w-4 text-yellow-500" />
      case 'Hard':
      case 'Slow':
      case 'Credits':
      case 'Basic':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatColor = (stat: string) => {
    switch (stat) {
      case 'Easy':
      case 'Fast':
      case 'Free':
      case 'Maximum':
        return 'text-green-600'
      case 'Medium':
        return 'text-yellow-600'
      case 'Hard':
      case 'Slow':
      case 'Credits':
      case 'Basic':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  if (showProjectForm) {
    return (
      <GlassModal isOpen={isOpen} onClose={handleClose} sizeClassName="max-w-2xl min-h-[600px]">
        <div className="w-full h-full bg-stone-900 text-stone-200 font-mono border border-stone-700 rounded-xl max-h-[90vh] overflow-y-auto p-4 min-w-[340px]">
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => {
                    setShowProjectForm(false)
                    setSelectedMethod(null)
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ArrowRight className="h-5 w-5 rotate-180" />
                </button>
                <h2 className="text-2xl font-bold mb-2 text-stone-100">Project Details</h2>
              </div>
              <p className="text-gray-600">
                Configure your {selectedMethod === 'single-audio' ? 'audio' : 'stems'} visualization project.
              </p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Validation Error Summary */}
              {Object.keys(errors).length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600 font-medium">Please fix the following errors:</p>
                  <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                    {Object.entries(errors).map(([field, error]) => (
                      <li key={field}>{error?.message?.toString() || 'Validation error'}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Project Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-stone-200 font-medium">
                  Project Name *
                </Label>
                <Input
                  id="name"
                  placeholder="My Amazing Song"
                  {...register("name")}
                  disabled={isLoading}
                  className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-stone-200 font-medium">
                  Description
                </Label>
                <textarea
                  id="description"
                  placeholder="Describe your project, inspiration, or creative vision..."
                  {...register("description")}
                  disabled={isLoading}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              {/* Privacy Setting */}
              <div className="space-y-3">
                <Label className="text-stone-200 font-medium">Privacy Setting</Label>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      id="private"
                      value="private"
                      {...register("privacy_setting")}
                      disabled={isLoading}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
                    />
                    <div className="flex flex-col">
                      <Label htmlFor="private" className="text-stone-200 font-medium cursor-pointer">
                        Private
                      </Label>
                      <span className="text-sm text-gray-600">Only you can see this project</span>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      id="unlisted"
                      value="unlisted"
                      {...register("privacy_setting")}
                      disabled={isLoading}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
                    />
                    <div className="flex flex-col">
                      <Label htmlFor="unlisted" className="text-stone-200 font-medium cursor-pointer">
                        Unlisted
                      </Label>
                      <span className="text-sm text-gray-600">Accessible via direct link only</span>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <input
                      type="radio"
                      id="public"
                      value="public"
                      {...register("privacy_setting")}
                      disabled={isLoading}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
                    />
                    <div className="flex flex-col">
                      <Label htmlFor="public" className="text-stone-200 font-medium cursor-pointer">
                        Public
                      </Label>
                      <span className="text-sm text-gray-600">Visible to everyone in the community</span>
                    </div>
                  </div>
                </div>
                {errors.privacy_setting && (
                  <p className="text-sm text-red-600">{errors.privacy_setting.message}</p>
                )}
              </div>

              {/* Context-specific upload */}
              {selectedMethod === 'single-audio' && (
                <SingleAudioUpload isLoading={isLoading} onFileChange={() => {}} />
              )}
                              {selectedMethod === 'stems' && (
                <StemsUpload 
                  isLoading={isLoading} 
                  errors={errors} 
                  onFilesChange={(files, master, types) => {
                    setSelectedFiles(files);
                    setMasterFileName(master);
                    setStemTypes(types);
                  }} 
                />
              )}

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-none"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      Creating...
                    </div>
                  ) : (
                    "Create Project"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </GlassModal>
    )
  }

  return (
    <GlassModal isOpen={isOpen} onClose={handleClose} sizeClassName="max-w-md min-h-[300px]">
      <div className="w-full h-full bg-stone-900 text-stone-200 font-mono border border-stone-700 rounded-xl max-h-[90vh] overflow-y-auto p-4 min-w-[340px]">
        <div className="mb-2">
          <h2 className="text-xl font-bold text-stone-200 mb-1 tracking-widest uppercase">Choose Upload Method</h2>
          <p className="text-stone-400 text-xs mb-2">Select how you want to create your music visualization project.</p>
        </div>
        <div className="flex flex-col gap-3">
          {uploadOptions.map((option) => (
            <div
              key={option.id}
              className={cn(
                "flex items-center gap-4 p-3 rounded-lg border border-stone-700 bg-stone-800 cursor-pointer transition-all duration-150",
                "hover:bg-stone-700",
              )}
              onClick={() => handleMethodSelect(option.id)}
            >
              <div className={cn("flex-shrink-0 p-2 rounded-lg border border-stone-700", option.color)}>
                {option.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-stone-200 uppercase tracking-widest mb-1">{option.title}</h3>
                <p className="text-xs text-stone-400 mb-2 truncate">{option.description}</p>
                <div className="space-y-1">
                  <StatBar label="Complexity" value={option.stats.complexity} max={5} color="bg-emerald-400" />
                  <StatBar label="Speed" value={option.stats.speed} max={5} color="bg-emerald-400" />
                  <StatBar label="Control" value={option.stats.control} max={5} color="bg-emerald-400" />
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {option.usesCredits && (
                  <Badge variant="secondary" className="bg-emerald-900/80 text-emerald-200 border border-emerald-700 font-mono text-[10px] px-2 py-1 uppercase tracking-widest">Uses Credits</Badge>
                )}
                <Button
                  size="sm"
                  className="bg-emerald-400 text-stone-900 border border-emerald-400 font-mono text-xs px-3 py-1 rounded-md shadow-none hover:bg-emerald-300 hover:text-stone-900"
                >
                  Select
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="pt-3 flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="bg-stone-900 border border-stone-700 text-stone-200 font-mono text-xs px-4 py-1 rounded-md hover:bg-stone-800 hover:text-stone-200"
          >
            Cancel
          </Button>
        </div>
      </div>
    </GlassModal>
  )
} 
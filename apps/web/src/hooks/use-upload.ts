import { useState, useCallback } from 'react'
import { useToast } from './use-toast'
import { trpc } from '@/lib/trpc'
import { debugLog } from '@/lib/utils';

export interface UploadFile {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'completed' | 'failed'
  progress: number
  error?: string
  fileId?: string
  compressedSize?: number
}

export interface UseUploadOptions {
  onUploadComplete?: (file: UploadFile) => void
  onUploadError?: (file: UploadFile, error: string) => void
  onAllUploadsComplete?: () => void
  maxConcurrentUploads?: number
  projectId?: string // NEW: Associate uploads with project
}

export function useUpload(options: UseUploadOptions = {}) {
  const { onUploadComplete, onUploadError, onAllUploadsComplete, maxConcurrentUploads = 3, projectId } = options
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  /**
   * tRPC mutations – we create them once at hook initialisation so that they can
   * be reused inside callbacks without violating the Rules of Hooks.
   */
  const getUploadUrlMutation = trpc.file.getUploadUrl.useMutation()
  const confirmUploadMutation = trpc.file.confirmUpload.useMutation()
  const uploadFileMutation = trpc.file.uploadFile.useMutation()

  // Generate unique ID for each file
  const generateFileId = useCallback(() => {
    return `upload_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }, [])

  // Validate files - EXTENDED for video and image
  const validateFiles = useCallback((newFiles: File[]) => {
    const validFiles: File[] = []
    const errors: string[] = []

    newFiles.forEach(file => {
      // Check file extension
      const extension = file.name.toLowerCase().split('.').pop()
      const allowedExtensions = ['mid', 'midi', 'mp3', 'wav', 'mp4', 'mov', 'webm', 'jpg', 'jpeg', 'png', 'gif', 'webp'] // EXTENDED
      
      if (!extension || !allowedExtensions.includes(extension)) {
        errors.push(`${file.name}: Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`)
        return
      }

      // Check file size based on type
      let maxSize: number
      const isMidi = ['mid', 'midi'].includes(extension)
      const isAudio = ['mp3', 'wav'].includes(extension)
      const isVideo = ['mp4', 'mov', 'webm'].includes(extension)
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)
      
      if (isMidi) {
        maxSize = 5 * 1024 * 1024 // 5MB for MIDI
      } else if (isAudio) {
        maxSize = 50 * 1024 * 1024 // 50MB for audio
      } else if (isVideo) {
        maxSize = 500 * 1024 * 1024 // 500MB for video
      } else if (isImage) {
        maxSize = 25 * 1024 * 1024 // 25MB for images
      } else {
        errors.push(`${file.name}: Unsupported file type`)
        return
      }
      
      if (file.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024)
        errors.push(`${file.name}: File too large. Maximum size: ${maxSizeMB}MB`)
        return
      }

      validFiles.push(file)
    })

    if (errors.length > 0) {
      toast({
        title: 'Invalid Files',
        description: errors.join('\n'),
        variant: 'destructive',
      })
    }

    return validFiles
  }, [toast])

  // Add files to upload queue
  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles = validateFiles(newFiles)
    const uploadFiles: UploadFile[] = validFiles.map(file => ({
      file,
      id: generateFileId(),
      status: 'pending',
      progress: 0,
    }))

    setFiles(prev => [...prev, ...uploadFiles])
    return uploadFiles
  }, [generateFileId, validateFiles])

  // Remove file from queue
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }, [])

  // Clear all files
  const clearFiles = useCallback(() => {
    setFiles([])
  }, [])

  // Update file status
  const updateFileStatus = useCallback((
    fileId: string, 
    updates: Partial<Pick<UploadFile, 'status' | 'progress' | 'error' | 'fileId' | 'compressedSize'>>
  ) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, ...updates } : f
    ))
  }, [])

  // Add compression utility
  const compressFile = async (file: File): Promise<File> => {
    // For now, just return the original file
    // In production, this would implement actual compression
    // using libraries like browser-image-compression for images/videos
    // or custom logic for MIDI files
    return file
  }

  // Add resumable upload simulation
  const createResumableUpload = (file: File) => {
    const chunkSize = 1024 * 1024 // 1MB chunks
    const totalChunks = Math.ceil(file.size / chunkSize)
    
    return {
      totalChunks,
      chunkSize,
      uploadChunk: (chunkIndex: number) => {
        const start = chunkIndex * chunkSize
        const end = Math.min(start + chunkSize, file.size)
        return file.slice(start, end)
      }
    }
  }

  /**
   * Core upload routine – uploads file directly through backend to avoid CORS issues
   * EXTENDED for video and image support
   */
  const uploadFileToS3 = useCallback(async (uploadFile: UploadFile) => {
    try {
      updateFileStatus(uploadFile.id, { status: 'uploading', progress: 10 })

      /* ------------------------------------------------------------------ */
      /* 1. Convert file to base64 and upload through backend               */
      /* ------------------------------------------------------------------ */
      const fileReader = new FileReader()
      
      await new Promise<void>((resolve, reject) => {
        fileReader.onload = async () => {
          try {
            const base64Data = (fileReader.result as string).split(',')[1] // Remove data URL prefix
            
            updateFileStatus(uploadFile.id, { progress: 30 })
            
            // Determine file type - EXTENDED
            const extension = uploadFile.file.name.toLowerCase().split('.').pop()
            let fileType: 'midi' | 'audio' | 'video' | 'image'
            
            if (['mid', 'midi'].includes(extension || '')) {
              fileType = 'midi'
            } else if (['mp3', 'wav'].includes(extension || '')) {
              fileType = 'audio'
            } else if (['mp4', 'mov', 'webm'].includes(extension || '')) {
              fileType = 'video'
            } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
              fileType = 'image'
            } else {
              throw new Error('Unsupported file type')
            }
            
            const result = await uploadFileMutation.mutateAsync({
              fileName: uploadFile.file.name,
              fileType,
              mimeType: uploadFile.file.type || 'application/octet-stream',
              fileSize: uploadFile.file.size,
              fileData: base64Data,
              projectId: projectId, // NEW: Associate with project
            })
            
            updateFileStatus(uploadFile.id, { 
              status: 'completed', 
              progress: 100,
              fileId: result.fileId 
            })
            
            // After successful upload and updateFileStatus, call onUploadComplete with fileId
            onUploadComplete?.({ ...uploadFile, fileId: result.fileId, status: 'completed', progress: 100 });
            
            resolve()
          } catch (error) {
            reject(error)
          }
        }
        
        fileReader.onerror = () => {
          reject(new Error('Failed to read file'))
        }
        
        fileReader.readAsDataURL(uploadFile.file)
      })

      /* ------------------------------------------------------------------ */
      /* 2. Mark local state as completed                                   */
      /* ------------------------------------------------------------------ */
      updateFileStatus(uploadFile.id, { status: 'completed', progress: 100 })

      /* ------------------------------------------------------------------ */
      /* 3. Notify caller of completion                                     */
      /* ------------------------------------------------------------------ */
      onAllUploadsComplete?.()

    } catch (error) {
      debugLog.error('Upload error:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      updateFileStatus(uploadFile.id, { 
        status: 'failed', 
        error: errorMessage 
      })
      
      onUploadError?.(uploadFile, errorMessage)
    }
  }, [updateFileStatus, uploadFileMutation, onUploadComplete, onUploadError, onAllUploadsComplete])

  // Add files and immediately start uploading them (bypasses state timing issues)
  const addAndUploadFiles = useCallback(async (newFiles: File[]) => {
    // Validate files first
    const validFiles = validateFiles(newFiles)
    if (validFiles.length === 0) return []

    // Create upload file objects
    const uploadFiles: UploadFile[] = validFiles.map(file => ({
      file,
      id: generateFileId(),
      status: 'pending',
      progress: 0,
    }))

    // Add to state for UI display
    setFiles(prev => [...prev, ...uploadFiles])
    
    // Start uploading immediately without waiting for state update
    if (uploadFiles.length > 0) {
      setIsUploading(true)
      
      try {
        // Process uploads in batches
        const batches = []
        for (let i = 0; i < uploadFiles.length; i += maxConcurrentUploads) {
          batches.push(uploadFiles.slice(i, i + maxConcurrentUploads))
        }

        for (const batch of batches) {
          await Promise.allSettled(
            batch.map(file => uploadFileToS3(file))
          )
        }

        onAllUploadsComplete?.()
        
        const successCount = uploadFiles.filter(f => f.status === 'completed').length
        if (successCount > 0) {
          toast({
            title: 'Upload Complete',
            description: `Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}`,
          })
        }

      } catch (error) {
        debugLog.error('Upload error:', error)
        toast({
          title: 'Upload Error',
          description: 'Upload failed',
          variant: 'destructive',
        })
      } finally {
        setIsUploading(false)
      }
    }
    
    return uploadFiles
  }, [validateFiles, generateFileId, maxConcurrentUploads, uploadFileToS3, onAllUploadsComplete, toast])

  // Start uploading all pending files
  const startUpload = useCallback(async () => {
    const pendingFiles = files.filter(f => f.status === 'pending')
    if (pendingFiles.length === 0) return

    setIsUploading(true)

    try {
      // Process uploads in batches
      const batches = []
      for (let i = 0; i < pendingFiles.length; i += maxConcurrentUploads) {
        batches.push(pendingFiles.slice(i, i + maxConcurrentUploads))
      }

      for (const batch of batches) {
        await Promise.allSettled(
          batch.map(file => uploadFileToS3(file))
        )
      }

      onAllUploadsComplete?.()
      
      const successCount = files.filter(f => f.status === 'completed').length
      if (successCount > 0) {
        toast({
          title: 'Upload Complete',
          description: `Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}`,
        })
      }

    } catch (error) {
      debugLog.error('Upload error:', error)
      toast({
        title: 'Upload Error',
        description: 'Upload failed',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }, [files, maxConcurrentUploads, uploadFileToS3, onAllUploadsComplete, toast])

  // Retry failed upload
  const retryUpload = useCallback(async (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (!file || file.status !== 'failed') return

    updateFileStatus(fileId, { status: 'pending', progress: 0, error: undefined })
    await uploadFileToS3(file)
  }, [files, updateFileStatus, uploadFileToS3])

  return {
    // State
    files,
    isUploading,
    
    // Actions
    addFiles,
    addAndUploadFiles,
    removeFile,
    clearFiles,
    startUpload,
    retryUpload,
    
    // Computed values
    pendingCount: files.filter(f => f.status === 'pending').length,
    uploadingCount: files.filter(f => f.status === 'uploading').length,
    completedCount: files.filter(f => f.status === 'completed').length,
    failedCount: files.filter(f => f.status === 'failed').length,
    totalProgress: files.length > 0 
      ? Math.round(files.reduce((sum, f) => sum + f.progress, 0) / files.length)
      : 0,
  }
} 
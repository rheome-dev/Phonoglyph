import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface FileMetadata {
  id: string
  file_name: string
  file_type: 'midi' | 'audio' | 'video' | 'image'
  file_size: number
  mime_type: string
  thumbnail_url?: string
  video_metadata?: {
    duration: number
    width: number
    height: number
    frameRate: number
    codec: string
    aspectRatio: string
  }
  image_metadata?: {
    width: number
    height: number
    colorProfile: string
    orientation: number
    hasAlpha: boolean
    fileFormat: string
  }
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
}

interface AssetPreviewProps {
  file: FileMetadata
  onSelect?: (file: FileMetadata) => void
  className?: string
}

const formatFileSize = (bytes: number): string => {
  const sizes = ['B', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const getFileTypeIcon = (fileType: string): string => {
  switch (fileType) {
    case 'video': return '🎬'
    case 'image': return '🖼️'
    case 'audio': return '🎵'
    case 'midi': return '🎹'
    default: return '📄'
  }
}

const getFileTypeColor = (fileType: string): string => {
  switch (fileType) {
    case 'video': return 'bg-purple-100 text-purple-800'
    case 'image': return 'bg-green-100 text-green-800'
    case 'audio': return 'bg-blue-100 text-blue-800'
    case 'midi': return 'bg-orange-100 text-orange-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export function AssetPreview({ file, onSelect, className }: AssetPreviewProps) {
  const handleClick = () => {
    onSelect?.(file)
  }

  const renderPreview = () => {
    switch (file.file_type) {
      case 'video':
        if (file.thumbnail_url) {
          return (
            <div className="relative aspect-video bg-gray-100 rounded-md overflow-hidden">
              <img 
                src={file.thumbnail_url}
                alt={file.file_name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                {file.video_metadata?.duration ? formatDuration(file.video_metadata.duration) : ''}
              </div>
              <div className="absolute top-2 left-2">
                <span className="text-2xl">▶️</span>
              </div>
            </div>
          )
        }
        return (
          <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
            <div className="text-center text-gray-500">
              <span className="text-4xl block mb-2">🎬</span>
              <span className="text-sm">
                {file.processing_status === 'pending' ? 'Processing...' : 'Video Preview'}
              </span>
            </div>
          </div>
        )

      case 'image':
        if (file.thumbnail_url) {
          return (
            <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
              <img 
                src={file.thumbnail_url}
                alt={file.file_name}
                className="w-full h-full object-contain"
              />
            </div>
          )
        }
        return (
          <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
            <div className="text-center text-gray-500">
              <span className="text-4xl block mb-2">🖼️</span>
              <span className="text-sm">
                {file.processing_status === 'pending' ? 'Processing...' : 'Image Preview'}
              </span>
            </div>
          </div>
        )

      case 'audio':
        return (
          <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
            <div className="text-center text-gray-500">
              <span className="text-4xl block mb-2">🎵</span>
              <span className="text-sm">Audio File</span>
            </div>
          </div>
        )

      case 'midi':
        return (
          <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
            <div className="text-center text-gray-500">
              <span className="text-4xl block mb-2">🎹</span>
              <span className="text-sm">MIDI File</span>
            </div>
          </div>
        )

      default:
        return (
          <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
            <div className="text-center text-gray-500">
              <span className="text-4xl block mb-2">📄</span>
              <span className="text-sm">Unknown File</span>
            </div>
          </div>
        )
    }
  }

  const renderMetadata = () => {
    if (file.file_type === 'video' && file.video_metadata) {
      return (
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Resolution:</span>
            <span>{file.video_metadata.width}x{file.video_metadata.height}</span>
          </div>
          <div className="flex justify-between">
            <span>Duration:</span>
            <span>{formatDuration(file.video_metadata.duration)}</span>
          </div>
          <div className="flex justify-between">
            <span>Codec:</span>
            <span>{file.video_metadata.codec}</span>
          </div>
        </div>
      )
    }

    if (file.file_type === 'image' && file.image_metadata) {
      return (
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Dimensions:</span>
            <span>{file.image_metadata.width}x{file.image_metadata.height}</span>
          </div>
          <div className="flex justify-between">
            <span>Format:</span>
            <span>{file.image_metadata.fileFormat}</span>
          </div>
          <div className="flex justify-between">
            <span>Color:</span>
            <span>{file.image_metadata.colorProfile}</span>
          </div>
        </div>
      )
    }

    return (
      <div className="text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Type:</span>
          <span className="capitalize">{file.file_type}</span>
        </div>
      </div>
    )
  }

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow ${className}`}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        {renderPreview()}
        
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm truncate flex-1" title={file.file_name}>
              {file.file_name}
            </h3>
            <Badge variant="secondary" className={getFileTypeColor(file.file_type)}>
              {getFileTypeIcon(file.file_type)} {file.file_type.toUpperCase()}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{formatFileSize(file.file_size)}</span>
            <span>{new Date(file.created_at).toLocaleDateString()}</span>
          </div>

          {renderMetadata()}

          {file.processing_status && file.processing_status !== 'completed' && (
            <div className="mt-2">
              <Badge 
                variant={file.processing_status === 'failed' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {file.processing_status === 'pending' && '⏳ Processing...'}
                {file.processing_status === 'processing' && '🔄 Processing...'}
                {file.processing_status === 'failed' && '❌ Failed'}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 
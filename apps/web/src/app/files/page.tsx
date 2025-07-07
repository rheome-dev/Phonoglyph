'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  FileMusic, 
  Music, 
  Video, 
  Download, 
  Trash2, 
  Upload,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react'
import Link from 'next/link'

// Mock data for now - will be replaced with real data from API
const mockFiles = [
  {
    id: 'file_1',
    fileName: 'beethoven_symphony_5.mid',
    fileType: 'midi' as const,
    fileSize: 1024 * 45, // 45KB
    uploadStatus: 'completed' as const,
    createdAt: new Date('2024-01-15T10:30:00Z'),
    r2Key: 'midi/user123/1642248600000_beethoven_symphony_5.mid'
  },
  {
    id: 'file_2', 
    fileName: 'jazz_piano_recording.mp3',
    fileType: 'audio' as const,
    fileSize: 1024 * 1024 * 8.5, // 8.5MB
    uploadStatus: 'completed' as const,
    createdAt: new Date('2024-01-14T15:45:00Z'),
    r2Key: 'audio/user123/1642162700000_jazz_piano_recording.mp3'
  },
  {
    id: 'file_3',
    fileName: 'concert_video.mp4',
    fileType: 'video' as const,
    fileSize: 1024 * 1024 * 125, // 125MB
    uploadStatus: 'completed' as const,
    createdAt: new Date('2024-01-13T20:15:00Z'),
    r2Key: 'video/user123/1642076100000_concert_video.mp4'
  },
  {
    id: 'file_4',
    fileName: 'new_composition.mid',
    fileType: 'midi' as const,
    fileSize: 1024 * 23, // 23KB
    uploadStatus: 'uploading' as const,
    createdAt: new Date('2024-01-16T08:20:00Z'),
    r2Key: 'midi/user123/1642334400000_new_composition.mid'
  },
  {
    id: 'file_5',
    fileName: 'corrupted_file.mid',
    fileType: 'midi' as const,
    fileSize: 1024 * 5, // 5KB
    uploadStatus: 'failed' as const,
    createdAt: new Date('2024-01-16T09:00:00Z'),
    r2Key: 'midi/user123/1642336800000_corrupted_file.mid'
  }
]

type FileType = 'midi' | 'audio' | 'video'
type UploadStatus = 'uploading' | 'completed' | 'failed'

export default function FilesPage() {
  const [files] = useState(mockFiles)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<FileType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<UploadStatus | 'all'>('all')

  // Filter files based on search and filters
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.fileName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || file.fileType === filterType
    const matchesStatus = filterStatus === 'all' || file.uploadStatus === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  const getFileIcon = (fileType: FileType) => {
    switch (fileType) {
      case 'midi':
        return <FileMusic className="h-5 w-5 text-blue-600" />
      case 'audio':
        return <Music className="h-5 w-5 text-green-600" />
      case 'video':
        return <Video className="h-5 w-5 text-purple-600" />
      default:
        return <FileMusic className="h-5 w-5" />
    }
  }

  const getStatusBadge = (status: UploadStatus) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>
      case 'uploading':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Uploading</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const handleDownload = (file: typeof mockFiles[0]) => {
    // TODO: Implement real download via tRPC
    console.log('Downloading file:', file.fileName)
    alert(`Download functionality coming soon for: ${file.fileName}`)
  }

  const handleDelete = (file: typeof mockFiles[0]) => {
    // TODO: Implement real delete via tRPC
    if (confirm(`Are you sure you want to delete "${file.fileName}"?`)) {
      console.log('Deleting file:', file.fileName)
      alert(`Delete functionality coming soon for: ${file.fileName}`)
    }
  }

  const getFileTypeColor = (fileType: FileType) => {
    switch (fileType) {
      case 'midi': return 'bg-blue-50 border-blue-200'
      case 'audio': return 'bg-green-50 border-green-200'
      case 'video': return 'bg-purple-50 border-purple-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Files 📁</h1>
            <p className="text-muted-foreground">
              Manage your uploaded MIDI, audio, and video files
            </p>
          </div>
          <Link href="/upload-demo">
            <Button className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Files
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filter & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* File Type Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FileType | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="midi">MIDI</option>
                <option value="audio">Audio</option>
                <option value="video">Video</option>
              </select>
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as UploadStatus | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="uploading">Uploading</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Files List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Files ({filteredFiles.length})
          </CardTitle>
          <CardDescription>
            Your uploaded files with download and management options
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <FileMusic className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Upload your first file to get started'
                }
              </p>
              <Link href="/upload-demo">
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className={`p-4 rounded-lg border-2 ${getFileTypeColor(file.fileType)} hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-center justify-between">
                    {/* File Info */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-shrink-0">
                        {getFileIcon(file.fileType)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {file.fileName}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span>{formatFileSize(file.fileSize)}</span>
                          <span>•</span>
                          <span>{formatDate(file.createdAt)}</span>
                          <span>•</span>
                          <span className="capitalize">{file.fileType}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {getStatusBadge(file.uploadStatus)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      {file.uploadStatus === 'completed' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(file)}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(file)}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </>
                      )}
                      
                      {file.uploadStatus === 'failed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(file)}
                          className="flex items-center gap-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </Button>
                      )}

                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileMusic className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">MIDI Files</p>
                <p className="text-lg font-bold text-blue-700">
                  {files.filter(f => f.fileType === 'midi').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">Audio Files</p>
                <p className="text-lg font-bold text-green-700">
                  {files.filter(f => f.fileType === 'audio').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-purple-900">Video Files</p>
                <p className="text-lg font-bold text-purple-700">
                  {files.filter(f => f.fileType === 'video').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm font-medium text-gray-900">Total Storage</p>
                <p className="text-lg font-bold text-gray-700">
                  {formatFileSize(files.reduce((total, file) => total + file.fileSize, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 
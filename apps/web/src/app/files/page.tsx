'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  MoreVertical,
  Film,
  Loader2,
  ExternalLink,
  Clock,
  AlertCircle,
} from 'lucide-react'

type FileType = 'midi' | 'audio' | 'video' | 'image'
type UploadStatus = 'uploading' | 'completed' | 'failed'

function formatFileSize(bytes: number) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)
}

function getFileIcon(fileType: FileType) {
  switch (fileType) {
    case 'midi': return <FileMusic className="h-5 w-5 text-blue-600" />
    case 'audio': return <Music className="h-5 w-5 text-green-600" />
    case 'video': return <Video className="h-5 w-5 text-purple-600" />
    default: return <FileMusic className="h-5 w-5" />
  }
}

function getStatusBadge(status: UploadStatus) {
  switch (status) {
    case 'completed': return <Badge className="bg-green-100 text-green-800">Completed</Badge>
    case 'uploading': return <Badge className="bg-blue-100 text-blue-800">Uploading</Badge>
    case 'failed': return <Badge variant="destructive">Failed</Badge>
    default: return <Badge variant="outline">Unknown</Badge>
  }
}

function getRenderStatusBadge(status: string) {
  switch (status) {
    case 'completed': return <Badge className="bg-emerald-600">Completed</Badge>
    case 'in_progress': return <Badge className="bg-blue-600">Rendering</Badge>
    case 'queued': return <Badge className="bg-stone-600">Queued</Badge>
    case 'failed': return <Badge variant="destructive">Failed</Badge>
    default: return <Badge variant="outline">{status}</Badge>
  }
}

type Tab = 'renders' | 'audio' | 'midi' | 'all'

export default function FilesPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('renders')

  // Fetch renders
  const { data: rendersData, isLoading: rendersLoading } = trpc.render.listRenders.useQuery(
    { limit: 50 },
    { refetchOnWindowFocus: false }
  )

  // Fetch user files
  const { data: filesData, isLoading: filesLoading } = trpc.file.getUserFiles.useQuery(
    { limit: 100 },
    { refetchOnWindowFocus: false }
  )

  const renders = rendersData?.renders ?? []
  const allFiles = filesData?.files ?? []

  // Filter renders
  const filteredRenders = renders.filter(r =>
    (r.project_name ?? 'Untitled').toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Filter files by type and search
  const filteredFiles = allFiles.filter(f => {
    const matchesSearch = f.file_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTab =
      activeTab === 'all' ? true :
      activeTab === 'midi' ? f.file_type === 'midi' :
      activeTab === 'audio' ? f.file_type === 'audio' || f.file_type === 'video' :
      true
    return matchesSearch && matchesTab
  })

  const stats = {
    renders: renders.length,
    midi: allFiles.filter(f => f.file_type === 'midi').length,
    audio: allFiles.filter(f => f.file_type === 'audio').length,
    video: allFiles.filter(f => f.file_type === 'video').length,
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Files</h1>
            <p className="text-muted-foreground">
              Your renders, stems, and uploaded files
            </p>
          </div>
          <Button onClick={() => router.push('/creative-visualizer')}>
            <Upload className="h-4 w-4 mr-2" />
            New Render
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-stone-200">
        {([
          ['renders', 'Renders', stats.renders],
          ['audio', 'Songs & Stems', stats.audio],
          ['midi', 'MIDI', stats.midi],
          ['all', 'All Files', allFiles.length],
        ] as [Tab, string, number][]).map(([tab, label, count]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {label} <span className="text-stone-400 ml-1">{count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search files..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-stone-900 focus:border-transparent"
        />
      </div>

      {/* Content */}
      {activeTab === 'renders' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Film className="h-5 w-5" />
              Rendered Videos ({filteredRenders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rendersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
              </div>
            ) : filteredRenders.length === 0 ? (
              <div className="text-center py-12">
                <Film className="h-12 w-12 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500 mb-4">
                  {searchTerm ? 'No renders match your search' : 'No renders yet — create your first visual!'}
                </p>
                <Button onClick={() => router.push('/creative-visualizer')}>
                  Open Editor
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRenders.map((render) => (
                  <div
                    key={render.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-stone-200 hover:border-stone-300 hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 rounded bg-stone-100 flex items-center justify-center">
                        <Video className="h-5 w-5 text-stone-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-stone-900 truncate">
                            {render.project_name ?? 'Untitled Render'}
                          </p>
                          {getRenderStatusBadge(render.status)}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-stone-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeAgo(render.created_at)}
                          </span>
                          {render.output_url && (
                            <span className="flex items-center gap-1">
                              <span>{formatDate(render.created_at)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {render.status === 'completed' && render.output_url && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.href = `/api/renders/${render.id}/download`}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/renders/${render.id}/result`)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </>
                      )}
                      {render.status !== 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/renders/${render.id}/result`)}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Status
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab !== 'renders' && (
        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === 'midi' ? 'MIDI Files' : activeTab === 'audio' ? 'Songs & Stems' : 'All Files'}
              {' '}({filteredFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-12">
                <FileMusic className="h-12 w-12 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500 mb-4">
                  {searchTerm ? 'No files match your search' : 'No files uploaded yet'}
                </p>
                <Button onClick={() => router.push('/creative-visualizer')}>
                  Upload Files
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`p-4 rounded-lg border-2 ${
                      file.file_type === 'midi' ? 'bg-blue-50 border-blue-200' :
                      file.file_type === 'audio' ? 'bg-green-50 border-green-200' :
                      'bg-purple-50 border-purple-200'
                    } hover:shadow-sm transition-shadow`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {getFileIcon(file.file_type as FileType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-stone-900 truncate">
                              {file.file_name}
                            </p>
                            {getStatusBadge(file.upload_status as UploadStatus)}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-stone-600 mt-0.5">
                            <span>{formatFileSize(file.file_size)}</span>
                            <span>•</span>
                            <span>{formatDate(file.created_at)}</span>
                            <span>•</span>
                            <span className="capitalize">{file.file_type}</span>
                            {file.is_master && (
                              <Badge variant="outline" className="text-xs">Master</Badge>
                            )}
                            {file.stem_type && file.stem_type !== 'master' && (
                              <Badge variant="outline" className="text-xs">{file.stem_type}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {file.upload_status === 'completed' && (
                          <>
                            <Button variant="outline" size="sm">
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push('/creative-visualizer')}
                            >
                              Use in Render
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <Card className="bg-stone-50 border-stone-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Film className="h-5 w-5 text-stone-600" />
              <div>
                <p className="text-sm font-medium text-stone-900">Renders</p>
                <p className="text-lg font-bold text-stone-700">{stats.renders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileMusic className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">MIDI</p>
                <p className="text-lg font-bold text-blue-700">{stats.midi}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">Songs & Stems</p>
                <p className="text-lg font-bold text-green-700">{stats.audio}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-purple-900">Videos</p>
                <p className="text-lg font-bold text-purple-700">{stats.video}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

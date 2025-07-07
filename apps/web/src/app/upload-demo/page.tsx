'use client'

import { useState } from 'react'
import { useUpload } from '@/hooks/use-upload'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Upload, FileMusic, Music, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function UploadDemoPage() {
  const { files, isUploading, addAndUploadFiles } = useUpload()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setSelectedFiles(files)
  }

  const handleUpload = async () => {
    await addAndUploadFiles(selectedFiles)
    setSelectedFiles([])
  }

  const getFileIcon = (file: File) => {
    const name = file.name.toLowerCase()
    if (name.match(/\.(mid|midi)$/i)) {
      return <FileMusic className="h-4 w-4" />
    }
    if (name.match(/\.(mp3|wav)$/i)) {
      return <Music className="h-4 w-4" />
    }
    if (name.match(/\.(mp4|mov|webm)$/i)) {
      return <Upload className="h-4 w-4" />
    }
    if (name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return <Upload className="h-4 w-4" />
    }
    return <Upload className="h-4 w-4" />
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'uploading':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">File Upload Demo 🎵</h1>
        <p className="text-muted-foreground">
          Test the file upload functionality with MIDI and audio files
        </p>
      </div>

      {/* Upload Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
          <CardDescription>
            Select MIDI (.mid, .midi), audio (.mp3, .wav), video (.mp4, .mov, .webm), or image (.jpg, .png, .gif, .webp) files to upload
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <input
              type="file"
              multiple
              accept=".mid,.midi,.mp3,.wav,.mp4,.mov,.webm,.jpg,.jpeg,.png,.gif,.webp"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Selected Files:</h4>
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    {getFileIcon(file)}
                    <span className="text-sm">{file.name}</span>
                    <Badge variant="outline">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </Badge>
                  </div>
                ))}
                
                <Button 
                  onClick={handleUpload} 
                  disabled={isUploading}
                  className="w-full"
                >
                  {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload History */}
      <Card>
        <CardHeader>
          <CardTitle>Upload History</CardTitle>
          <CardDescription>
            View the status of your file uploads
          </CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No uploads yet. Select some files to get started!
            </p>
          ) : (
            <div className="space-y-3">
              {files.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(upload.file)}
                    <div>
                      <p className="font-medium">{upload.file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(upload.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {upload.status === 'uploading' && upload.progress !== undefined && (
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${upload.progress}%` }}
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      {getStatusIcon(upload.status)}
                      <Badge
                        variant={
                          upload.status === 'completed'
                            ? 'default'
                            : upload.status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {upload.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Panel */}
      <Card className="mt-8 bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">📋 File Upload Specs</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <ul className="space-y-1 text-sm">
            <li><strong>MIDI Files:</strong> .mid, .midi (max 5MB)</li>
            <li><strong>Audio Files:</strong> .mp3, .wav (max 50MB)</li>
            <li><strong>Video Files:</strong> .mp4, .mov, .webm (max 500MB)</li>
            <li><strong>Image Files:</strong> .jpg, .jpeg, .png, .gif, .webp (max 25MB)</li>
            <li><strong>Security:</strong> File validation, virus scanning</li>
            <li><strong>Rate Limit:</strong> 10 uploads per minute</li>
            <li><strong>Storage:</strong> Cloudflare R2 (in progress)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
} 
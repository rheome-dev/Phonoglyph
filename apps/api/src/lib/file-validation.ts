import { z } from 'zod'

// File type definitions - EXTENDED for video and image
export type FileType = 'midi' | 'audio' | 'video' | 'image'

// Video and Image metadata interfaces
export interface VideoMetadata {
  duration: number;           // seconds
  width: number;             // pixels
  height: number;            // pixels
  frameRate: number;         // fps
  codec: string;             // h264, h265, etc.
  bitrate: number;           // kbps
  aspectRatio: string;       // "16:9", "4:3", etc.
}

export interface ImageMetadata {
  width: number;             // pixels
  height: number;            // pixels
  colorProfile: string;      // sRGB, Adobe RGB, etc.
  orientation: number;       // EXIF orientation
  hasAlpha: boolean;         // transparency channel
  fileFormat: string;        // JPEG, PNG, GIF
}

export interface ValidatedFile {
  fileName: string
  fileType: FileType
  mimeType: string
  fileSize: number
  isValid: boolean
  errors: string[]
}

// File size limits from environment variables - EXTENDED
export const FILE_SIZE_LIMITS = {
  midi: parseInt(process.env.MAX_MIDI_FILE_SIZE || '5242880'), // 5MB
  audio: parseInt(process.env.MAX_AUDIO_FILE_SIZE || '52428800'), // 50MB
  video: parseInt(process.env.MAX_VIDEO_FILE_SIZE || '524288000'), // 500MB
  image: parseInt(process.env.MAX_IMAGE_FILE_SIZE || '26214400'), // 25MB
} as const

// Allowed MIME types - EXTENDED
export const ALLOWED_MIME_TYPES = {
  midi: [
    'audio/midi',
    'audio/x-midi',
    'application/x-midi',
    'audio/mid',
  ] as string[],
  audio: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
  ] as string[],
  video: [
    'video/mp4',
    'video/mov',
    'video/quicktime',
    'video/webm',
  ] as string[],
  image: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ] as string[],
}

// Allowed file extensions - EXTENDED
export const ALLOWED_EXTENSIONS = {
  midi: ['.mid', '.midi'],
  audio: ['.mp3', '.wav'],
  video: ['.mp4', '.mov', '.webm'],
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
} as const

// Magic bytes for file header validation - EXTENDED
export const MAGIC_BYTES = {
  midi: [
    [0x4d, 0x54, 0x68, 0x64], // "MThd" - Standard MIDI file header
  ],
  mp3: [
    [0xff, 0xfb], // MPEG-1 Layer 3
    [0xff, 0xf3], // MPEG-2 Layer 3
    [0xff, 0xf2], // MPEG-2.5 Layer 3
    [0x49, 0x44, 0x33], // ID3 tag
  ],
  wav: [
    [0x52, 0x49, 0x46, 0x46], // "RIFF" header
  ],
  mp4: [
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], // MP4 signature
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // Alternative MP4
  ],
  webm: [
    [0x1a, 0x45, 0xdf, 0xa3], // WebM/Matroska signature
  ],
  jpeg: [
    [0xff, 0xd8, 0xff], // JPEG signature
  ],
  png: [
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // PNG signature
  ],
  gif: [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  webp: [
    [0x52, 0x49, 0x46, 0x46], // RIFF container for WebP
  ],
} as const

// Validation configurations for new file types
export const videoValidation = {
  maxSize: 500 * 1024 * 1024,  // 500MB
  allowedTypes: [
    'video/mp4',
    'video/mov', 
    'video/quicktime',
    'video/webm'
  ],
  maxDuration: 600,            // 10 minutes max
  maxResolution: {
    width: 3840,               // 4K max
    height: 2160
  }
};

export const imageValidation = {
  maxSize: 25 * 1024 * 1024,   // 25MB
  allowedTypes: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ],
  maxResolution: {
    width: 8192,               // 8K max
    height: 8192
  }
};

// Zod schema for file upload input - EXTENDED
export const FileUploadSchema = z.object({
  fileName: z.string().min(1, 'File name is required').max(255, 'File name too long'),
  fileSize: z.number().positive('File size must be positive'),
  mimeType: z.string().min(1, 'MIME type is required'),
})

export type FileUploadInput = z.infer<typeof FileUploadSchema>

// Validate file extension - EXTENDED
export function validateFileExtension(fileName: string): FileType | null {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
  
  if (ALLOWED_EXTENSIONS.midi.includes(extension as any)) {
    return 'midi'
  }
  
  if (ALLOWED_EXTENSIONS.audio.includes(extension as any)) {
    return 'audio'
  }
  
  if (ALLOWED_EXTENSIONS.video.includes(extension as any)) {
    return 'video'
  }
  
  if (ALLOWED_EXTENSIONS.image.includes(extension as any)) {
    return 'image'
  }
  
  return null
}

// Validate MIME type
export function validateMimeType(mimeType: string, fileType: FileType): boolean {
  return ALLOWED_MIME_TYPES[fileType].includes(mimeType)
}

// Validate file size
export function validateFileSize(fileSize: number, fileType: FileType): boolean {
  return fileSize <= FILE_SIZE_LIMITS[fileType]
}

// Validate file header (magic bytes) - EXTENDED
export function validateFileHeader(buffer: ArrayBuffer, fileType: FileType): boolean {
  const uint8Array = new Uint8Array(buffer.slice(0, 12)) // Check first 12 bytes
  
  switch (fileType) {
    case 'midi':
      // Check for MIDI "MThd" header
      return [0x4d, 0x54, 0x68, 0x64].every((byte, i) => uint8Array[i] === byte)
      
    case 'audio':
      // For audio, we need to check the actual extension/mime type
      if (buffer.byteLength < 4) return false
      
      // Check for MP3
      if ([0xff, 0xfb].every((byte, i) => uint8Array[i] === byte) ||
          [0xff, 0xf3].every((byte, i) => uint8Array[i] === byte) ||
          [0xff, 0xf2].every((byte, i) => uint8Array[i] === byte) ||
          [0x49, 0x44, 0x33].every((byte, i) => uint8Array[i] === byte)) {
        return true
      }
      
      // Check for WAV
      if ([0x52, 0x49, 0x46, 0x46].every((byte, i) => uint8Array[i] === byte) &&
          uint8Array.length >= 12 &&
          [0x57, 0x41, 0x56, 0x45].every((byte, i) => uint8Array[i + 8] === byte)) {
        return true
      }
      
      return false
      
    case 'video':
      if (buffer.byteLength < 8) return false
      
      // Check for MP4
      if (uint8Array.length >= 8 && 
          ([0x66, 0x74, 0x79, 0x70].every((byte, i) => uint8Array[i + 4] === byte))) {
        return true
      }
      
      // Check for WebM
      if ([0x1a, 0x45, 0xdf, 0xa3].every((byte, i) => uint8Array[i] === byte)) {
        return true
      }
      
      return false
      
    case 'image':
      if (buffer.byteLength < 8) return false
      
      // Check for JPEG
      if ([0xff, 0xd8, 0xff].every((byte, i) => uint8Array[i] === byte)) {
        return true
      }
      
      // Check for PNG
      if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, i) => uint8Array[i] === byte)) {
        return true
      }
      
      // Check for GIF
      if ([0x47, 0x49, 0x46, 0x38].every((byte, i) => uint8Array[i] === byte) &&
          (uint8Array[4] === 0x37 || uint8Array[4] === 0x39) &&
          uint8Array[5] === 0x61) {
        return true
      }
      
      // Check for WebP (RIFF container)
      if ([0x52, 0x49, 0x46, 0x46].every((byte, i) => uint8Array[i] === byte) &&
          uint8Array.length >= 12 &&
          [0x57, 0x45, 0x42, 0x50].every((byte, i) => uint8Array[i + 8] === byte)) {
        return true
      }
      
      return false
      
    default:
      return false
  }
}

// Main file validation function - UPDATED
export function validateFile(input: FileUploadInput): ValidatedFile {
  const errors: string[] = []
  const { fileName, fileSize, mimeType } = input
  
  // Validate file extension and determine type
  const fileType = validateFileExtension(fileName)
  if (!fileType) {
    errors.push('Invalid file type. Allowed types: .mid, .midi, .mp3, .wav, .mp4, .mov, .webm, .jpg, .jpeg, .png, .gif, .webp')
  }
  
  let result: ValidatedFile = {
    fileName,
    fileType: fileType || 'midi', // Default to midi to avoid type errors
    mimeType,
    fileSize,
    isValid: false,
    errors,
  }
  
  if (!fileType) {
    return result
  }
  
  // Update result with determined file type
  result.fileType = fileType
  
  // Validate MIME type
  if (!validateMimeType(mimeType, fileType)) {
    errors.push(`Invalid MIME type for ${fileType} file. Allowed types: ${ALLOWED_MIME_TYPES[fileType].join(', ')}`)
  }
  
  // Validate file size
  if (!validateFileSize(fileSize, fileType)) {
    const maxSizeMB = FILE_SIZE_LIMITS[fileType] / (1024 * 1024)
    errors.push(`File size exceeds limit. Maximum size for ${fileType} files: ${maxSizeMB}MB`)
  }
  
  // Validate file name
  if (fileName.length > 255) {
    errors.push('File name is too long (maximum 255 characters)')
  }
  
  result.errors = errors
  result.isValid = errors.length === 0
  
  return result
}

// Sanitize file name for storage
export function sanitizeFileName(fileName: string): string {
  // Replace unsafe characters with underscores
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
}

// Get file extension
export function getFileExtension(fileName: string): string {
  return fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
}

// Check if file is executable (security check)
export function isExecutableFile(fileName: string): boolean {
  const executableExtensions = [
    '.exe', '.bat', '.cmd', '.com', '.scr', '.pif',
    '.sh', '.bash', '.zsh', '.csh', '.fish',
    '.ps1', '.vbs', '.js', '.jar', '.app',
  ]
  
  const extension = getFileExtension(fileName)
  return executableExtensions.includes(extension)
}

// Rate limiting helper for uploads
export function createUploadRateLimit() {
  const uploads = new Map<string, number[]>()
  const WINDOW_MS = 60 * 1000 // 1 minute
  const MAX_UPLOADS = 10 // Max uploads per minute per user
  
  return {
    checkRateLimit: (userId: string): boolean => {
      const now = Date.now()
      const userUploads = uploads.get(userId) || []
      
      // Remove old timestamps
      const recentUploads = userUploads.filter(timestamp => 
        now - timestamp < WINDOW_MS
      )
      
      // Check if under limit
      if (recentUploads.length >= MAX_UPLOADS) {
        return false
      }
      
      // Add current upload
      recentUploads.push(now)
      uploads.set(userId, recentUploads)
      
      return true
    },
    
    getRemainingUploads: (userId: string): number => {
      const now = Date.now()
      const userUploads = uploads.get(userId) || []
      const recentUploads = userUploads.filter(timestamp => 
        now - timestamp < WINDOW_MS
      )
      
      return Math.max(0, MAX_UPLOADS - recentUploads.length)
    }
  }
} 
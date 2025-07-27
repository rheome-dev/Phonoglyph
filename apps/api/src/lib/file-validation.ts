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

// Security validation interfaces
export interface SecurityIssue {
  type: 'malware' | 'embedded_script' | 'suspicious_header' | 'invalid_structure' | 'oversized_metadata';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details?: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  detectedType: string;
  securityIssues: SecurityIssue[];
  confidence: number;
  fileSize: number;
  actualMimeType?: string;
}

export interface ScanResult {
  isClean: boolean;
  threats: Array<{
    name: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  scanTime: number;
}

// Enhanced magic byte validation with security checks
export async function validateFileContentSecurity(buffer: Buffer, expectedType: FileType): Promise<ValidationResult> {
  const uint8Array = new Uint8Array(buffer.slice(0, 64)); // Check first 64 bytes for thorough analysis
  const securityIssues: SecurityIssue[] = [];
  let confidence = 0;
  let detectedType = 'unknown';

  // Check for executable file signatures (security threat)
  const executableSignatures = [
    [0x4d, 0x5a], // PE executable (Windows)
    [0x7f, 0x45, 0x4c, 0x46], // ELF executable (Linux)
    [0xfe, 0xed, 0xfa, 0xce], // Mach-O executable (macOS)
    [0xca, 0xfe, 0xba, 0xbe], // Java class file
  ];

  for (const signature of executableSignatures) {
    if (signature.every((byte, i) => uint8Array[i] === byte)) {
      securityIssues.push({
        type: 'malware',
        severity: 'critical',
        description: 'File contains executable code signature',
        details: { signature: signature.map(b => `0x${b.toString(16)}`).join(' ') }
      });
      return {
        isValid: false,
        detectedType: 'executable',
        securityIssues,
        confidence: 1.0,
        fileSize: buffer.length
      };
    }
  }

  // Validate against expected file type with enhanced security
  switch (expectedType) {
    case 'midi':
      if ([0x4d, 0x54, 0x68, 0x64].every((byte, i) => uint8Array[i] === byte)) {
        detectedType = 'midi';
        confidence = 0.95;

        // Check for suspicious MIDI data
        if (buffer.length > 10 * 1024 * 1024) { // 10MB is unusually large for MIDI
          securityIssues.push({
            type: 'suspicious_header',
            severity: 'medium',
            description: 'MIDI file is unusually large',
            details: { size: buffer.length }
          });
        }
      }
      break;

    case 'audio':
      // Enhanced MP3 validation
      if ([0xff, 0xfb].every((byte, i) => uint8Array[i] === byte) ||
          [0xff, 0xf3].every((byte, i) => uint8Array[i] === byte) ||
          [0xff, 0xf2].every((byte, i) => uint8Array[i] === byte)) {
        detectedType = 'mp3';
        confidence = 0.9;
      } else if ([0x49, 0x44, 0x33].every((byte, i) => uint8Array[i] === byte)) {
        detectedType = 'mp3';
        confidence = 0.85;

        // Check ID3 tag size for potential overflow attacks
        if (uint8Array.length >= 10) {
          const tagSize = (uint8Array[6]! << 21) | (uint8Array[7]! << 14) | (uint8Array[8]! << 7) | uint8Array[9]!;
          if (tagSize > 1024 * 1024) { // 1MB tag size is suspicious
            securityIssues.push({
              type: 'oversized_metadata',
              severity: 'high',
              description: 'MP3 ID3 tag is suspiciously large',
              details: { tagSize }
            });
          }
        }
      } else if ([0x52, 0x49, 0x46, 0x46].every((byte, i) => uint8Array[i] === byte) &&
                 uint8Array.length >= 12 &&
                 [0x57, 0x41, 0x56, 0x45].every((byte, i) => uint8Array[i + 8] === byte)) {
        detectedType = 'wav';
        confidence = 0.95;
      }
      break;

    case 'video':
      if (uint8Array.length >= 8 &&
          [0x66, 0x74, 0x79, 0x70].every((byte, i) => uint8Array[i + 4] === byte)) {
        detectedType = 'mp4';
        confidence = 0.9;
      } else if ([0x1a, 0x45, 0xdf, 0xa3].every((byte, i) => uint8Array[i] === byte)) {
        detectedType = 'webm';
        confidence = 0.9;
      }
      break;

    case 'image':
      if ([0xff, 0xd8, 0xff].every((byte, i) => uint8Array[i] === byte)) {
        detectedType = 'jpeg';
        confidence = 0.95;

        // Check for JPEG with embedded scripts (EXIF injection)
        if (buffer.includes(Buffer.from('<script'))) {
          securityIssues.push({
            type: 'embedded_script',
            severity: 'high',
            description: 'JPEG contains embedded script tags',
          });
        }
      } else if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, i) => uint8Array[i] === byte)) {
        detectedType = 'png';
        confidence = 0.95;
      } else if ([0x47, 0x49, 0x46, 0x38].every((byte, i) => uint8Array[i] === byte) &&
                 (uint8Array[4] === 0x37 || uint8Array[4] === 0x39) &&
                 uint8Array[5] === 0x61) {
        detectedType = 'gif';
        confidence = 0.95;
      } else if ([0x52, 0x49, 0x46, 0x46].every((byte, i) => uint8Array[i] === byte) &&
                 uint8Array.length >= 12 &&
                 [0x57, 0x45, 0x42, 0x50].every((byte, i) => uint8Array[i + 8] === byte)) {
        detectedType = 'webp';
        confidence = 0.9;
      }
      break;
  }

  // Check for polyglot files (files that are valid in multiple formats)
  if (confidence > 0 && detectedType !== expectedType) {
    securityIssues.push({
      type: 'suspicious_header',
      severity: 'medium',
      description: `File header indicates ${detectedType} but expected ${expectedType}`,
      details: { detected: detectedType, expected: expectedType }
    });
  }

  const isValid = confidence > 0.8 && securityIssues.filter(issue => issue.severity === 'critical' || issue.severity === 'high').length === 0;

  return {
    isValid,
    detectedType,
    securityIssues,
    confidence,
    fileSize: buffer.length
  };
}

// Legacy function for backward compatibility - now uses enhanced security validation
export async function validateFileHeader(buffer: ArrayBuffer, fileType: FileType): Promise<boolean> {
  const bufferNode = Buffer.from(buffer);
  // Use the new security validation but only return boolean for compatibility
  try {
    const result = await validateFileContentSecurity(bufferNode, fileType);
    return result.isValid;
  } catch {
    return false;
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
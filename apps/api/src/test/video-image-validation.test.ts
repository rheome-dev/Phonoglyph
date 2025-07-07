import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  validateFile,
  validateFileExtension,
  validateMimeType,
  validateFileSize,
  FILE_SIZE_LIMITS,
  videoValidation,
  imageValidation,
  type FileUploadInput,
} from '../lib/file-validation'

describe('Video & Image File Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateFileExtension - Video Files', () => {
    it('should return "video" for .mp4 files', () => {
      expect(validateFileExtension('video.mp4')).toBe('video')
      expect(validateFileExtension('VIDEO.MP4')).toBe('video')
      expect(validateFileExtension('my-video.Mp4')).toBe('video')
    })

    it('should return "video" for .mov files', () => {
      expect(validateFileExtension('video.mov')).toBe('video')
      expect(validateFileExtension('VIDEO.MOV')).toBe('video')
      expect(validateFileExtension('my-video.Mov')).toBe('video')
    })

    it('should return "video" for .webm files', () => {
      expect(validateFileExtension('video.webm')).toBe('video')
      expect(validateFileExtension('VIDEO.WEBM')).toBe('video')
      expect(validateFileExtension('my-video.Webm')).toBe('video')
    })
  })

  describe('validateFileExtension - Image Files', () => {
    it('should return "image" for .jpg/.jpeg files', () => {
      expect(validateFileExtension('image.jpg')).toBe('image')
      expect(validateFileExtension('image.jpeg')).toBe('image')
      expect(validateFileExtension('IMAGE.JPG')).toBe('image')
      expect(validateFileExtension('IMAGE.JPEG')).toBe('image')
    })

    it('should return "image" for .png files', () => {
      expect(validateFileExtension('image.png')).toBe('image')
      expect(validateFileExtension('IMAGE.PNG')).toBe('image')
      expect(validateFileExtension('my-image.Png')).toBe('image')
    })

    it('should return "image" for .gif files', () => {
      expect(validateFileExtension('image.gif')).toBe('image')
      expect(validateFileExtension('IMAGE.GIF')).toBe('image')
      expect(validateFileExtension('animated.Gif')).toBe('image')
    })

    it('should return "image" for .webp files', () => {
      expect(validateFileExtension('image.webp')).toBe('image')
      expect(validateFileExtension('IMAGE.WEBP')).toBe('image')
      expect(validateFileExtension('my-image.Webp')).toBe('image')
    })
  })

  describe('validateMimeType - Video Files', () => {
    it('should validate video MIME types', () => {
      expect(validateMimeType('video/mp4', 'video')).toBe(true)
      expect(validateMimeType('video/mov', 'video')).toBe(true)
      expect(validateMimeType('video/quicktime', 'video')).toBe(true)
      expect(validateMimeType('video/webm', 'video')).toBe(true)
    })

    it('should reject invalid MIME types for video', () => {
      expect(validateMimeType('image/jpeg', 'video')).toBe(false)
      expect(validateMimeType('audio/mp3', 'video')).toBe(false)
      expect(validateMimeType('text/plain', 'video')).toBe(false)
    })
  })

  describe('validateMimeType - Image Files', () => {
    it('should validate image MIME types', () => {
      expect(validateMimeType('image/jpeg', 'image')).toBe(true)
      expect(validateMimeType('image/jpg', 'image')).toBe(true)
      expect(validateMimeType('image/png', 'image')).toBe(true)
      expect(validateMimeType('image/gif', 'image')).toBe(true)
      expect(validateMimeType('image/webp', 'image')).toBe(true)
    })

    it('should reject invalid MIME types for image', () => {
      expect(validateMimeType('video/mp4', 'image')).toBe(false)
      expect(validateMimeType('audio/mp3', 'image')).toBe(false)
      expect(validateMimeType('text/plain', 'image')).toBe(false)
    })
  })

  describe('validateFileSize - Video Files', () => {
    it('should validate video file sizes within limit', () => {
      expect(validateFileSize(1000000, 'video')).toBe(true) // 1MB
      expect(validateFileSize(FILE_SIZE_LIMITS.video, 'video')).toBe(true) // 500MB
      expect(validateFileSize(FILE_SIZE_LIMITS.video - 1, 'video')).toBe(true)
    })

    it('should reject oversized video files', () => {
      expect(validateFileSize(FILE_SIZE_LIMITS.video + 1, 'video')).toBe(false)
      expect(validateFileSize(600 * 1024 * 1024, 'video')).toBe(false) // 600MB
    })
  })

  describe('validateFileSize - Image Files', () => {
    it('should validate image file sizes within limit', () => {
      expect(validateFileSize(1000000, 'image')).toBe(true) // 1MB
      expect(validateFileSize(FILE_SIZE_LIMITS.image, 'image')).toBe(true) // 25MB
      expect(validateFileSize(FILE_SIZE_LIMITS.image - 1, 'image')).toBe(true)
    })

    it('should reject oversized image files', () => {
      expect(validateFileSize(FILE_SIZE_LIMITS.image + 1, 'image')).toBe(false)
      expect(validateFileSize(30 * 1024 * 1024, 'image')).toBe(false) // 30MB
    })
  })

  describe('validateFile - Video Files', () => {
    it('should validate a valid video file', () => {
      const input: FileUploadInput = {
        fileName: 'video.mp4',
        fileSize: 10 * 1024 * 1024, // 10MB
        mimeType: 'video/mp4',
      }

      const result = validateFile(input)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.fileType).toBe('video')
    })

    it('should reject video files with invalid MIME types', () => {
      const input: FileUploadInput = {
        fileName: 'video.mp4',
        fileSize: 10 * 1024 * 1024,
        mimeType: 'image/jpeg',
      }

      const result = validateFile(input)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid MIME type for video file. Allowed types: video/mp4, video/mov, video/quicktime, video/webm')
    })

    it('should reject oversized video files', () => {
      const input: FileUploadInput = {
        fileName: 'video.mp4',
        fileSize: FILE_SIZE_LIMITS.video + 1,
        mimeType: 'video/mp4',
      }

      const result = validateFile(input)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('File size exceeds limit. Maximum size for video files: 500MB')
    })
  })

  describe('validateFile - Image Files', () => {
    it('should validate a valid image file', () => {
      const input: FileUploadInput = {
        fileName: 'image.jpg',
        fileSize: 5 * 1024 * 1024, // 5MB
        mimeType: 'image/jpeg',
      }

      const result = validateFile(input)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.fileType).toBe('image')
    })

    it('should reject image files with invalid MIME types', () => {
      const input: FileUploadInput = {
        fileName: 'image.jpg',
        fileSize: 5 * 1024 * 1024,
        mimeType: 'video/mp4',
      }

      const result = validateFile(input)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid MIME type for image file. Allowed types: image/jpeg, image/jpg, image/png, image/gif, image/webp')
    })

    it('should reject oversized image files', () => {
      const input: FileUploadInput = {
        fileName: 'image.jpg',
        fileSize: FILE_SIZE_LIMITS.image + 1,
        mimeType: 'image/jpeg',
      }

      const result = validateFile(input)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('File size exceeds limit. Maximum size for image files: 25MB')
    })
  })

  describe('Validation Configurations', () => {
    it('should have correct video validation settings', () => {
      expect(videoValidation.maxSize).toBe(500 * 1024 * 1024) // 500MB
      expect(videoValidation.maxDuration).toBe(600) // 10 minutes
      expect(videoValidation.maxResolution.width).toBe(3840) // 4K
      expect(videoValidation.maxResolution.height).toBe(2160)
      expect(videoValidation.allowedTypes).toContain('video/mp4')
      expect(videoValidation.allowedTypes).toContain('video/webm')
    })

    it('should have correct image validation settings', () => {
      expect(imageValidation.maxSize).toBe(25 * 1024 * 1024) // 25MB
      expect(imageValidation.maxResolution.width).toBe(8192) // 8K
      expect(imageValidation.maxResolution.height).toBe(8192)
      expect(imageValidation.allowedTypes).toContain('image/jpeg')
      expect(imageValidation.allowedTypes).toContain('image/png')
      expect(imageValidation.allowedTypes).toContain('image/gif')
    })
  })

  describe('Updated error messages', () => {
    it('should show comprehensive error message for unsupported file types', () => {
      const input: FileUploadInput = {
        fileName: 'document.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      }

      const result = validateFile(input)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid file type. Allowed types: .mid, .midi, .mp3, .wav, .mp4, .mov, .webm, .jpg, .jpeg, .png, .gif, .webp')
    })
  })
}) 
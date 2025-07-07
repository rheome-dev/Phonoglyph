import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  validateFile,
  validateFileExtension,
  validateMimeType,
  validateFileSize,
  sanitizeFileName,
  isExecutableFile,
  createUploadRateLimit,
  FILE_SIZE_LIMITS,
  type FileUploadInput,
} from '../lib/file-validation'

describe('File Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateFileExtension', () => {
    it('should return "midi" for .mid files', () => {
      expect(validateFileExtension('test.mid')).toBe('midi')
      expect(validateFileExtension('TEST.MID')).toBe('midi')
      expect(validateFileExtension('song.Mid')).toBe('midi')
    })

    it('should return "midi" for .midi files', () => {
      expect(validateFileExtension('test.midi')).toBe('midi')
      expect(validateFileExtension('TEST.MIDI')).toBe('midi')
      expect(validateFileExtension('song.Midi')).toBe('midi')
    })

    it('should return "audio" for .mp3 files', () => {
      expect(validateFileExtension('test.mp3')).toBe('audio')
      expect(validateFileExtension('TEST.MP3')).toBe('audio')
      expect(validateFileExtension('song.Mp3')).toBe('audio')
    })

    it('should return "audio" for .wav files', () => {
      expect(validateFileExtension('test.wav')).toBe('audio')
      expect(validateFileExtension('TEST.WAV')).toBe('audio')
      expect(validateFileExtension('song.Wav')).toBe('audio')
    })

    it('should return null for unsupported extensions', () => {
      expect(validateFileExtension('test.txt')).toBeNull()
      expect(validateFileExtension('test.pdf')).toBeNull()
      expect(validateFileExtension('test.exe')).toBeNull()
      expect(validateFileExtension('test')).toBeNull()
    })
  })

  describe('validateMimeType', () => {
    it('should validate MIDI MIME types', () => {
      expect(validateMimeType('audio/midi', 'midi')).toBe(true)
      expect(validateMimeType('audio/x-midi', 'midi')).toBe(true)
      expect(validateMimeType('application/x-midi', 'midi')).toBe(true)
      expect(validateMimeType('audio/mid', 'midi')).toBe(true)
    })

    it('should validate audio MIME types', () => {
      expect(validateMimeType('audio/mpeg', 'audio')).toBe(true)
      expect(validateMimeType('audio/mp3', 'audio')).toBe(true)
      expect(validateMimeType('audio/wav', 'audio')).toBe(true)
      expect(validateMimeType('audio/wave', 'audio')).toBe(true)
      expect(validateMimeType('audio/x-wav', 'audio')).toBe(true)
    })

    it('should reject invalid MIME types', () => {
      expect(validateMimeType('text/plain', 'midi')).toBe(false)
      expect(validateMimeType('application/pdf', 'audio')).toBe(false)
      expect(validateMimeType('audio/mp3', 'midi')).toBe(false)
      expect(validateMimeType('audio/midi', 'audio')).toBe(false)
    })
  })

  describe('validateFileSize', () => {
    it('should validate MIDI file sizes within limit', () => {
      expect(validateFileSize(1000, 'midi')).toBe(true)
      expect(validateFileSize(FILE_SIZE_LIMITS.midi, 'midi')).toBe(true)
      expect(validateFileSize(FILE_SIZE_LIMITS.midi - 1, 'midi')).toBe(true)
    })

    it('should validate audio file sizes within limit', () => {
      expect(validateFileSize(1000, 'audio')).toBe(true)
      expect(validateFileSize(FILE_SIZE_LIMITS.audio, 'audio')).toBe(true)
      expect(validateFileSize(FILE_SIZE_LIMITS.audio - 1, 'audio')).toBe(true)
    })

    it('should reject oversized files', () => {
      expect(validateFileSize(FILE_SIZE_LIMITS.midi + 1, 'midi')).toBe(false)
      expect(validateFileSize(FILE_SIZE_LIMITS.audio + 1, 'audio')).toBe(false)
    })
  })

  describe('validateFile', () => {
    it('should validate a valid MIDI file', () => {
      const input: FileUploadInput = {
        fileName: 'test.mid',
        fileSize: 1000,
        mimeType: 'audio/midi',
      }

      const result = validateFile(input)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.fileType).toBe('midi')
    })

    it('should validate a valid audio file', () => {
      const input: FileUploadInput = {
        fileName: 'test.mp3',
        fileSize: 10000,
        mimeType: 'audio/mpeg',
      }

      const result = validateFile(input)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.fileType).toBe('audio')
    })

    it('should reject files with invalid extensions', () => {
      const input: FileUploadInput = {
        fileName: 'test.txt',
        fileSize: 1000,
        mimeType: 'text/plain',
      }

      const result = validateFile(input)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid file type. Only .mid, .midi, .mp3, and .wav files are allowed.')
    })

    it('should reject files with invalid MIME types', () => {
      const input: FileUploadInput = {
        fileName: 'test.mid',
        fileSize: 1000,
        mimeType: 'text/plain',
      }

      const result = validateFile(input)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid MIME type for midi file. Allowed types: audio/midi, audio/x-midi, application/x-midi, audio/mid')
    })

    it('should reject oversized files', () => {
      const input: FileUploadInput = {
        fileName: 'test.mid',
        fileSize: FILE_SIZE_LIMITS.midi + 1,
        mimeType: 'audio/midi',
      }

      const result = validateFile(input)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('File size exceeds limit. Maximum size for midi files: 5MB')
    })

    it('should reject files with too long names', () => {
      const input: FileUploadInput = {
        fileName: 'a'.repeat(260) + '.mid',
        fileSize: 1000,
        mimeType: 'audio/midi',
      }

      const result = validateFile(input)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('File name is too long (maximum 255 characters)')
    })

    it('should accumulate multiple errors for valid file type with multiple issues', () => {
      const input: FileUploadInput = {
        fileName: 'a'.repeat(260) + '.mid', // Too long name
        fileSize: FILE_SIZE_LIMITS.midi + 1, // Too large
        mimeType: 'text/plain', // Wrong MIME type
      }

      const result = validateFile(input)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
      expect(result.errors).toContain('Invalid MIME type for midi file. Allowed types: audio/midi, audio/x-midi, application/x-midi, audio/mid')
      expect(result.errors).toContain('File size exceeds limit. Maximum size for midi files: 5MB')
      expect(result.errors).toContain('File name is too long (maximum 255 characters)')
    })
  })

  describe('sanitizeFileName', () => {
    it('should preserve valid characters', () => {
      expect(sanitizeFileName('test.mid')).toBe('test.mid')
      expect(sanitizeFileName('Test123-file.mp3')).toBe('Test123-file.mp3')
    })

    it('should replace invalid characters with underscores', () => {
      expect(sanitizeFileName('test file.mid')).toBe('test_file.mid')
      expect(sanitizeFileName('test@#$%file.mid')).toBe('test_file.mid')
      expect(sanitizeFileName('test/\\file.mid')).toBe('test_file.mid')
    })

    it('should handle multiple consecutive invalid characters', () => {
      expect(sanitizeFileName('test   file.mid')).toBe('test_file.mid')
      expect(sanitizeFileName('test!!!file.mid')).toBe('test_file.mid')
    })

    it('should remove leading and trailing underscores', () => {
      expect(sanitizeFileName('_test.mid')).toBe('test.mid')
      expect(sanitizeFileName('test.mid_')).toBe('test.mid')
      expect(sanitizeFileName('_test.mid_')).toBe('test.mid')
    })
  })

  describe('isExecutableFile', () => {
    it('should detect executable files', () => {
      expect(isExecutableFile('test.exe')).toBe(true)
      expect(isExecutableFile('test.bat')).toBe(true)
      expect(isExecutableFile('test.sh')).toBe(true)
      expect(isExecutableFile('test.js')).toBe(true)
      expect(isExecutableFile('test.APP')).toBe(true)
    })

    it('should not flag safe files as executable', () => {
      expect(isExecutableFile('test.mid')).toBe(false)
      expect(isExecutableFile('test.mp3')).toBe(false)
      expect(isExecutableFile('test.txt')).toBe(false)
      expect(isExecutableFile('test.pdf')).toBe(false)
    })
  })

  describe('createUploadRateLimit', () => {
    it('should allow uploads within rate limit', () => {
      const rateLimit = createUploadRateLimit()
      const userId = 'user123'

      // Should allow multiple uploads up to the limit
      for (let i = 0; i < 5; i++) {
        expect(rateLimit.checkRateLimit(userId)).toBe(true)
      }
    })

    it('should track remaining uploads correctly', () => {
      const rateLimit = createUploadRateLimit()
      const userId = 'user123'

      // Initial state
      expect(rateLimit.getRemainingUploads(userId)).toBe(10)

      // After one upload
      rateLimit.checkRateLimit(userId)
      expect(rateLimit.getRemainingUploads(userId)).toBe(9)

      // After multiple uploads
      for (let i = 0; i < 5; i++) {
        rateLimit.checkRateLimit(userId)
      }
      expect(rateLimit.getRemainingUploads(userId)).toBe(4)
    })

    it('should enforce rate limit per user', () => {
      const rateLimit = createUploadRateLimit()
      const user1 = 'user1'
      const user2 = 'user2'

      // User 1 uses some uploads
      for (let i = 0; i < 5; i++) {
        rateLimit.checkRateLimit(user1)
      }

      // User 2 should still have full quota
      expect(rateLimit.getRemainingUploads(user2)).toBe(10)
      expect(rateLimit.getRemainingUploads(user1)).toBe(5)
    })
  })
}) 
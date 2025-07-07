import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateR2Config, generateR2Key } from '../services/r2-storage'

// Mock AWS SDK (R2 uses S3-compatible API)
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  CreateBucketCommand: vi.fn(),
  PutBucketCorsCommand: vi.fn(),
  HeadBucketCommand: vi.fn(),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://r2-signed-url.com'),
}))

describe('Cloudflare R2 Storage Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear environment variables
    delete process.env.CLOUDFLARE_ACCOUNT_ID
    delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
    delete process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
    delete process.env.CLOUDFLARE_R2_BUCKET
  })

  describe('validateR2Config', () => {
    it('should pass when all required environment variables are set', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id'
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = 'test-access-key'
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'test-secret-key'
      process.env.CLOUDFLARE_R2_BUCKET = 'test-bucket'

      expect(() => validateR2Config()).not.toThrow()
    })

    it('should throw error when CLOUDFLARE_ACCOUNT_ID is missing', () => {
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = 'test-access-key'
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'test-secret-key'
      process.env.CLOUDFLARE_R2_BUCKET = 'test-bucket'

      expect(() => validateR2Config()).toThrow(
        'Missing required Cloudflare R2 environment variables: CLOUDFLARE_ACCOUNT_ID'
      )
    })

    it('should throw error when CLOUDFLARE_R2_ACCESS_KEY_ID is missing', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id'
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'test-secret-key'
      process.env.CLOUDFLARE_R2_BUCKET = 'test-bucket'

      expect(() => validateR2Config()).toThrow(
        'Missing required Cloudflare R2 environment variables: CLOUDFLARE_R2_ACCESS_KEY_ID'
      )
    })

    it('should throw error when CLOUDFLARE_R2_SECRET_ACCESS_KEY is missing', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id'
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = 'test-access-key'
      process.env.CLOUDFLARE_R2_BUCKET = 'test-bucket'

      expect(() => validateR2Config()).toThrow(
        'Missing required Cloudflare R2 environment variables: CLOUDFLARE_R2_SECRET_ACCESS_KEY'
      )
    })

    it('should throw error when CLOUDFLARE_R2_BUCKET is missing', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id'
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = 'test-access-key'
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'test-secret-key'

      expect(() => validateR2Config()).toThrow(
        'Missing required Cloudflare R2 environment variables: CLOUDFLARE_R2_BUCKET'
      )
    })

    it('should throw error when multiple variables are missing', () => {
      expect(() => validateR2Config()).toThrow(
        'Missing required Cloudflare R2 environment variables:'
      )
    })
  })

  describe('generateR2Key', () => {
    it('should generate correct R2 key for MIDI file', () => {
      const userId = 'user123'
      const fileName = 'test-song.mid'
      const fileType = 'midi'

      const key = generateR2Key(userId, fileName, fileType)

      expect(key).toMatch(/^midi\/user123\/\d+_test-song\.mid$/)
    })

    it('should generate correct R2 key for audio file', () => {
      const userId = 'user456'
      const fileName = 'test-audio.mp3'
      const fileType = 'audio'

      const key = generateR2Key(userId, fileName, fileType)

      expect(key).toMatch(/^audio\/user456\/\d+_test-audio\.mp3$/)
    })

    it('should generate correct R2 key for video file', () => {
      const userId = 'user789'
      const fileName = 'test-video.mp4'
      const fileType = 'video'

      const key = generateR2Key(userId, fileName, fileType)

      expect(key).toMatch(/^video\/user789\/\d+_test-video\.mp4$/)
    })

    it('should sanitize file name with special characters', () => {
      const userId = 'user789'
      const fileName = 'test file with spaces & symbols!.midi'
      const fileType = 'midi'

      const key = generateR2Key(userId, fileName, fileType)

      expect(key).toMatch(/^midi\/user789\/\d+_test_file_with_spaces___symbols_\.midi$/)
    })

    it('should include timestamp in the key', () => {
      const userId = 'user123'
      const fileName = 'test.mid'
      const fileType = 'midi'

      const key = generateR2Key(userId, fileName, fileType)
      
      // Should contain timestamp pattern
      expect(key).toMatch(/^midi\/user123\/\d+_test\.mid$/)
      
      // Extract and verify timestamp is recent (within last 5 seconds)
      const timestampMatch = key.match(/\/(\d+)_/)
      expect(timestampMatch).toBeTruthy()
      const timestamp = parseInt(timestampMatch![1])
      const now = Date.now()
      expect(timestamp).toBeGreaterThan(now - 5000) // Within 5 seconds
      expect(timestamp).toBeLessThanOrEqual(now)
    })
  })
}) 
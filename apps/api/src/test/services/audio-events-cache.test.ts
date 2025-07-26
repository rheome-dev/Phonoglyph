import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AudioEventsCacheService } from '../../services/audio-events-cache';
import { db } from '../../db/drizzle';
import { audioEventCache } from '../../db/schema';
import { eq } from 'drizzle-orm';

// Mock AudioTimeline for testing
const mockAudioTimeline = {
  events: [
    { timestamp: 0, type: 'onset', amplitude: 0.8 },
    { timestamp: 1.5, type: 'onset', amplitude: 0.6 },
    { timestamp: 3.2, type: 'onset', amplitude: 0.9 }
  ],
  duration: 5.0,
  sampleRate: 44100
};

describe('AudioEventsCacheService', () => {
  let service: AudioEventsCacheService;
  const testUserId = 'test-user-123';
  const testFileMetadataId = 'test-file-456';
  const testStemType = 'drums';

  beforeEach(() => {
    service = new AudioEventsCacheService();
  });

  afterEach(async () => {
    // Clean up test data
    await db
      .delete(audioEventCache)
      .where(eq(audioEventCache.userId, testUserId));
  });

  describe('cacheEvents', () => {
    it('should successfully cache audio events', async () => {
      await service.cacheEvents(
        testFileMetadataId,
        testStemType,
        testUserId,
        mockAudioTimeline
      );

      // Verify the data was cached
      const cached = await db
        .select()
        .from(audioEventCache)
        .where(eq(audioEventCache.userId, testUserId));

      expect(cached).toHaveLength(1);
      expect(cached[0].fileMetadataId).toBe(testFileMetadataId);
      expect(cached[0].stemType).toBe(testStemType);
      expect(cached[0].eventData).toEqual(mockAudioTimeline);
    });

    it('should handle caching errors gracefully', async () => {
      // Test with invalid data
      await expect(
        service.cacheEvents('', '', '', mockAudioTimeline)
      ).rejects.toThrow();
    });
  });

  describe('getCachedEvents', () => {
    beforeEach(async () => {
      // Set up test data
      await service.cacheEvents(
        testFileMetadataId,
        testStemType,
        testUserId,
        mockAudioTimeline
      );
    });

    it('should retrieve cached events successfully', async () => {
      const result = await service.getCachedEvents(
        testFileMetadataId,
        testStemType,
        testUserId
      );

      expect(result).toEqual(mockAudioTimeline);
    });

    it('should return null for non-existent cache', async () => {
      const result = await service.getCachedEvents(
        'non-existent-file',
        testStemType,
        testUserId
      );

      expect(result).toBeNull();
    });

    it('should return null for different user', async () => {
      const result = await service.getCachedEvents(
        testFileMetadataId,
        testStemType,
        'different-user'
      );

      expect(result).toBeNull();
    });
  });

  describe('updateCachedEvents', () => {
    const updatedTimeline = {
      ...mockAudioTimeline,
      events: [
        ...mockAudioTimeline.events,
        { timestamp: 4.0, type: 'onset', amplitude: 0.7 }
      ]
    };

    beforeEach(async () => {
      await service.cacheEvents(
        testFileMetadataId,
        testStemType,
        testUserId,
        mockAudioTimeline
      );
    });

    it('should update existing cached events', async () => {
      await service.updateCachedEvents(
        testFileMetadataId,
        testStemType,
        testUserId,
        updatedTimeline
      );

      const result = await service.getCachedEvents(
        testFileMetadataId,
        testStemType,
        testUserId
      );

      expect(result).toEqual(updatedTimeline);
    });

    it('should create new cache entry if none exists', async () => {
      await service.updateCachedEvents(
        'new-file-id',
        'bass',
        testUserId,
        updatedTimeline
      );

      const result = await service.getCachedEvents(
        'new-file-id',
        'bass',
        testUserId
      );

      expect(result).toEqual(updatedTimeline);
    });
  });

  describe('deleteCachedEvents', () => {
    beforeEach(async () => {
      // Cache events for multiple stem types
      await service.cacheEvents(testFileMetadataId, 'drums', testUserId, mockAudioTimeline);
      await service.cacheEvents(testFileMetadataId, 'bass', testUserId, mockAudioTimeline);
      await service.cacheEvents(testFileMetadataId, 'vocals', testUserId, mockAudioTimeline);
    });

    it('should delete specific stem type cache', async () => {
      await service.deleteCachedEvents(testFileMetadataId, testUserId, 'drums');

      const drumsResult = await service.getCachedEvents(testFileMetadataId, 'drums', testUserId);
      const bassResult = await service.getCachedEvents(testFileMetadataId, 'bass', testUserId);

      expect(drumsResult).toBeNull();
      expect(bassResult).toEqual(mockAudioTimeline);
    });

    it('should delete all cache entries for a file when no stem type specified', async () => {
      await service.deleteCachedEvents(testFileMetadataId, testUserId);

      const allCached = await service.getAllCachedEventsForFile(testFileMetadataId, testUserId);
      expect(allCached).toHaveLength(0);
    });
  });

  describe('isCached', () => {
    it('should return true for cached events', async () => {
      await service.cacheEvents(testFileMetadataId, testStemType, testUserId, mockAudioTimeline);

      const isCached = await service.isCached(testFileMetadataId, testStemType, testUserId);
      expect(isCached).toBe(true);
    });

    it('should return false for non-cached events', async () => {
      const isCached = await service.isCached('non-existent', testStemType, testUserId);
      expect(isCached).toBe(false);
    });
  });

  describe('getAllCachedEventsForFile', () => {
    beforeEach(async () => {
      await service.cacheEvents(testFileMetadataId, 'drums', testUserId, mockAudioTimeline);
      await service.cacheEvents(testFileMetadataId, 'bass', testUserId, mockAudioTimeline);
    });

    it('should return all cached events for a file', async () => {
      const allCached = await service.getAllCachedEventsForFile(testFileMetadataId, testUserId);

      expect(allCached).toHaveLength(2);
      expect(allCached.map(c => c.stemType)).toContain('drums');
      expect(allCached.map(c => c.stemType)).toContain('bass');
    });

    it('should return empty array for file with no cached events', async () => {
      const allCached = await service.getAllCachedEventsForFile('non-existent', testUserId);
      expect(allCached).toHaveLength(0);
    });
  });
});

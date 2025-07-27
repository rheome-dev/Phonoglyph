import { db } from '../db/drizzle';
import { audioEventCache } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import type { AudioTimeline } from 'phonoglyph-types';
import { randomUUID } from 'crypto';

/**
 * Type-safe Audio Events Cache Service using Drizzle ORM
 * Provides high-performance caching for audio analysis data
 */
export class AudioEventsCacheService {
  /**
   * Retrieve cached audio events for a specific file and stem type
   */
  async getCachedEvents(
    fileMetadataId: string,
    stemType: string,
    userId: string
  ): Promise<AudioTimeline | null> {
    try {
      const cached = await db
        .select()
        .from(audioEventCache)
        .where(
          and(
            eq(audioEventCache.fileMetadataId, fileMetadataId),
            eq(audioEventCache.stemType, stemType),
            eq(audioEventCache.userId, userId)
          )
        )
        .limit(1);

      return cached[0]?.eventData || null;
    } catch (error) {
      console.error('Error retrieving cached audio events:', error);
      throw new Error(`Failed to retrieve cached events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Cache audio events for a specific file and stem type
   */
  async cacheEvents(
    fileMetadataId: string,
    stemType: string,
    userId: string,
    timeline: AudioTimeline
  ): Promise<void> {
    try {
      await db.insert(audioEventCache).values({
        id: randomUUID(),
        fileMetadataId,
        stemType,
        userId,
        eventData: timeline,
        analysisVersion: '1.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error caching audio events:', error);
      throw new Error(`Failed to cache events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update existing cached events
   */
  async updateCachedEvents(
    fileMetadataId: string,
    stemType: string,
    userId: string,
    timeline: AudioTimeline
  ): Promise<void> {
    try {
      const updated = await db
        .update(audioEventCache)
        .set({
          eventData: timeline,
          analysisVersion: '1.0',
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(audioEventCache.fileMetadataId, fileMetadataId),
            eq(audioEventCache.stemType, stemType),
            eq(audioEventCache.userId, userId)
          )
        )
        .returning();

      if (!updated || updated.length === 0) {
        // If no existing record, create new one
        await this.cacheEvents(fileMetadataId, stemType, userId, timeline);
      }
    } catch (error) {
      console.error('Error updating cached audio events:', error);
      throw new Error(`Failed to update cached events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete cached events for a specific file
   */
  async deleteCachedEvents(
    fileMetadataId: string,
    userId: string,
    stemType?: string
  ): Promise<void> {
    try {
      const whereConditions = [
        eq(audioEventCache.fileMetadataId, fileMetadataId),
        eq(audioEventCache.userId, userId)
      ];

      if (stemType) {
        whereConditions.push(eq(audioEventCache.stemType, stemType));
      }

      await db
        .delete(audioEventCache)
        .where(and(...whereConditions));
    } catch (error) {
      console.error('Error deleting cached audio events:', error);
      throw new Error(`Failed to delete cached events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all cached events for a user's file
   */
  async getAllCachedEventsForFile(
    fileMetadataId: string,
    userId: string
  ): Promise<Array<{ stemType: string; timeline: AudioTimeline }>> {
    try {
      const cached = await db
        .select({
          stemType: audioEventCache.stemType,
          timeline: audioEventCache.eventData,
        })
        .from(audioEventCache)
        .where(
          and(
            eq(audioEventCache.fileMetadataId, fileMetadataId),
            eq(audioEventCache.userId, userId)
          )
        );

      return cached;
    } catch (error) {
      console.error('Error retrieving all cached audio events for file:', error);
      throw new Error(`Failed to retrieve cached events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if events are cached for a specific file and stem
   */
  async isCached(
    fileMetadataId: string,
    stemType: string,
    userId: string
  ): Promise<boolean> {
    try {
      const cached = await db
        .select({ id: audioEventCache.id })
        .from(audioEventCache)
        .where(
          and(
            eq(audioEventCache.fileMetadataId, fileMetadataId),
            eq(audioEventCache.stemType, stemType),
            eq(audioEventCache.userId, userId)
          )
        )
        .limit(1);

      return cached.length > 0;
    } catch (error) {
      console.error('Error checking cache status:', error);
      return false;
    }
  }
}

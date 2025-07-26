import { pgTable, text, jsonb, timestamp, index, uuid, integer, varchar, numeric } from 'drizzle-orm/pg-core';
import type { AudioTimeline } from 'phonoglyph-types';

/**
 * Audio Event Cache Table (existing table)
 * Stores pre-computed audio analysis data for fast retrieval
 * This maps to the existing audio_event_cache table in the database
 */
export const audioEventCache = pgTable('audio_event_cache', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  fileMetadataId: uuid('file_metadata_id').notNull(),
  stemType: text('stem_type').notNull(),
  eventData: jsonb('event_data').$type<AudioTimeline>().notNull(),
  analysisVersion: text('analysis_version').default('1.0').notNull(),
  createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).notNull(),
});

/**
 * Audio Analysis Cache Table (existing table)
 * Stores detailed audio analysis data for stems
 * This maps to the existing audio_analysis_cache table in the database
 */
export const audioAnalysisCache = pgTable('audio_analysis_cache', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  fileMetadataId: uuid('file_metadata_id').notNull(),
  stemType: varchar('stem_type', { length: 50 }).notNull(),
  analysisVersion: varchar('analysis_version', { length: 20 }).default('1.0').notNull(),
  sampleRate: integer('sample_rate').notNull(),
  duration: numeric('duration', { precision: 10, scale: 3 }).notNull(),
  bufferSize: integer('buffer_size').notNull(),
  featuresExtracted: text('features_extracted').array().notNull(),
  analysisData: jsonb('analysis_data').notNull(),
  waveformData: jsonb('waveform_data'),
  analysisDuration: integer('analysis_duration'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull(),
});

/**
 * Stem Separations Table (existing table)
 * Manages stem separation jobs and results
 * This maps to the existing stem_separations table in the database
 */
export const stemSeparations = pgTable('stem_separations', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  fileMetadataId: uuid('file_metadata_id').notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  errorMessage: text('error_message'),
  drumsStemKey: varchar('drums_stem_key', { length: 255 }),
  bassStemKey: varchar('bass_stem_key', { length: 255 }),
  vocalsStemKey: varchar('vocals_stem_key', { length: 255 }),
  otherStemKey: varchar('other_stem_key', { length: 255 }),
  modelVersion: varchar('model_version', { length: 50 }).default('spleeter:4stems-16kHz').notNull(),
  processingDuration: integer('processing_duration'),
  analysisStatus: varchar('analysis_status', { length: 20 }).default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull(),
  analysisCompletedAt: timestamp('analysis_completed_at', { withTimezone: true, mode: 'string' }),
});



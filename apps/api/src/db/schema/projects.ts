import { pgTable, text, jsonb, timestamp, uuid, index, integer, varchar, boolean } from 'drizzle-orm/pg-core';

/**
 * Projects Table - Core project management
 * Maps to existing 'projects' table in database
 */
export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  userId: uuid('user_id').notNull(),
  midiFilePath: text('midi_file_path'),
  audioFilePath: text('audio_file_path'),
  userVideoPath: text('user_video_path'),
  renderConfiguration: jsonb('render_configuration').default({}).notNull(),
  createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).notNull(),
  description: text('description'),
  genre: text('genre'),
  privacySetting: text('privacy_setting').default('private'),
  thumbnailUrl: text('thumbnail_url'),
  primaryMidiFileId: uuid('primary_midi_file_id'),
});

/**
 * File Metadata Table - Stores metadata for all uploaded files
 * Maps to existing 'file_metadata' table in database
 */
export const fileMetadata = pgTable('file_metadata', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileType: text('file_type').notNull(), // This is an enum in the DB
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  fileSize: integer('file_size').notNull(),
  s3Key: varchar('s3_key', { length: 512 }).notNull(),
  s3Bucket: varchar('s3_bucket', { length: 255 }).notNull(),
  processingStatus: text('processing_status').default('pending').notNull(),
  uploadStatus: text('upload_status').default('uploading').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  projectId: text('project_id'),
  assetType: text('asset_type'),
  usageStatus: text('usage_status').default('active'),
  isPrimary: boolean('is_primary').default(false).notNull(),
  replacementHistory: jsonb('replacement_history').default([]),
  folderId: uuid('folder_id'),
  isMaster: boolean('is_master').default(false).notNull(),
  stemType: varchar('stem_type', { length: 32 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull(),
});

/**
 * MIDI Files Table - Stores parsed MIDI metadata and analysis results
 * Maps to existing 'midi_files' table in database
 */
export const midiFiles = pgTable('midi_files', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  fileKey: varchar('file_key', { length: 255 }).notNull(),
  originalFilename: varchar('original_filename', { length: 255 }).notNull(),
  fileSize: integer('file_size').notNull(),
  durationSeconds: integer('duration_seconds'),
  trackCount: integer('track_count'),
  noteCount: integer('note_count'),
  timeSignature: text('time_signature'),
  keySignature: text('key_signature'),
  tempoBpm: integer('tempo_bpm'),
  parsingStatus: text('parsing_status').default('pending').notNull(),
  parsedData: jsonb('parsed_data'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull(),
});

/**
 * Drizzle ORM Schema Definitions
 * Centralized export of all database schemas with proper TypeScript types
 */

// Audio-related schemas
export * from './audio-events';

// Project and file management schemas
export * from './projects';

// User and collaboration schemas
export * from './users';

// Re-export all tables for easy access
import { audioEventCache, audioAnalysisCache, stemSeparations } from './audio-events';
import { projects, fileMetadata, midiFiles } from './projects';
import { userProfiles, auditLogs, projectCollaborators, projectShares } from './users';

export const schema = {
  // Audio processing tables
  audioEventCache,
  audioAnalysisCache,
  stemSeparations,

  // Project management tables
  projects,
  fileMetadata,
  midiFiles,

  // User and collaboration tables
  userProfiles,
  auditLogs,
  projectCollaborators,
  projectShares,
} as const;

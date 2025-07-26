import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

// Database connection configuration
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create postgres client with connection pooling
const client = postgres(connectionString, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
});

// Create Drizzle database instance with schema
export const db = drizzle(client, { schema });

// Type exports for use across application

// Audio processing types
export type AudioEventCacheSelect = typeof schema.audioEventCache.$inferSelect;
export type AudioEventCacheInsert = typeof schema.audioEventCache.$inferInsert;

export type AudioAnalysisCacheSelect = typeof schema.audioAnalysisCache.$inferSelect;
export type AudioAnalysisCacheInsert = typeof schema.audioAnalysisCache.$inferInsert;

export type StemSeparationSelect = typeof schema.stemSeparations.$inferSelect;
export type StemSeparationInsert = typeof schema.stemSeparations.$inferInsert;

// Project management types
export type ProjectSelect = typeof schema.projects.$inferSelect;
export type ProjectInsert = typeof schema.projects.$inferInsert;

export type FileMetadataSelect = typeof schema.fileMetadata.$inferSelect;
export type FileMetadataInsert = typeof schema.fileMetadata.$inferInsert;

export type MidiFileSelect = typeof schema.midiFiles.$inferSelect;
export type MidiFileInsert = typeof schema.midiFiles.$inferInsert;

// User and collaboration types
export type UserProfileSelect = typeof schema.userProfiles.$inferSelect;
export type UserProfileInsert = typeof schema.userProfiles.$inferInsert;

export type AuditLogSelect = typeof schema.auditLogs.$inferSelect;
export type AuditLogInsert = typeof schema.auditLogs.$inferInsert;

export type ProjectCollaboratorSelect = typeof schema.projectCollaborators.$inferSelect;
export type ProjectCollaboratorInsert = typeof schema.projectCollaborators.$inferInsert;

export type ProjectShareSelect = typeof schema.projectShares.$inferSelect;
export type ProjectShareInsert = typeof schema.projectShares.$inferInsert;

// Database connection test function
export async function testDrizzleConnection() {
  try {
    const result = await db.execute(sql`SELECT NOW()`);
    console.log('✅ Drizzle database connected successfully:', result);
    return true;
  } catch (err) {
    console.error('❌ Drizzle database connection failed:', err);
    return false;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('📡 Closing Drizzle database connection...');
  await client.end();
  process.exit(0);
});

export default db;

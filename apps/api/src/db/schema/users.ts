import { pgTable, text, jsonb, timestamp, uuid, index, integer, varchar, boolean } from 'drizzle-orm/pg-core';

/**
 * User Profiles Table - Extended user information
 * Maps to existing 'user_profiles' table in database
 */
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  displayName: varchar('display_name', { length: 100 }),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  website: text('website'),
  location: text('location'),
  preferences: jsonb('preferences').default({}),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull(),
});

/**
 * Audit Logs Table - System activity tracking
 * Maps to existing 'audit_logs' table in database
 */
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id'),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }),
  resourceId: text('resource_id'),
  metadata: jsonb('metadata').default({}),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
});

/**
 * Project Collaborators Table - Project sharing and collaboration
 * Maps to existing 'project_collaborators' table in database
 */
export const projectCollaborators = pgTable('project_collaborators', {
  id: uuid('id').primaryKey(),
  projectId: text('project_id').notNull(),
  userId: uuid('user_id').notNull(),
  role: varchar('role', { length: 20 }).default('viewer').notNull(),
  permissions: jsonb('permissions').default({}),
  invitedBy: uuid('invited_by').notNull(),
  invitedAt: timestamp('invited_at', { withTimezone: true, mode: 'string' }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true, mode: 'string' }),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull(),
});

/**
 * Project Shares Table - Public project sharing
 * Maps to existing 'project_shares' table in database
 */
export const projectShares = pgTable('project_shares', {
  id: uuid('id').primaryKey(),
  projectId: text('project_id').notNull(),
  shareToken: varchar('share_token', { length: 64 }).notNull(),
  shareType: varchar('share_type', { length: 20 }).default('view').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }),
  accessCount: integer('access_count').default(0).notNull(),
  maxAccess: integer('max_access'),
  isActive: boolean('is_active').default(true).notNull(),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true, mode: 'string' }),
});

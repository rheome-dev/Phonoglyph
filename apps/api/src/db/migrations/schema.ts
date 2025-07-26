import { pgTable, unique, serial, varchar, timestamp, index, foreignKey, pgPolicy, text, uuid, jsonb, integer, boolean, type AnyPgColumn, check, inet, uniqueIndex, numeric, interval, bigint, doublePrecision, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const exportStatus = pgEnum("export_status", ['queued', 'rendering', 'uploading', 'completed', 'failed', 'cancelled'])
export const fileTypeEnum = pgEnum("file_type_enum", ['midi', 'audio', 'video', 'image'])


export const migrations = pgTable("migrations", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	executedAt: timestamp("executed_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("migrations_name_key").on(table.name),
]);

export const editStates = pgTable("edit_states", {
	id: text().default((uuid_generate_v4())).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	projectId: text("project_id").notNull(),
	timestamp: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	data: jsonb().notNull(),
	version: integer().default(1).notNull(),
	isCurrent: boolean("is_current").default(false).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_edit_states_current").using("btree", table.isCurrent.asc().nullsLast().op("bool_ops")).where(sql`(is_current = true)`),
	index("idx_edit_states_timestamp").using("btree", table.timestamp.asc().nullsLast().op("timestamp_ops")),
	index("idx_edit_states_user_project").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.projectId.asc().nullsLast().op("uuid_ops")),
	index("idx_edit_states_version").using("btree", table.version.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "edit_states_project_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "edit_states_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can access own edit states", { as: "permissive", for: "all", to: ["public"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("Users can view project edit states", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const projects = pgTable("projects", {
	id: text().default((uuid_generate_v4())).primaryKey().notNull(),
	name: text().notNull(),
	userId: uuid("user_id").notNull(),
	midiFilePath: text("midi_file_path"),
	audioFilePath: text("audio_file_path"),
	userVideoPath: text("user_video_path"),
	renderConfiguration: jsonb("render_configuration").default({}).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	description: text(),
	genre: text(),
	privacySetting: text("privacy_setting").default('private'),
	thumbnailUrl: text("thumbnail_url"),
	primaryMidiFileId: uuid("primary_midi_file_id"),
}, (table) => [
	index("idx_projects_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_projects_genre").using("btree", table.genre.asc().nullsLast().op("text_ops")),
	index("idx_projects_privacy").using("btree", table.privacySetting.asc().nullsLast().op("text_ops")),
	index("idx_projects_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_projects_user_privacy").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.privacySetting.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.primaryMidiFileId],
			foreignColumns: [fileMetadata.id],
			name: "fk_projects_primary_midi_file"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "projects_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("project_owner_access", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("public_project_access", { as: "permissive", for: "select", to: ["anon", "authenticated"] }),
	check("projects_privacy_setting_check", sql`privacy_setting = ANY (ARRAY['private'::text, 'unlisted'::text, 'public'::text])`),
]);

export const projectShares = pgTable("project_shares", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	shareToken: text("share_token").notNull(),
	accessType: text("access_type").default('view'),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	viewCount: integer("view_count").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_project_shares_project").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
	index("idx_project_shares_token").using("btree", table.shareToken.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_shares_project_id_fkey"
		}).onDelete("cascade"),
	unique("project_shares_share_token_key").on(table.shareToken),
	pgPolicy("Users can manage own project shares", { as: "permissive", for: "all", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.id = project_shares.project_id) AND (projects.user_id = auth.uid()))))` }),
	pgPolicy("Public access to shared projects", { as: "permissive", for: "select", to: ["anon", "authenticated"] }),
	check("project_shares_access_type_check", sql`access_type = ANY (ARRAY['view'::text, 'embed'::text])`),
]);

export const userProfiles = pgTable("user_profiles", {
	id: uuid().primaryKey().notNull(),
	displayName: text("display_name"),
	avatarUrl: text("avatar_url"),
	bio: text(),
	preferences: jsonb().default({}),
	subscriptionTier: text("subscription_tier").default('free'),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_user_profiles_display_name").using("btree", table.displayName.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.id],
			foreignColumns: [users.id],
			name: "user_profiles_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can view all profiles", { as: "permissive", for: "select", to: ["public"], using: sql`true` }),
	pgPolicy("Users can manage their own profile", { as: "permissive", for: "all", to: ["public"] }),
	check("user_profiles_subscription_tier_check", sql`subscription_tier = ANY (ARRAY['free'::text, 'premium'::text, 'enterprise'::text])`),
]);

export const auditLogs = pgTable("audit_logs", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id"),
	action: text().notNull(),
	resourceType: text("resource_type").notNull(),
	resourceId: text("resource_id"),
	metadata: jsonb().default({}),
	ipAddress: inet("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_audit_logs_action").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("idx_audit_logs_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_audit_logs_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "audit_logs_user_id_fkey"
		}).onDelete("set null"),
	pgPolicy("Users can view their own audit logs", { as: "permissive", for: "select", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("System can insert audit logs", { as: "permissive", for: "insert", to: ["public"] }),
]);

export const visualizationSettings = pgTable("visualization_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	midiFileId: uuid("midi_file_id").notNull(),
	colorScheme: varchar("color_scheme", { length: 20 }).default('mixed').notNull(),
	pixelsPerSecond: integer("pixels_per_second").default(50).notNull(),
	showTrackLabels: boolean("show_track_labels").default(true).notNull(),
	showVelocity: boolean("show_velocity").default(true).notNull(),
	minKey: integer("min_key").default(21).notNull(),
	maxKey: integer("max_key").default(108).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_visualization_settings_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_visualization_settings_midi_file_id").using("btree", table.midiFileId.asc().nullsLast().op("uuid_ops")),
	index("idx_visualization_settings_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("idx_visualization_settings_user_midi_file").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.midiFileId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.midiFileId],
			foreignColumns: [midiFiles.id],
			name: "visualization_settings_midi_file_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "visualization_settings_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can access own visualization settings", { as: "permissive", for: "all", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	check("valid_key_range", sql`min_key <= max_key`),
	check("visualization_settings_color_scheme_check", sql`(color_scheme)::text = ANY ((ARRAY['sage'::character varying, 'slate'::character varying, 'dusty-rose'::character varying, 'mixed'::character varying])::text[])`),
	check("visualization_settings_max_key_check", sql`(max_key >= 0) AND (max_key <= 127)`),
	check("visualization_settings_min_key_check", sql`(min_key >= 0) AND (min_key <= 127)`),
	check("visualization_settings_pixels_per_second_check", sql`(pixels_per_second >= 10) AND (pixels_per_second <= 200)`),
]);

export const midiFiles = pgTable("midi_files", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	fileKey: varchar("file_key", { length: 255 }).notNull(),
	originalFilename: varchar("original_filename", { length: 255 }).notNull(),
	fileSize: integer("file_size").notNull(),
	durationSeconds: numeric("duration_seconds", { precision: 10, scale:  3 }),
	trackCount: integer("track_count"),
	noteCount: integer("note_count"),
	timeSignature: varchar("time_signature", { length: 10 }),
	keySignature: varchar("key_signature", { length: 10 }),
	tempoBpm: integer("tempo_bpm"),
	parsingStatus: varchar("parsing_status", { length: 20 }).default('pending').notNull(),
	parsedData: jsonb("parsed_data"),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_midi_files_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_midi_files_duration").using("btree", table.durationSeconds.asc().nullsLast().op("numeric_ops")),
	index("idx_midi_files_file_key").using("btree", table.fileKey.asc().nullsLast().op("text_ops")),
	index("idx_midi_files_parsed_data").using("gin", table.parsedData.asc().nullsLast().op("jsonb_ops")),
	index("idx_midi_files_parsing_status").using("btree", table.parsingStatus.asc().nullsLast().op("text_ops")),
	uniqueIndex("idx_midi_files_user_file_key").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.fileKey.asc().nullsLast().op("uuid_ops")),
	index("idx_midi_files_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "midi_files_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can access own MIDI files", { as: "permissive", for: "all", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	check("midi_files_parsing_status_check", sql`(parsing_status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])`),
]);

export const projectCollaborators = pgTable("project_collaborators", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: text().default('viewer').notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_project_collaborators_project_id").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
	index("idx_project_collaborators_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_collaborators_project_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "project_collaborators_user_id_fkey"
		}).onDelete("cascade"),
	unique("project_collaborators_project_id_user_id_key").on(table.projectId, table.userId),
	pgPolicy("collaborator_owner_access", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(project_id IN ( SELECT projects.id
   FROM projects
  WHERE (projects.user_id = auth.uid())))` }),
	pgPolicy("collaborator_self_access", { as: "permissive", for: "select", to: ["authenticated"] }),
	check("project_collaborators_role_check", sql`role = ANY (ARRAY['owner'::text, 'editor'::text, 'viewer'::text])`),
]);

export const eventBasedMappings = pgTable("event_based_mappings", {
	id: text().default((uuid_generate_v4())).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	projectId: text("project_id").notNull(),
	eventType: text("event_type").notNull(),
	targetParameter: text("target_parameter").notNull(),
	mappingConfig: jsonb("mapping_config").notNull(),
	enabled: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_event_based_mappings_enabled").using("btree", table.enabled.asc().nullsLast().op("bool_ops")).where(sql`(enabled = true)`),
	index("idx_event_based_mappings_event").using("btree", table.eventType.asc().nullsLast().op("text_ops")),
	index("idx_event_based_mappings_project").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
	uniqueIndex("idx_event_based_mappings_unique").using("btree", table.projectId.asc().nullsLast().op("text_ops"), table.eventType.asc().nullsLast().op("text_ops"), table.targetParameter.asc().nullsLast().op("text_ops")),
	index("idx_event_based_mappings_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "event_based_mappings_project_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "event_based_mappings_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can access own event mappings", { as: "permissive", for: "all", to: ["public"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("Users can view project event mappings", { as: "permissive", for: "select", to: ["authenticated"] }),
	check("event_based_mappings_event_type_check", sql`event_type = ANY (ARRAY['transient'::text, 'chroma'::text, 'volume'::text, 'brightness'::text])`),
]);

export const assetUsage = pgTable("asset_usage", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	fileId: uuid("file_id").notNull(),
	projectId: text("project_id").notNull(),
	usageType: text("usage_type").notNull(),
	usageContext: jsonb("usage_context").default({}),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	endedAt: timestamp("ended_at", { withTimezone: true, mode: 'string' }),
	sessionDuration: interval("session_duration").generatedAlwaysAs(sql`(ended_at - started_at)`),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_asset_usage_file_project").using("btree", table.fileId.asc().nullsLast().op("text_ops"), table.projectId.asc().nullsLast().op("text_ops")),
	index("idx_asset_usage_type_date").using("btree", table.usageType.asc().nullsLast().op("text_ops"), table.startedAt.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.fileId],
			foreignColumns: [fileMetadata.id],
			name: "asset_usage_file_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "asset_usage_project_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can access own asset usage", { as: "permissive", for: "all", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.id = asset_usage.project_id) AND (projects.user_id = auth.uid()))))` }),
	check("asset_usage_usage_type_check", sql`usage_type = ANY (ARRAY['visualizer'::text, 'composition'::text, 'export'::text])`),
]);

export const projectStorageQuotas = pgTable("project_storage_quotas", {
	projectId: text("project_id").primaryKey().notNull(),
	userSubscriptionTier: text("user_subscription_tier").default('free').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	totalLimitBytes: bigint("total_limit_bytes", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	usedBytes: bigint("used_bytes", { mode: "number" }).default(0),
	fileCountLimit: integer("file_count_limit").notNull(),
	fileCountUsed: integer("file_count_used").default(0),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	perFileSizeLimit: bigint("per_file_size_limit", { mode: "number" }).notNull(),
	lastCalculatedAt: timestamp("last_calculated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_storage_quotas_project_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can access own storage quotas", { as: "permissive", for: "all", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.id = project_storage_quotas.project_id) AND (projects.user_id = auth.uid()))))` }),
]);

export const assetFolders = pgTable("asset_folders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	name: text().notNull(),
	description: text(),
	parentFolderId: uuid("parent_folder_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_asset_folders_project").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.parentFolderId],
			foreignColumns: [table.id],
			name: "asset_folders_parent_folder_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "asset_folders_project_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can access own asset folders", { as: "permissive", for: "all", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.id = asset_folders.project_id) AND (projects.user_id = auth.uid()))))` }),
]);

export const assetTags = pgTable("asset_tags", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: text("project_id").notNull(),
	name: text().notNull(),
	color: text().default('#3B82F6'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_asset_tags_project").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "asset_tags_project_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can access own asset tags", { as: "permissive", for: "all", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.id = asset_tags.project_id) AND (projects.user_id = auth.uid()))))` }),
]);

export const assetTagRelationships = pgTable("asset_tag_relationships", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	fileId: uuid("file_id").notNull(),
	tagId: uuid("tag_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_asset_tag_relationships_file").using("btree", table.fileId.asc().nullsLast().op("uuid_ops")),
	index("idx_asset_tag_relationships_tag").using("btree", table.tagId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.fileId],
			foreignColumns: [fileMetadata.id],
			name: "asset_tag_relationships_file_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tagId],
			foreignColumns: [assetTags.id],
			name: "asset_tag_relationships_tag_id_fkey"
		}).onDelete("cascade"),
	unique("asset_tag_relationships_file_id_tag_id_key").on(table.fileId, table.tagId),
	pgPolicy("Users can access own asset tag relationships", { as: "permissive", for: "all", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM (file_metadata fm
     JOIN projects p ON ((fm.project_id = p.id)))
  WHERE ((fm.id = asset_tag_relationships.file_id) AND (p.user_id = auth.uid()))))` }),
]);

export const audioEventCache = pgTable("audio_event_cache", {
	id: text().default((uuid_generate_v4())).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	fileMetadataId: uuid("file_metadata_id").notNull(),
	stemType: text("stem_type").notNull(),
	eventData: jsonb("event_data").notNull(),
	analysisVersion: text("analysis_version").default('1.0').notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_audio_event_cache_file").using("btree", table.fileMetadataId.asc().nullsLast().op("text_ops"), table.stemType.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("idx_audio_event_cache_unique").using("btree", table.fileMetadataId.asc().nullsLast().op("uuid_ops"), table.stemType.asc().nullsLast().op("text_ops"), table.analysisVersion.asc().nullsLast().op("uuid_ops")),
	index("idx_audio_event_cache_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_audio_event_cache_version").using("btree", table.analysisVersion.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.fileMetadataId],
			foreignColumns: [fileMetadata.id],
			name: "audio_event_cache_file_metadata_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "audio_event_cache_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can access own audio event cache", { as: "permissive", for: "all", to: ["public"], using: sql`(user_id = auth.uid())` }),
]);

export const stemSeparationJobs = pgTable("stem_separation_jobs", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	fileKey: text("file_key").notNull(),
	status: text().notNull(),
	config: jsonb().notNull(),
	progress: integer().default(0).notNull(),
	estimatedTimeRemaining: integer("estimated_time_remaining"),
	results: jsonb(),
	error: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "stem_separation_jobs_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can view their own stem separation jobs", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("Users can create their own stem separation jobs", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("Users can update their own stem separation jobs", { as: "permissive", for: "update", to: ["authenticated"] }),
	check("stem_separation_jobs_status_check", sql`status = ANY (ARRAY['queued'::text, 'processing'::text, 'completed'::text, 'failed'::text])`),
]);

export const fileMetadata = pgTable("file_metadata", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	fileType: fileTypeEnum("file_type").notNull(),
	mimeType: varchar("mime_type", { length: 100 }).notNull(),
	fileSize: integer("file_size").notNull(),
	s3Key: varchar("s3_key", { length: 255 }).notNull(),
	s3Bucket: varchar("s3_bucket", { length: 255 }).notNull(),
	uploadStatus: varchar("upload_status", { length: 20 }).default('uploading').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	videoMetadata: jsonb("video_metadata"),
	imageMetadata: jsonb("image_metadata"),
	thumbnailUrl: text("thumbnail_url"),
	processingStatus: text("processing_status").default('completed'),
	projectId: text("project_id"),
	assetType: text("asset_type"),
	isPrimary: boolean("is_primary").default(false),
	durationSeconds: doublePrecision("duration_seconds"),
	usageStatus: text("usage_status").default('unused'),
	lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: 'string' }),
	replacementHistory: jsonb("replacement_history").default([]),
	folderId: uuid("folder_id"),
	isMaster: boolean("is_master").default(false).notNull(),
	stemType: varchar("stem_type", { length: 32 }),
}, (table) => [
	index("idx_file_metadata_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_file_metadata_file_type").using("btree", table.fileType.asc().nullsLast().op("enum_ops")),
	index("idx_file_metadata_is_master").using("btree", table.isMaster.asc().nullsLast().op("bool_ops")),
	index("idx_file_metadata_is_primary").using("btree", table.isPrimary.asc().nullsLast().op("bool_ops")).where(sql`(is_primary = true)`),
	index("idx_file_metadata_processing_status").using("btree", table.processingStatus.asc().nullsLast().op("text_ops")),
	index("idx_file_metadata_project").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
	index("idx_file_metadata_project_type").using("btree", table.projectId.asc().nullsLast().op("text_ops"), table.assetType.asc().nullsLast().op("text_ops")),
	index("idx_file_metadata_stem_type").using("btree", table.stemType.asc().nullsLast().op("text_ops")),
	index("idx_file_metadata_thumbnail_url").using("btree", table.thumbnailUrl.asc().nullsLast().op("text_ops")).where(sql`(thumbnail_url IS NOT NULL)`),
	index("idx_file_metadata_usage_status").using("btree", table.usageStatus.asc().nullsLast().op("text_ops")),
	index("idx_file_metadata_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.folderId],
			foreignColumns: [assetFolders.id],
			name: "file_metadata_folder_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "file_metadata_project_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "file_metadata_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Project members can access project files", { as: "permissive", for: "all", to: ["public"], using: sql`((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.id = file_metadata.project_id) AND (projects.user_id = auth.uid())))))` }),
	check("file_metadata_asset_type_check", sql`asset_type = ANY (ARRAY['midi'::text, 'audio'::text, 'video'::text, 'image'::text])`),
	check("file_metadata_processing_status_check", sql`processing_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])`),
	check("file_metadata_upload_status_check", sql`(upload_status)::text = ANY ((ARRAY['uploading'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])`),
	check("file_metadata_usage_status_check", sql`usage_status = ANY (ARRAY['active'::text, 'referenced'::text, 'unused'::text])`),
]);

export const stemSeparations = pgTable("stem_separations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	fileMetadataId: uuid("file_metadata_id").notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	errorMessage: text("error_message"),
	drumsStemKey: varchar("drums_stem_key", { length: 255 }),
	bassStemKey: varchar("bass_stem_key", { length: 255 }),
	vocalsStemKey: varchar("vocals_stem_key", { length: 255 }),
	otherStemKey: varchar("other_stem_key", { length: 255 }),
	modelVersion: varchar("model_version", { length: 50 }).default('5stems').notNull(),
	processingDuration: integer("processing_duration"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	analysisStatus: varchar("analysis_status", { length: 20 }).default('pending'),
	analysisCompletedAt: timestamp("analysis_completed_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_stem_separations_analysis_status").using("btree", table.analysisStatus.asc().nullsLast().op("text_ops")),
	index("idx_stem_separations_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	uniqueIndex("idx_stem_separations_file").using("btree", table.fileMetadataId.asc().nullsLast().op("text_ops"), table.modelVersion.asc().nullsLast().op("text_ops")),
	index("idx_stem_separations_file_metadata_id").using("btree", table.fileMetadataId.asc().nullsLast().op("uuid_ops")),
	index("idx_stem_separations_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_stem_separations_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.fileMetadataId],
			foreignColumns: [fileMetadata.id],
			name: "stem_separations_file_metadata_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "stem_separations_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can access own stem separations", { as: "permissive", for: "all", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	check("stem_separations_analysis_status_check", sql`(analysis_status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])`),
	check("stem_separations_status_check", sql`(status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])`),
]);

export const exportJobs = pgTable("export_jobs", {
	id: text().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	compositionId: text("composition_id").notNull(),
	config: jsonb().notNull(),
	status: exportStatus().default('queued').notNull(),
	progress: doublePrecision().default(0).notNull(),
	errorMessage: text("error_message"),
	downloadUrl: text("download_url"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fileSize: bigint("file_size", { mode: "number" }),
	durationSeconds: doublePrecision("duration_seconds"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_export_jobs_composition_id").using("btree", table.compositionId.asc().nullsLast().op("text_ops")),
	index("idx_export_jobs_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_export_jobs_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("idx_export_jobs_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "export_jobs_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can view their own export jobs", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(auth.uid() = user_id)` }),
	pgPolicy("Users can create their own export jobs", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("Users can update their own export jobs", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("Users can delete their own export jobs", { as: "permissive", for: "delete", to: ["authenticated"] }),
	check("export_jobs_progress_check", sql`(progress >= (0)::double precision) AND (progress <= (1)::double precision)`),
]);

export const audioAnalysisCache = pgTable("audio_analysis_cache", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	fileMetadataId: uuid("file_metadata_id").notNull(),
	stemType: varchar("stem_type", { length: 50 }).notNull(),
	analysisVersion: varchar("analysis_version", { length: 20 }).default('1.0').notNull(),
	sampleRate: integer("sample_rate").notNull(),
	duration: numeric({ precision: 10, scale:  3 }).notNull(),
	bufferSize: integer("buffer_size").notNull(),
	featuresExtracted: text("features_extracted").array().notNull(),
	analysisData: jsonb("analysis_data").notNull(),
	waveformData: jsonb("waveform_data"),
	analysisDuration: integer("analysis_duration"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_audio_analysis_cache_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_audio_analysis_cache_file_metadata_id").using("btree", table.fileMetadataId.asc().nullsLast().op("uuid_ops")),
	index("idx_audio_analysis_cache_stem_type").using("btree", table.stemType.asc().nullsLast().op("text_ops")),
	uniqueIndex("idx_audio_analysis_cache_unique").using("btree", table.fileMetadataId.asc().nullsLast().op("text_ops"), table.stemType.asc().nullsLast().op("text_ops"), table.analysisVersion.asc().nullsLast().op("uuid_ops")),
	index("idx_audio_analysis_cache_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.fileMetadataId],
			foreignColumns: [fileMetadata.id],
			name: "audio_analysis_cache_file_metadata_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "audio_analysis_cache_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can access own audio analysis cache", { as: "permissive", for: "all", to: ["public"], using: sql`(auth.uid() = user_id)` }),
]);

export const audioAnalysisJobs = pgTable("audio_analysis_jobs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	fileMetadataId: uuid("file_metadata_id").notNull(),
	status: text().default('pending').notNull(),
	error: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_audio_analysis_jobs_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_audio_analysis_jobs_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.fileMetadataId],
			foreignColumns: [fileMetadata.id],
			name: "audio_analysis_jobs_file_metadata_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "audio_analysis_jobs_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can manage their own audio analysis jobs", { as: "permissive", for: "all", to: ["public"], using: sql`(auth.uid() = user_id)` }),
	check("audio_analysis_jobs_status_check", sql`status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])`),
]);

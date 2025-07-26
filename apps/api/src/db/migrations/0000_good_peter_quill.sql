CREATE TABLE "audio_analysis_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"file_metadata_id" uuid NOT NULL,
	"stem_type" text NOT NULL,
	"analysis_version" text DEFAULT '1.0' NOT NULL,
	"sample_rate" integer NOT NULL,
	"duration" integer NOT NULL,
	"buffer_size" integer NOT NULL,
	"features_extracted" text[] NOT NULL,
	"analysis_data" jsonb NOT NULL,
	"waveform_data" jsonb,
	"analysis_duration" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audio_events_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"file_metadata_id" text NOT NULL,
	"user_id" text NOT NULL,
	"stem_type" text NOT NULL,
	"timeline" jsonb NOT NULL,
	"processing_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_metadata" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"s3_key" text NOT NULL,
	"s3_bucket" text NOT NULL,
	"processing_status" text DEFAULT 'pending' NOT NULL,
	"thumbnail_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "midi_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"file_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"file_size" integer NOT NULL,
	"duration_seconds" integer,
	"track_count" integer,
	"note_count" integer,
	"time_signature" text,
	"key_signature" text,
	"tempo_bpm" integer,
	"parsing_status" text DEFAULT 'pending' NOT NULL,
	"parsed_data" jsonb,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"privacy_setting" text DEFAULT 'private' NOT NULL,
	"user_id" uuid NOT NULL,
	"midi_file_path" text NOT NULL,
	"audio_file_path" text,
	"user_video_path" text,
	"render_configuration" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_audio_analysis_user_file" ON "audio_analysis_cache" USING btree ("user_id","file_metadata_id");--> statement-breakpoint
CREATE INDEX "idx_audio_analysis_stem_type" ON "audio_analysis_cache" USING btree ("stem_type");--> statement-breakpoint
CREATE INDEX "idx_audio_analysis_created_at" ON "audio_analysis_cache" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_audio_events_lookup" ON "audio_events_cache" USING btree ("file_metadata_id","stem_type","processing_version");--> statement-breakpoint
CREATE INDEX "idx_audio_events_user" ON "audio_events_cache" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audio_events_stem_type" ON "audio_events_cache" USING btree ("stem_type");--> statement-breakpoint
CREATE INDEX "idx_audio_events_created_at" ON "audio_events_cache" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_file_metadata_user" ON "file_metadata" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_file_metadata_s3_key" ON "file_metadata" USING btree ("s3_key");--> statement-breakpoint
CREATE INDEX "idx_file_metadata_file_type" ON "file_metadata" USING btree ("file_type");--> statement-breakpoint
CREATE INDEX "idx_file_metadata_processing_status" ON "file_metadata" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX "idx_file_metadata_created_at" ON "file_metadata" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_midi_files_user" ON "midi_files" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_midi_files_file_key" ON "midi_files" USING btree ("file_key");--> statement-breakpoint
CREATE INDEX "idx_midi_files_parsing_status" ON "midi_files" USING btree ("parsing_status");--> statement-breakpoint
CREATE INDEX "idx_midi_files_created_at" ON "midi_files" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_midi_files_duration" ON "midi_files" USING btree ("duration_seconds");--> statement-breakpoint
CREATE INDEX "idx_projects_user" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_projects_created_at" ON "projects" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_projects_privacy" ON "projects" USING btree ("privacy_setting");
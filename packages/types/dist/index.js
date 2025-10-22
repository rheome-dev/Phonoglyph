"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeUser = exports.transformSupabaseUser = exports.DEFAULT_VISUALIZATION_SETTINGS = exports.COLOR_SCHEMES = exports.signupCredentialsSchema = exports.loginCredentialsSchema = exports.updateProjectSchema = exports.createProjectSchema = void 0;
const zod_1 = require("zod");
// ===== VALIDATION SCHEMAS =====
exports.createProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Project name is required').max(100, 'Project name too long'),
    description: zod_1.z.string().max(500, 'Description too long').optional(),
    privacy_setting: zod_1.z.enum(['private', 'unlisted', 'public']).default('private'),
    midi_file_path: zod_1.z.string().optional(),
    audio_file_path: zod_1.z.string().optional(),
    user_video_path: zod_1.z.string().optional(),
    render_configuration: zod_1.z.record(zod_1.z.any()).default({}),
});
exports.updateProjectSchema = zod_1.z.object({
    id: zod_1.z.string().min(1, 'Project ID is required'),
    name: zod_1.z.string().min(1, 'Project name is required').max(100, 'Project name too long').optional(),
    description: zod_1.z.string().max(500, 'Description too long').optional(),
    privacy_setting: zod_1.z.enum(['private', 'unlisted', 'public']).optional(),
    thumbnail_url: zod_1.z.string().url('Invalid thumbnail URL').optional(),
    primary_midi_file_id: zod_1.z.string().uuid('Invalid file ID').optional(),
    audio_file_path: zod_1.z.string().optional(),
    user_video_path: zod_1.z.string().optional(),
    render_configuration: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.loginCredentialsSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
exports.signupCredentialsSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    name: zod_1.z.string().min(1, 'Name is required').optional(),
});
// Color scheme mappings
exports.COLOR_SCHEMES = {
    sage: '#84a98c',
    slate: '#6b7c93',
    'dusty-rose': '#b08a8a',
    mixed: ['#84a98c', '#6b7c93', '#b08a8a', '#a8a29e', '#8da3b0']
};
// Default visualization settings
exports.DEFAULT_VISUALIZATION_SETTINGS = {
    colorScheme: 'mixed',
    pixelsPerSecond: 50,
    showTrackLabels: true,
    showVelocity: true,
    minKey: 21,
    maxKey: 108
};
// ===== UTILITY FUNCTIONS =====
// Helper to convert Supabase user to our User type
function transformSupabaseUser(supabaseUser) {
    return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.user_metadata?.name,
        image: supabaseUser.user_metadata?.avatar_url,
        created_at: supabaseUser.created_at || '',
        updated_at: supabaseUser.updated_at || '',
    };
}
exports.transformSupabaseUser = transformSupabaseUser;
function normalizeUser(user) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        created_at: user.created_at,
        updated_at: user.updated_at,
    };
}
exports.normalizeUser = normalizeUser;

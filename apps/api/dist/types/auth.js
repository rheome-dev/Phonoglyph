"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformSupabaseUser = void 0;
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
//# sourceMappingURL=auth.js.map
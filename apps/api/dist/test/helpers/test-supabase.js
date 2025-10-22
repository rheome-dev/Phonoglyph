"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestSupabaseClient = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
function createTestSupabaseClient() {
    return (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || 'http://localhost:54321', process.env.SUPABASE_ANON_KEY || 'test-key', {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}
exports.createTestSupabaseClient = createTestSupabaseClient;
//# sourceMappingURL=test-supabase.js.map
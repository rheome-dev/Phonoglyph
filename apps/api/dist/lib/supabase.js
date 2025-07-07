"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSupabaseServerClient = exports.supabase = exports.supabaseAdmin = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    console.warn('Supabase environment variables not found. Using dummy values for development.');
}
// Server-side client with service role key for admin operations
exports.supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl || 'https://dummy.supabase.co', supabaseServiceKey || 'dummy-service-key');
// Client for user-scoped operations (uses anon key)
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl || 'https://dummy.supabase.co', supabaseAnonKey || 'dummy-anon-key');
// Function to create Supabase client with user session
function createSupabaseServerClient(accessToken) {
    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Supabase not configured properly');
        return exports.supabase;
    }
    const client = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: accessToken ? {
                Authorization: `Bearer ${accessToken}`,
            } : {},
        },
    });
    return client;
}
exports.createSupabaseServerClient = createSupabaseServerClient;
//# sourceMappingURL=supabase.js.map
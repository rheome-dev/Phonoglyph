import { createHash, randomBytes } from 'crypto';
import { supabaseAdmin } from '../lib/supabase';
import { logger } from '../lib/logger';

const KEY_PREFIX = 'rbox_';

export interface ApiKeyRecord {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

/**
 * Hash an API key using SHA-256 for storage.
 * We never store the raw key — only the hash.
 */
function hashKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Generate a new API key.
 * Format: rbox_<32 random hex chars> (40 chars total)
 */
export function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const randomPart = randomBytes(20).toString('hex');
  const rawKey = `${KEY_PREFIX}${randomPart}`;
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.substring(0, 12); // "rbox_" + first 7 hex chars
  return { rawKey, keyHash, keyPrefix };
}

/**
 * Validate an API key and return the associated user_id.
 * Returns null if the key is invalid, expired, or revoked.
 */
export async function validateApiKey(rawKey: string): Promise<{ userId: string; scopes: string[] } | null> {
  if (!rawKey.startsWith(KEY_PREFIX)) {
    return null;
  }

  const keyHash = hashKey(rawKey);

  try {
    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('id, user_id, scopes, expires_at, revoked_at')
      .eq('key_hash', keyHash)
      .is('revoked_at', null)
      .single();

    if (error || !data) {
      return null;
    }

    // Check expiration
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null;
    }

    // Update last_used_at (fire-and-forget)
    void supabaseAdmin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)
      .then(() => {}, (err: any) => logger.error('Failed to update API key last_used_at:', err));

    return { userId: data.user_id, scopes: data.scopes };
  } catch (err) {
    logger.error('API key validation error:', err);
    return null;
  }
}

/**
 * Create a new API key for a user.
 * Returns the raw key (shown once) and the stored record.
 */
export async function createApiKey(
  userId: string,
  name: string,
  scopes: string[] = ['read', 'write', 'render'],
  expiresAt?: string
): Promise<{ rawKey: string; record: ApiKeyRecord }> {
  const { rawKey, keyHash, keyPrefix } = generateApiKey();

  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .insert({
      user_id: userId,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      scopes,
      expires_at: expiresAt || null,
    })
    .select('id, user_id, name, key_prefix, scopes, last_used_at, expires_at, revoked_at, created_at')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create API key: ${error?.message || 'Unknown error'}`);
  }

  return { rawKey, record: data as ApiKeyRecord };
}

/**
 * Revoke an API key.
 */
export async function revokeApiKey(keyId: string, userId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('user_id', userId);

  return !error;
}

/**
 * List API keys for a user (never returns the hash).
 */
export async function listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .select('id, user_id, name, key_prefix, scopes, last_used_at, expires_at, revoked_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list API keys: ${error.message}`);
  }

  return (data || []) as ApiKeyRecord[];
}

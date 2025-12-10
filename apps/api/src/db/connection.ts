import { Pool, PoolConfig } from 'pg'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { logger } from '../lib/logger';

dotenv.config()

let caCert: string | undefined;
try {
  // Construct a reliable path to the certificate from the project root directory.
  const certPath = path.join(process.cwd(), 'apps/api/src/db/prod-ca-2021.crt');
  if (fs.existsSync(certPath)) {
    caCert = fs.readFileSync(certPath).toString();
    logger.log('✅ Successfully loaded Supabase CA certificate from file.');
  } else {
    // Fallback for different execution contexts, like tests.
    const fallbackPath = path.join(__dirname, 'prod-ca-2021.crt');
    if (fs.existsSync(fallbackPath)) {
      caCert = fs.readFileSync(fallbackPath).toString();
      logger.log('✅ Successfully loaded Supabase CA certificate from fallback path.');
    } else {
      logger.warn(`⚠️ CA certificate file not found. Looked in:\n1. ${certPath}\n2. ${fallbackPath}`);
    }
  }
} catch (error) {
    logger.error('❌ Error reading CA certificate file:', error);
    caCert = undefined;
}

const connectionString = process.env.DATABASE_URL;

// Serverless environments need different connection settings
// Note: For Supabase, use connection pooler (port 6543) for better serverless performance
// Direct connection (port 5432) has connection limits that can cause timeouts
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

const prodDbConfig: PoolConfig = {
  connectionString: connectionString,
  // Reduce pool size for serverless (each function invocation is isolated)
  max: isServerless ? 1 : 20,
  // Shorter idle timeout for serverless to release connections faster
  idleTimeoutMillis: isServerless ? 10000 : 30000,
  // Longer connection timeout for serverless cold starts
  connectionTimeoutMillis: isServerless ? 30000 : 10000,
  // Allow pool to close idle connections quickly in serverless
  allowExitOnIdle: isServerless,
};

// If the Supabase CA certificate is loaded, enforce SSL with it.
// This is the recommended and most secure way to connect to Supabase.
if (caCert) {
  prodDbConfig.ssl = {
    rejectUnauthorized: true,
    ca: caCert,
  };
}

// Database configuration - use Supabase DATABASE_URL if available
const dbConfig = connectionString
  ? prodDbConfig
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'phonoglyph',
      password: process.env.DB_PASSWORD || 'password',
      port: parseInt(process.env.DB_PORT || '5432'),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }

// Create connection pool
export const pool = new Pool(dbConfig)

// Test database connection with retry logic for serverless
export async function testConnection(retries = 2): Promise<boolean> {
  const isServerlessEnv = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect()
      const result = await client.query('SELECT NOW()')
      client.release()
      logger.log('✅ Database connected successfully:', result.rows[0])
      return true
    } catch (err: any) {
      const isLastAttempt = attempt === retries;
      const errorMessage = err?.message || String(err);
      
      // Log error but don't fail initialization in serverless (non-blocking)
      if (isServerlessEnv && isLastAttempt) {
        console.error('⚠️  Database connection test failed (non-blocking in serverless):', errorMessage);
        console.error('⚠️  Connection will be established on first query if database is available');
        console.error('💡 Tip: For better serverless performance, use Supabase connection pooler (port 6543)');
        return false; // Don't throw, allow serverless function to start
      }
      
      if (isLastAttempt) {
        logger.error('❌ Database connection failed after retries:', err);
        // In non-serverless, we might want to throw, but for now return false
        return false;
      }
      
      // Wait before retry (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      logger.log(`⏳ Database connection attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
}

// Graceful shutdown
process.on('SIGINT', () => {
  logger.log('📡 Closing database pool...')
  pool.end()
  process.exit(0)
})

export default pool 
import { Pool, PoolConfig } from 'pg'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config()

let caCert: string | undefined;
try {
  // Construct a reliable path to the certificate from the project root directory.
  const certPath = path.join(process.cwd(), 'apps/api/src/db/prod-ca-2021.crt');
  if (fs.existsSync(certPath)) {
    caCert = fs.readFileSync(certPath).toString();
    console.log('✅ Successfully loaded Supabase CA certificate from file.');
  } else {
    // Fallback for different execution contexts, like tests.
    const fallbackPath = path.join(__dirname, 'prod-ca-2021.crt');
    if (fs.existsSync(fallbackPath)) {
      caCert = fs.readFileSync(fallbackPath).toString();
      console.log('✅ Successfully loaded Supabase CA certificate from fallback path.');
    } else {
      console.warn(`⚠️ CA certificate file not found. Looked in:\n1. ${certPath}\n2. ${fallbackPath}`);
    }
  }
} catch (error) {
    console.error('❌ Error reading CA certificate file:', error);
    caCert = undefined;
}

const connectionString = process.env.DATABASE_URL;

const prodDbConfig: PoolConfig = {
  connectionString: connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
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
      database: process.env.DB_NAME || 'midiviz',
      password: process.env.DB_PASSWORD || 'password',
      port: parseInt(process.env.DB_PORT || '5432'),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }

// Create connection pool
export const pool = new Pool(dbConfig)

// Test database connection
export async function testConnection() {
  try {
    const client = await pool.connect()
    const result = await client.query('SELECT NOW()')
    client.release()
    console.log('✅ Database connected successfully:', result.rows[0])
    return true
  } catch (err) {
    console.error('❌ Database connection failed:', err)
    return false
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('📡 Closing database pool...')
  pool.end()
  process.exit(0)
})

export default pool 
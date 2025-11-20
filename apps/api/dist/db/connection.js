"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConnection = exports.pool = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../lib/logger");
dotenv_1.default.config();
let caCert;
try {
    // Construct a reliable path to the certificate from the project root directory.
    const certPath = path_1.default.join(process.cwd(), 'apps/api/src/db/prod-ca-2021.crt');
    if (fs_1.default.existsSync(certPath)) {
        caCert = fs_1.default.readFileSync(certPath).toString();
        logger_1.logger.log('✅ Successfully loaded Supabase CA certificate from file.');
    }
    else {
        // Fallback for different execution contexts, like tests.
        const fallbackPath = path_1.default.join(__dirname, 'prod-ca-2021.crt');
        if (fs_1.default.existsSync(fallbackPath)) {
            caCert = fs_1.default.readFileSync(fallbackPath).toString();
            logger_1.logger.log('✅ Successfully loaded Supabase CA certificate from fallback path.');
        }
        else {
            logger_1.logger.warn(`⚠️ CA certificate file not found. Looked in:\n1. ${certPath}\n2. ${fallbackPath}`);
        }
    }
}
catch (error) {
    logger_1.logger.error('❌ Error reading CA certificate file:', error);
    caCert = undefined;
}
const connectionString = process.env.DATABASE_URL;
const prodDbConfig = {
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
        database: process.env.DB_NAME || 'phonoglyph',
        password: process.env.DB_PASSWORD || 'password',
        port: parseInt(process.env.DB_PORT || '5432'),
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    };
// Create connection pool
exports.pool = new pg_1.Pool(dbConfig);
// Test database connection
async function testConnection() {
    try {
        const client = await exports.pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        logger_1.logger.log('✅ Database connected successfully:', result.rows[0]);
        return true;
    }
    catch (err) {
        logger_1.logger.error('❌ Database connection failed:', err);
        return false;
    }
}
exports.testConnection = testConnection;
// Graceful shutdown
process.on('SIGINT', () => {
    logger_1.logger.log('📡 Closing database pool...');
    exports.pool.end();
    process.exit(0);
});
exports.default = exports.pool;
//# sourceMappingURL=connection.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const connection_1 = require("../connection");
async function runMigrations() {
    try {
        // Create migrations table if it doesn't exist
        await connection_1.pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Get all migration files
        const migrationsDir = path_1.default.join(__dirname);
        const migrationFiles = fs_1.default.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();
        // Get already executed migrations
        const executedResult = await connection_1.pool.query('SELECT name FROM migrations');
        const executedMigrations = executedResult.rows.map(row => row.name);
        // Execute pending migrations
        for (const file of migrationFiles) {
            if (!executedMigrations.includes(file)) {
                console.log(`🔄 Running migration: ${file}`);
                const migrationSQL = fs_1.default.readFileSync(path_1.default.join(migrationsDir, file), 'utf8');
                // Execute migration
                await connection_1.pool.query(migrationSQL);
                // Record migration as executed
                await connection_1.pool.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
                console.log(`✅ Migration completed: ${file}`);
            }
            else {
                console.log(`⏭️ Migration already executed: ${file}`);
            }
        }
        console.log('🎉 All migrations completed successfully!');
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}
exports.runMigrations = runMigrations;
// Run migrations if this file is executed directly
if (require.main === module) {
    runMigrations().then(() => {
        connection_1.pool.end();
        process.exit(0);
    });
}
//# sourceMappingURL=migrate.js.map
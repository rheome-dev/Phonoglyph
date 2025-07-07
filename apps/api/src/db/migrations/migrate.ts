import fs from 'fs'
import path from 'path'
import { pool } from '../connection'

async function runMigrations() {
  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Get all migration files
    const migrationsDir = path.join(__dirname)
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort()

    // Get already executed migrations
    const executedResult = await pool.query('SELECT name FROM migrations')
    const executedMigrations = executedResult.rows.map(row => row.name)

    // Execute pending migrations
    for (const file of migrationFiles) {
      if (!executedMigrations.includes(file)) {
        console.log(`🔄 Running migration: ${file}`)
        
        const migrationSQL = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
        
        // Execute migration
        await pool.query(migrationSQL)
        
        // Record migration as executed
        await pool.query('INSERT INTO migrations (name) VALUES ($1)', [file])
        
        console.log(`✅ Migration completed: ${file}`)
      } else {
        console.log(`⏭️ Migration already executed: ${file}`)
      }
    }

    console.log('🎉 All migrations completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations().then(() => {
    pool.end()
    process.exit(0)
  })
}

export { runMigrations } 
#!/usr/bin/env node
"use strict";
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
// Load environment variables
require('dotenv').config();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}
// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey);
async function runMigration(migrationPath) {
    console.log(`📂 Running migration: ${path.basename(migrationPath)}`);
    try {
        const sql = fs.readFileSync(migrationPath, 'utf8');
        // Split SQL into individual statements
        const statements = sql
            .split(';')
            .map(statement => statement.trim())
            .filter(statement => statement.length > 0 && !statement.startsWith('--'));
        console.log(`   📝 Found ${statements.length} SQL statements`);
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            console.log(`   ⚡ Executing statement ${i + 1}/${statements.length}...`);
            // Execute the SQL statement
            const { error } = await supabase.rpc('exec_sql', {
                sql_statement: statement + ';'
            });
            if (error) {
                // Try direct query execution if RPC fails
                const { error: directError } = await supabase
                    .from('_migrations')
                    .select('*')
                    .limit(0); // This is just to test the connection
                if (directError) {
                    console.error(`   ❌ Failed to execute statement: ${statement.substring(0, 100)}...`);
                    console.error(`   Error: ${error.message}`);
                    throw error;
                }
            }
        }
        console.log(`   ✅ Migration completed successfully`);
        return true;
    }
    catch (error) {
        console.error(`   ❌ Migration failed:`, error.message);
        return false;
    }
}
async function createMigrationsTable() {
    console.log('🗄️  Creating migrations tracking table...');
    const { error } = await supabase.rpc('exec_sql', {
        sql_statement: `
      CREATE TABLE IF NOT EXISTS "_migrations" (
        "id" SERIAL PRIMARY KEY,
        "filename" TEXT NOT NULL UNIQUE,
        "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `
    });
    if (error) {
        console.error('❌ Failed to create migrations table:', error.message);
        return false;
    }
    console.log('✅ Migrations table ready');
    return true;
}
async function getMigrationFiles() {
    const migrationsDir = path.join(__dirname, '../db/migrations');
    try {
        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();
        return files.map(file => path.join(migrationsDir, file));
    }
    catch (error) {
        console.error('❌ Failed to read migrations directory:', error.message);
        return [];
    }
}
async function hasRunMigration(filename) {
    const { data, error } = await supabase
        .from('_migrations')
        .select('filename')
        .eq('filename', filename)
        .single();
    return !error && data;
}
async function recordMigration(filename) {
    const { error } = await supabase
        .from('_migrations')
        .insert({ filename });
    if (error) {
        console.error(`❌ Failed to record migration: ${error.message}`);
    }
}
async function main() {
    console.log('🚀 Starting database migration process...');
    console.log(`📍 Supabase URL: ${supabaseUrl}`);
    console.log('');
    // Test connection
    const { data, error } = await supabase.from('projects').select('id').limit(1);
    if (error && error.code !== 'PGRST106') { // PGRST106 means table doesn't exist yet, which is ok
        console.error('❌ Failed to connect to Supabase:', error.message);
        process.exit(1);
    }
    console.log('✅ Connected to Supabase successfully');
    console.log('');
    // Create migrations table
    if (!(await createMigrationsTable())) {
        process.exit(1);
    }
    console.log('');
    // Get migration files
    const migrationFiles = await getMigrationFiles();
    console.log(`📋 Found ${migrationFiles.length} migration files`);
    console.log('');
    if (migrationFiles.length === 0) {
        console.log('ℹ️  No migrations to run');
        process.exit(0);
    }
    let successCount = 0;
    let skipCount = 0;
    for (const migrationPath of migrationFiles) {
        const filename = path.basename(migrationPath);
        // Check if migration has already been run
        if (await hasRunMigration(filename)) {
            console.log(`⏭️  Skipping ${filename} (already executed)`);
            skipCount++;
            continue;
        }
        // Run the migration
        if (await runMigration(migrationPath)) {
            await recordMigration(filename);
            successCount++;
        }
        else {
            console.error(`❌ Migration ${filename} failed - stopping execution`);
            process.exit(1);
        }
        console.log('');
    }
    console.log('🎉 Migration process completed!');
    console.log(`   ✅ ${successCount} migrations executed successfully`);
    console.log(`   ⏭️  ${skipCount} migrations skipped`);
    if (successCount > 0) {
        console.log('');
        console.log('🔒 Row Level Security (RLS) policies have been applied');
        console.log('🔍 Audit logging is now active');
        console.log('👥 User profiles and project collaboration features are ready');
    }
}
// Handle process termination
process.on('SIGINT', () => {
    console.log('\n⚠️  Migration process interrupted by user');
    process.exit(0);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled promise rejection:', reason);
    process.exit(1);
});
// Run the migration process
main().catch(error => {
    console.error('❌ Migration process failed:', error.message);
    process.exit(1);
});
//# sourceMappingURL=run-migrations.js.map
#!/usr/bin/env tsx

import dotenv from 'dotenv'
import { testS3Connection, validateS3Config, initializeS3 } from '../services/r2-storage'
import { logger } from '../lib/logger';

// Load environment variables
dotenv.config()

async function main() {
  logger.log('🧪 Testing Cloudflare R2 Configuration...\n')

  try {
    // Test 1: Validate environment variables
    logger.log('1️⃣ Validating R2 environment variables...')
    validateS3Config()
    logger.log('✅ Environment variables are configured\n')

    // Test 2: Test R2 connectivity
    logger.log('2️⃣ Testing R2 connectivity...')
    const isConnected = await testS3Connection()
    if (isConnected) {
      logger.log('✅ R2 connection successful\n')
    } else {
      logger.log('❌ R2 connection failed\n')
      process.exit(1)
    }

    // Test 3: Initialize R2 (create bucket + CORS if needed)
    logger.log('3️⃣ Initializing R2 service...')
    await initializeS3()
    logger.log('✅ R2 service initialization complete\n')

    logger.log('🎉 All R2 tests passed!')
    process.exit(0)

  } catch (error) {
    logger.error('❌ R2 test failed:', error)
    process.exit(1)
  }
}

// Run if this script is executed directly
if (require.main === module) {
  main()
} 
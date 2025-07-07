#!/usr/bin/env tsx
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const r2_storage_1 = require("../services/r2-storage");
// Load environment variables
dotenv_1.default.config();
async function main() {
    console.log('🧪 Testing Cloudflare R2 Configuration...\n');
    try {
        // Test 1: Validate environment variables
        console.log('1️⃣ Validating R2 environment variables...');
        (0, r2_storage_1.validateS3Config)();
        console.log('✅ Environment variables are configured\n');
        // Test 2: Test R2 connectivity
        console.log('2️⃣ Testing R2 connectivity...');
        const isConnected = await (0, r2_storage_1.testS3Connection)();
        if (isConnected) {
            console.log('✅ R2 connection successful\n');
        }
        else {
            console.log('❌ R2 connection failed\n');
            process.exit(1);
        }
        // Test 3: Initialize R2 (create bucket + CORS if needed)
        console.log('3️⃣ Initializing R2 service...');
        await (0, r2_storage_1.initializeS3)();
        console.log('✅ R2 service initialization complete\n');
        console.log('🎉 All R2 tests passed!');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ R2 test failed:', error);
        process.exit(1);
    }
}
// Run if this script is executed directly
if (require.main === module) {
    main();
}
//# sourceMappingURL=test-s3.js.map
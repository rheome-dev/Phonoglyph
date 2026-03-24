"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateS3Config = exports.testS3Connection = exports.initializeS3 = exports.s3Client = exports.testR2Connection = exports.initializeR2 = exports.generateThumbnailUrl = exports.uploadThumbnail = exports.generateThumbnailKey = exports.generateS3Key = exports.deleteFile = exports.getFileBuffer = exports.generateDownloadUrl = exports.generateUploadUrl = exports.configureBucketCors = exports.createBucketIfNotExists = exports.validateR2Config = exports.BUCKET_NAME = exports.r2Client = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const client_s3_2 = require("@aws-sdk/client-s3");
const logger_1 = require("../lib/logger");
// Cloudflare R2 Configuration (S3-Compatible)
const r2Config = {
    region: 'auto', // R2 uses 'auto' region
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    },
    // R2-specific configuration
    forcePathStyle: true, // Required for R2
};
exports.r2Client = new client_s3_1.S3Client(r2Config);
exports.s3Client = exports.r2Client;
exports.BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET || 'raybox-uploads';
// Validate required environment variables
function validateR2Config() {
    const required = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY', 'CLOUDFLARE_R2_BUCKET'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required Cloudflare R2 environment variables: ${missing.join(', ')}`);
    }
}
exports.validateR2Config = validateR2Config;
exports.validateS3Config = validateR2Config;
// Create R2 bucket if it doesn't exist
async function createBucketIfNotExists() {
    try {
        // Check if bucket exists
        await exports.r2Client.send(new client_s3_1.HeadBucketCommand({ Bucket: exports.BUCKET_NAME }));
        logger_1.logger.log(`✅ R2 bucket '${exports.BUCKET_NAME}' already exists`);
    }
    catch (error) {
        if (error.name === 'NotFound') {
            try {
                await exports.r2Client.send(new client_s3_1.CreateBucketCommand({ Bucket: exports.BUCKET_NAME }));
                logger_1.logger.log(`✅ Created R2 bucket '${exports.BUCKET_NAME}'`);
            }
            catch (createError) {
                logger_1.logger.error('❌ Failed to create R2 bucket:', createError);
                throw createError;
            }
        }
        else {
            logger_1.logger.error('❌ Error checking R2 bucket:', error);
            throw error;
        }
    }
}
exports.createBucketIfNotExists = createBucketIfNotExists;
// Configure CORS for web uploads
async function configureBucketCors() {
    // Build allowed origins list
    const allowedOrigins = [
        'http://localhost:3000', // Local development
        'https://phonoglyph.rheome.tools', // Production domain
    ];
    // Add FRONTEND_URL if provided and not already in list
    if (process.env.FRONTEND_URL) {
        const frontendUrl = process.env.FRONTEND_URL.trim();
        if (!allowedOrigins.includes(frontendUrl)) {
            allowedOrigins.push(frontendUrl);
        }
    }
    // Add additional origins from env if provided (comma-separated)
    if (process.env.R2_CORS_ORIGINS) {
        const additionalOrigins = process.env.R2_CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean);
        additionalOrigins.forEach(origin => {
            if (!allowedOrigins.includes(origin)) {
                allowedOrigins.push(origin);
            }
        });
    }
    const corsConfiguration = {
        CORSRules: [
            {
                AllowedOrigins: allowedOrigins,
                AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                AllowedHeaders: [
                    'Origin',
                    'X-Requested-With',
                    'Content-Type',
                    'Accept',
                    'Authorization',
                    'Cache-Control',
                    'x-amz-date',
                    'x-amz-security-token',
                ],
                ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type', 'Date'],
                MaxAgeSeconds: 3000,
            },
        ],
    };
    try {
        await exports.r2Client.send(new client_s3_1.PutBucketCorsCommand({
            Bucket: exports.BUCKET_NAME,
            CORSConfiguration: corsConfiguration,
        }));
        logger_1.logger.log(`✅ Configured CORS for R2 bucket '${exports.BUCKET_NAME}'`);
        logger_1.logger.log(`   Allowed origins: ${allowedOrigins.join(', ')}`);
    }
    catch (error) {
        // Always log CORS errors - this is critical for production
        console.error('❌ Failed to configure CORS for R2 bucket:', error);
        console.error('   Error code:', error.Code || error.name);
        console.error('   Error message:', error.message);
        console.error('   Allowed origins attempted:', allowedOrigins.join(', '));
        console.error('   ⚠️  If this fails, CORS must be configured manually in Cloudflare dashboard');
        logger_1.logger.error('❌ Failed to configure CORS:', error);
        throw error;
    }
}
exports.configureBucketCors = configureBucketCors;
// Generate pre-signed URL for file upload
async function generateUploadUrl(key, contentType, expiresIn = 3600) {
    const command = new client_s3_2.PutObjectCommand({
        Bucket: exports.BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });
    try {
        const url = await (0, s3_request_presigner_1.getSignedUrl)(exports.r2Client, command, { expiresIn });
        return url;
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to generate upload URL:', error);
        throw error;
    }
}
exports.generateUploadUrl = generateUploadUrl;
// Generate direct URL for file download (for Remotion/reading)
// Uses assets.raybox.fm custom domain instead of signed URLs for stability
async function generateDownloadUrl(key, expiresIn = 3600) {
    // For reading (GET requests from Remotion), use direct URL via custom domain
    // This is more stable than signed URLs and works better with bots/Remotion
    const directUrl = `https://assets.raybox.fm/${key}`;
    return directUrl;
}
exports.generateDownloadUrl = generateDownloadUrl;
// Get file data as Buffer for processing
async function getFileBuffer(key) {
    const command = new client_s3_2.GetObjectCommand({
        Bucket: exports.BUCKET_NAME,
        Key: key,
    });
    try {
        const response = await exports.r2Client.send(command);
        if (!response.Body) {
            throw new Error(`File not found: ${key}`);
        }
        // Convert ReadableStream to Buffer
        const chunks = [];
        const reader = response.Body.transformToWebStream().getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            chunks.push(value);
        }
        return Buffer.concat(chunks);
    }
    catch (error) {
        logger_1.logger.error(`❌ Failed to get file buffer for ${key}:`, error);
        throw error;
    }
}
exports.getFileBuffer = getFileBuffer;
// Delete file from R2
async function deleteFile(key) {
    const command = new client_s3_2.DeleteObjectCommand({
        Bucket: exports.BUCKET_NAME,
        Key: key,
    });
    try {
        await exports.r2Client.send(command);
        logger_1.logger.log(`✅ Deleted file: ${key}`);
    }
    catch (error) {
        logger_1.logger.error(`❌ Failed to delete file ${key}:`, error);
        throw error;
    }
}
exports.deleteFile = deleteFile;
// Generate S3 key with proper organization - EXTENDED for video/image
function generateS3Key(userId, fileName, fileType) {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${fileType}/${userId}/${timestamp}_${sanitizedFileName}`;
}
exports.generateS3Key = generateS3Key;
// Generate thumbnail key for processed media
function generateThumbnailKey(originalKey) {
    const lastDotIndex = originalKey.lastIndexOf('.');
    const baseKey = lastDotIndex > -1 ? originalKey.substring(0, lastDotIndex) : originalKey;
    return `${baseKey}_thumb.jpg`;
}
exports.generateThumbnailKey = generateThumbnailKey;
// Upload thumbnail to R2
async function uploadThumbnail(thumbnailKey, thumbnailBuffer) {
    const command = new client_s3_2.PutObjectCommand({
        Bucket: exports.BUCKET_NAME,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000', // 1 year cache
    });
    try {
        await exports.r2Client.send(command);
        return thumbnailKey;
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to upload thumbnail:', error);
        throw error;
    }
}
exports.uploadThumbnail = uploadThumbnail;
// Generate download URL for thumbnails
// Uses direct URL via assets.raybox.fm custom domain
async function generateThumbnailUrl(thumbnailKey, expiresIn = 3600) {
    try {
        // Use direct URL for thumbnails as well
        const url = await generateDownloadUrl(thumbnailKey, expiresIn);
        return url;
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to generate thumbnail URL:', error);
        throw error;
    }
}
exports.generateThumbnailUrl = generateThumbnailUrl;
// Initialize R2 service
async function initializeR2() {
    logger_1.logger.log('🚀 Initializing Cloudflare R2 service...');
    try {
        validateR2Config();
        await createBucketIfNotExists();
        // Try to configure CORS, but don't fail if permissions are insufficient
        try {
            await configureBucketCors();
        }
        catch (corsError) {
            // Always log CORS errors - critical for debugging production issues
            console.error('⚠️  CORS configuration failed:', corsError.Code || corsError.name, corsError.message);
            if (corsError.Code === 'AccessDenied' || corsError.name === 'AccessDenied') {
                console.error('⚠️  CORS configuration skipped (insufficient permissions)');
                console.error('⚠️  You must configure CORS manually in Cloudflare R2 dashboard:');
                console.error('   1. Go to Cloudflare Dashboard > R2 > Your Bucket > Settings');
                console.error('   2. Add CORS policy with allowed origins: https://phonoglyph.rheome.tools');
                logger_1.logger.log('⚠️  CORS configuration skipped (insufficient permissions - this is OK for development)');
            }
            else {
                // Log other errors but don't fail initialization
                console.error('⚠️  CORS configuration error (non-fatal):', corsError);
                logger_1.logger.error('⚠️  CORS configuration error:', corsError);
            }
        }
        logger_1.logger.log('✅ R2 service initialized successfully');
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to initialize R2 service:', error);
        throw error;
    }
}
exports.initializeR2 = initializeR2;
exports.initializeS3 = initializeR2;
// Test R2 connectivity
async function testR2Connection() {
    try {
        await exports.r2Client.send(new client_s3_1.HeadBucketCommand({ Bucket: exports.BUCKET_NAME }));
        return true;
    }
    catch (error) {
        logger_1.logger.error('❌ R2 connection test failed:', error);
        return false;
    }
}
exports.testR2Connection = testR2Connection;
exports.testS3Connection = testR2Connection;
//# sourceMappingURL=r2-storage.js.map
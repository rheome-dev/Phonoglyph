"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateS3Config = exports.testS3Connection = exports.initializeS3 = exports.s3Client = exports.testR2Connection = exports.initializeR2 = exports.generateThumbnailUrl = exports.uploadThumbnail = exports.generateThumbnailKey = exports.generateS3Key = exports.deleteFile = exports.getFileBuffer = exports.generateDownloadUrl = exports.generateUploadUrl = exports.configureBucketCors = exports.createBucketIfNotExists = exports.validateR2Config = exports.BUCKET_NAME = exports.r2Client = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const client_s3_2 = require("@aws-sdk/client-s3");
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
exports.BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET || 'midiviz-uploads';
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
        console.log(`✅ R2 bucket '${exports.BUCKET_NAME}' already exists`);
    }
    catch (error) {
        if (error.name === 'NotFound') {
            try {
                await exports.r2Client.send(new client_s3_1.CreateBucketCommand({ Bucket: exports.BUCKET_NAME }));
                console.log(`✅ Created R2 bucket '${exports.BUCKET_NAME}'`);
            }
            catch (createError) {
                console.error('❌ Failed to create R2 bucket:', createError);
                throw createError;
            }
        }
        else {
            console.error('❌ Error checking R2 bucket:', error);
            throw error;
        }
    }
}
exports.createBucketIfNotExists = createBucketIfNotExists;
// Configure CORS for web uploads
async function configureBucketCors() {
    const corsConfiguration = {
        CORSRules: [
            {
                AllowedOrigins: [
                    process.env.FRONTEND_URL || 'http://localhost:3000',
                    'https://*.vercel.app', // For preview deployments
                ],
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
                ExposeHeaders: ['ETag'],
                MaxAgeSeconds: 3000,
            },
        ],
    };
    try {
        await exports.r2Client.send(new client_s3_1.PutBucketCorsCommand({
            Bucket: exports.BUCKET_NAME,
            CORSConfiguration: corsConfiguration,
        }));
        console.log(`✅ Configured CORS for R2 bucket '${exports.BUCKET_NAME}'`);
    }
    catch (error) {
        console.error('❌ Failed to configure CORS:', error);
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
        console.error('❌ Failed to generate upload URL:', error);
        throw error;
    }
}
exports.generateUploadUrl = generateUploadUrl;
// Generate pre-signed URL for file download
async function generateDownloadUrl(key, expiresIn = 3600) {
    const command = new client_s3_2.GetObjectCommand({
        Bucket: exports.BUCKET_NAME,
        Key: key,
    });
    try {
        const url = await (0, s3_request_presigner_1.getSignedUrl)(exports.r2Client, command, { expiresIn });
        return url;
    }
    catch (error) {
        console.error('❌ Failed to generate download URL:', error);
        throw error;
    }
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
        console.error(`❌ Failed to get file buffer for ${key}:`, error);
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
        console.log(`✅ Deleted file: ${key}`);
    }
    catch (error) {
        console.error(`❌ Failed to delete file ${key}:`, error);
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
        console.error('❌ Failed to upload thumbnail:', error);
        throw error;
    }
}
exports.uploadThumbnail = uploadThumbnail;
// Generate download URL for thumbnails
async function generateThumbnailUrl(thumbnailKey, expiresIn = 3600) {
    try {
        const url = await generateDownloadUrl(thumbnailKey, expiresIn);
        return url;
    }
    catch (error) {
        console.error('❌ Failed to generate thumbnail URL:', error);
        throw error;
    }
}
exports.generateThumbnailUrl = generateThumbnailUrl;
// Initialize R2 service
async function initializeR2() {
    console.log('🚀 Initializing Cloudflare R2 service...');
    try {
        validateR2Config();
        await createBucketIfNotExists();
        // Try to configure CORS, but don't fail if permissions are insufficient
        try {
            await configureBucketCors();
        }
        catch (corsError) {
            if (corsError.Code === 'AccessDenied') {
                console.log('⚠️  CORS configuration skipped (insufficient permissions - this is OK for development)');
            }
            else {
                throw corsError;
            }
        }
        console.log('✅ R2 service initialized successfully');
    }
    catch (error) {
        console.error('❌ Failed to initialize R2 service:', error);
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
        console.error('❌ R2 connection test failed:', error);
        return false;
    }
}
exports.testR2Connection = testR2Connection;
exports.testS3Connection = testR2Connection;
//# sourceMappingURL=r2-storage.js.map
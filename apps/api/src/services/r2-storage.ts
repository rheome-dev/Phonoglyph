import { S3Client, CreateBucketCommand, PutBucketCorsCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '../lib/logger';

// Cloudflare R2 Configuration (S3-Compatible)
const r2Config = {
  region: 'auto', // R2 uses 'auto' region
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
  // R2-specific configuration
  forcePathStyle: true, // Required for R2
};

export const r2Client = new S3Client(r2Config);
export const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET || 'phonoglyph-uploads';

// Validate required environment variables
export function validateR2Config(): void {
  const required = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY', 'CLOUDFLARE_R2_BUCKET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required Cloudflare R2 environment variables: ${missing.join(', ')}`);
  }
}

// Create R2 bucket if it doesn't exist
export async function createBucketIfNotExists(): Promise<void> {
  try {
    // Check if bucket exists
    await (r2Client as any).send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    logger.log(`✅ R2 bucket '${BUCKET_NAME}' already exists`);
  } catch (error: any) {
    if (error.name === 'NotFound') {
      try {
        await (r2Client as any).send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
        logger.log(`✅ Created R2 bucket '${BUCKET_NAME}'`);
      } catch (createError) {
        logger.error('❌ Failed to create R2 bucket:', createError);
        throw createError;
      }
    } else {
      logger.error('❌ Error checking R2 bucket:', error);
      throw error;
    }
  }
}

// Configure CORS for web uploads
export async function configureBucketCors(): Promise<void> {
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
    await (r2Client as any).send(new PutBucketCorsCommand({
      Bucket: BUCKET_NAME,
      CORSConfiguration: corsConfiguration,
    }));
    logger.log(`✅ Configured CORS for R2 bucket '${BUCKET_NAME}'`);
  } catch (error) {
    logger.error('❌ Failed to configure CORS:', error);
    throw error;
  }
}

// Generate pre-signed URL for file upload
export async function generateUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  try {
    const url = await getSignedUrl(r2Client, command, { expiresIn });
    return url;
  } catch (error) {
    logger.error('❌ Failed to generate upload URL:', error);
    throw error;
  }
}

// Generate pre-signed URL for file download
export async function generateDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    const url = await getSignedUrl(r2Client, command, { expiresIn });
    return url;
  } catch (error) {
    logger.error('❌ Failed to generate download URL:', error);
    throw error;
  }
}

// Get file data as Buffer for processing
export async function getFileBuffer(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    const response = await (r2Client as any).send(command);
    
    if (!response.Body) {
      throw new Error(`File not found: ${key}`);
    }

    // Convert ReadableStream to Buffer
    const chunks: Uint8Array[] = [];
    const reader = response.Body.transformToWebStream().getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    return Buffer.concat(chunks);
  } catch (error) {
    logger.error(`❌ Failed to get file buffer for ${key}:`, error);
    throw error;
  }
}

// Delete file from R2
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    await (r2Client as any).send(command);
    logger.log(`✅ Deleted file: ${key}`);
  } catch (error) {
    logger.error(`❌ Failed to delete file ${key}:`, error);
    throw error;
  }
}

// Generate S3 key with proper organization - EXTENDED for video/image
export function generateS3Key(
  userId: string, 
  fileName: string, 
  fileType: 'midi' | 'audio' | 'video' | 'image'
): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${fileType}/${userId}/${timestamp}_${sanitizedFileName}`;
}

// Generate thumbnail key for processed media
export function generateThumbnailKey(originalKey: string): string {
  const lastDotIndex = originalKey.lastIndexOf('.');
  const baseKey = lastDotIndex > -1 ? originalKey.substring(0, lastDotIndex) : originalKey;
  return `${baseKey}_thumb.jpg`;
}

// Upload thumbnail to R2
export async function uploadThumbnail(
  thumbnailKey: string,
  thumbnailBuffer: Buffer
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: thumbnailKey,
    Body: thumbnailBuffer,
    ContentType: 'image/jpeg',
    CacheControl: 'public, max-age=31536000', // 1 year cache
  });

  try {
    await (r2Client as any).send(command);
    return thumbnailKey;
  } catch (error) {
    logger.error('❌ Failed to upload thumbnail:', error);
    throw error;
  }
}

// Generate download URL for thumbnails
export async function generateThumbnailUrl(
  thumbnailKey: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const url = await generateDownloadUrl(thumbnailKey, expiresIn);
    return url;
  } catch (error) {
    logger.error('❌ Failed to generate thumbnail URL:', error);
    throw error;
  }
}

// Initialize R2 service
export async function initializeR2(): Promise<void> {
  logger.log('🚀 Initializing Cloudflare R2 service...');
  
  try {
    validateR2Config();
    await createBucketIfNotExists();
    
    // Try to configure CORS, but don't fail if permissions are insufficient
    try {
      await configureBucketCors();
    } catch (corsError: any) {
      if (corsError.Code === 'AccessDenied') {
        logger.log('⚠️  CORS configuration skipped (insufficient permissions - this is OK for development)');
      } else {
        throw corsError;
      }
    }
    
    logger.log('✅ R2 service initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize R2 service:', error);
    throw error;
  }
}

// Test R2 connectivity
export async function testR2Connection(): Promise<boolean> {
  try {
    await (r2Client as any).send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    return true;
  } catch (error) {
    logger.error('❌ R2 connection test failed:', error);
    return false;
  }
}

// Legacy compatibility - export as s3Client for existing code
export { r2Client as s3Client };
export { initializeR2 as initializeS3 };
export { testR2Connection as testS3Connection };
export { validateR2Config as validateS3Config }; 
/// <reference types="node" />
/// <reference types="node" />
import { S3Client } from '@aws-sdk/client-s3';
export declare const r2Client: S3Client;
export declare const BUCKET_NAME: string;
export declare function validateR2Config(): void;
export declare function createBucketIfNotExists(): Promise<void>;
export declare function configureBucketCors(): Promise<void>;
export declare function generateUploadUrl(key: string, contentType: string, expiresIn?: number): Promise<string>;
export declare function generateDownloadUrl(key: string, expiresIn?: number): Promise<string>;
export declare function getFileBuffer(key: string): Promise<Buffer>;
export declare function deleteFile(key: string): Promise<void>;
export declare function generateS3Key(userId: string, fileName: string, fileType: 'midi' | 'audio' | 'video' | 'image'): string;
export declare function generateThumbnailKey(originalKey: string): string;
export declare function uploadThumbnail(thumbnailKey: string, thumbnailBuffer: Buffer): Promise<string>;
export declare function generateThumbnailUrl(thumbnailKey: string, expiresIn?: number): Promise<string>;
export declare function initializeR2(): Promise<void>;
export declare function testR2Connection(): Promise<boolean>;
export { r2Client as s3Client };
export { initializeR2 as initializeS3 };
export { testR2Connection as testS3Connection };
export { validateR2Config as validateS3Config };
//# sourceMappingURL=r2-storage.d.ts.map
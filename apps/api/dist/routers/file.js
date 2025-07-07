"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileRouter = void 0;
const zod_1 = require("zod");
const trpc_1 = require("../trpc");
const server_1 = require("@trpc/server");
const r2_storage_1 = require("../services/r2-storage");
const client_s3_1 = require("@aws-sdk/client-s3");
const file_validation_1 = require("../lib/file-validation");
const media_processor_1 = require("../services/media-processor");
// Create rate limiter instance
const uploadRateLimit = (0, file_validation_1.createUploadRateLimit)();
// File metadata schema for database storage - EXTENDED
const FileMetadataSchema = zod_1.z.object({
    id: zod_1.z.string(),
    fileName: zod_1.z.string(),
    fileType: zod_1.z.enum(['midi', 'audio', 'video', 'image']), // EXTENDED
    mimeType: zod_1.z.string(),
    fileSize: zod_1.z.number(),
    s3Key: zod_1.z.string(),
    s3Bucket: zod_1.z.string(),
    uploadStatus: zod_1.z.enum(['uploading', 'completed', 'failed']),
});
exports.fileRouter = (0, trpc_1.router)({
    // Generate pre-signed URL for file upload - EXTENDED
    getUploadUrl: trpc_1.protectedProcedure
        .input(file_validation_1.FileUploadSchema)
        .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        try {
            // Rate limiting check
            if (!uploadRateLimit.checkRateLimit(userId)) {
                throw new server_1.TRPCError({
                    code: 'TOO_MANY_REQUESTS',
                    message: 'Upload rate limit exceeded. Please wait before uploading more files.',
                });
            }
            // Security check - reject executable files
            if ((0, file_validation_1.isExecutableFile)(input.fileName)) {
                throw new server_1.TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Executable files are not allowed for security reasons.',
                });
            }
            // Validate file
            const validation = (0, file_validation_1.validateFile)(input);
            if (!validation.isValid) {
                throw new server_1.TRPCError({
                    code: 'BAD_REQUEST',
                    message: `File validation failed: ${validation.errors.join(', ')}`,
                });
            }
            // Sanitize file name and generate S3 key
            const sanitizedFileName = (0, file_validation_1.sanitizeFileName)(input.fileName);
            const s3Key = (0, r2_storage_1.generateS3Key)(userId, sanitizedFileName, validation.fileType);
            // Generate pre-signed URL
            const uploadUrl = await (0, r2_storage_1.generateUploadUrl)(s3Key, input.mimeType, 3600); // 1 hour expiry
            // Create file metadata record in database
            const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2)}`;
            const { error: dbError } = await ctx.supabase
                .from('file_metadata')
                .insert({
                id: fileId,
                user_id: userId,
                file_name: sanitizedFileName,
                file_type: validation.fileType,
                mime_type: input.mimeType,
                file_size: input.fileSize,
                s3_key: s3Key,
                s3_bucket: process.env.CLOUDFLARE_R2_BUCKET || 'midiviz-uploads',
                processing_status: media_processor_1.MediaProcessor.requiresProcessing(validation.fileType) ? 'pending' : 'completed',
            });
            if (dbError) {
                console.error('Database error creating file metadata:', dbError);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create file record',
                });
            }
            return {
                fileId,
                uploadUrl,
                s3Key,
                expiresIn: 3600,
                fileInfo: {
                    fileName: sanitizedFileName,
                    fileType: validation.fileType,
                    fileSize: input.fileSize,
                },
            };
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            console.error('Error generating upload URL:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to generate upload URL',
            });
        }
    }),
    // Direct upload endpoint to avoid CORS issues - EXTENDED
    uploadFile: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        fileName: zod_1.z.string(),
        fileType: zod_1.z.enum(['midi', 'audio', 'video', 'image']), // EXTENDED
        mimeType: zod_1.z.string(),
        fileSize: zod_1.z.number(),
        fileData: zod_1.z.string(), // Base64 encoded file data
    }))
        .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        try {
            // Rate limiting check
            if (!uploadRateLimit.checkRateLimit(userId)) {
                throw new server_1.TRPCError({
                    code: 'TOO_MANY_REQUESTS',
                    message: 'Upload rate limit exceeded. Please wait before uploading more files.',
                });
            }
            // Security check - reject executable files
            if ((0, file_validation_1.isExecutableFile)(input.fileName)) {
                throw new server_1.TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Executable files are not allowed for security reasons.',
                });
            }
            // Validate file
            const validation = (0, file_validation_1.validateFile)({
                fileName: input.fileName,
                fileSize: input.fileSize,
                mimeType: input.mimeType,
            });
            if (!validation.isValid) {
                throw new server_1.TRPCError({
                    code: 'BAD_REQUEST',
                    message: `File validation failed: ${validation.errors.join(', ')}`,
                });
            }
            // Sanitize file name and generate S3 key
            const sanitizedFileName = (0, file_validation_1.sanitizeFileName)(input.fileName);
            const s3Key = (0, r2_storage_1.generateS3Key)(userId, sanitizedFileName, validation.fileType);
            // Decode base64 file data
            const fileBuffer = Buffer.from(input.fileData, 'base64');
            // Upload directly to R2 through backend
            const command = new client_s3_1.PutObjectCommand({
                Bucket: r2_storage_1.BUCKET_NAME,
                Key: s3Key,
                Body: fileBuffer,
                ContentType: input.mimeType,
            });
            await r2_storage_1.r2Client.send(command);
            // Create file metadata record
            const { data, error: dbError } = await ctx.supabase
                .from('file_metadata')
                .insert({
                user_id: userId,
                file_name: sanitizedFileName,
                file_type: validation.fileType,
                mime_type: input.mimeType,
                file_size: input.fileSize,
                s3_key: s3Key,
                s3_bucket: r2_storage_1.BUCKET_NAME,
                upload_status: 'completed',
                processing_status: media_processor_1.MediaProcessor.requiresProcessing(validation.fileType) ? 'pending' : 'completed',
            })
                .select('id')
                .single();
            if (dbError) {
                console.error('Database error creating file metadata:', dbError);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create file record',
                });
            }
            // Process video/image files for metadata and thumbnails
            if (media_processor_1.MediaProcessor.requiresProcessing(validation.fileType) && (validation.fileType === 'video' || validation.fileType === 'image')) {
                try {
                    const processing = await media_processor_1.MediaProcessor.processUploadedFile(fileBuffer, sanitizedFileName, validation.fileType, data.id);
                    // Upload thumbnail to R2
                    await (0, r2_storage_1.uploadThumbnail)(processing.thumbnailKey, processing.thumbnail);
                    // Update file metadata with processing results
                    const metadataField = validation.fileType === 'video' ? 'video_metadata' : 'image_metadata';
                    const { error: updateError } = await ctx.supabase
                        .from('file_metadata')
                        .update({
                        [metadataField]: processing.metadata,
                        thumbnail_url: processing.thumbnailKey,
                        processing_status: 'completed'
                    })
                        .eq('id', data.id);
                    if (updateError) {
                        console.error('Failed to update file metadata:', updateError);
                        // Don't throw error here - file upload was successful
                    }
                }
                catch (processingError) {
                    console.error('Media processing failed:', processingError);
                    // Update status to failed but don't throw error
                    await ctx.supabase
                        .from('file_metadata')
                        .update({ processing_status: 'failed' })
                        .eq('id', data.id);
                }
            }
            return {
                fileId: data.id,
                success: true,
                fileInfo: {
                    fileName: sanitizedFileName,
                    fileType: validation.fileType,
                    fileSize: input.fileSize,
                },
            };
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            console.error('Error uploading file:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to upload file',
            });
        }
    }),
    // Confirm upload completion
    confirmUpload: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        fileId: zod_1.z.string(),
        success: zod_1.z.boolean().optional().default(true)
    }))
        .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        try {
            // Get file metadata
            const { data: fileData, error: fetchError } = await ctx.supabase
                .from('file_metadata')
                .select('*')
                .eq('id', input.fileId)
                .eq('user_id', userId)
                .single();
            if (fetchError || !fileData) {
                throw new server_1.TRPCError({
                    code: 'NOT_FOUND',
                    message: 'File not found or access denied',
                });
            }
            // Update upload status
            const newStatus = input.success ? 'completed' : 'failed';
            const { error: updateError } = await ctx.supabase
                .from('file_metadata')
                .update({
                upload_status: newStatus,
                updated_at: new Date().toISOString(),
            })
                .eq('id', input.fileId)
                .eq('user_id', userId);
            if (updateError) {
                console.error('Database error updating file status:', updateError);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to update file status',
                });
            }
            // If upload failed, clean up S3
            if (!input.success) {
                try {
                    await (0, r2_storage_1.deleteFile)(fileData.s3_key);
                }
                catch (cleanupError) {
                    console.error('Failed to cleanup failed upload:', cleanupError);
                    // Don't throw - the database update was successful
                }
            }
            return {
                success: true,
                fileId: input.fileId,
                status: newStatus,
            };
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            console.error('Error confirming upload:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to confirm upload',
            });
        }
    }),
    // List user's files - EXTENDED
    getUserFiles: trpc_1.protectedProcedure
        .input(zod_1.z.object({
        fileType: zod_1.z.enum(['midi', 'audio', 'video', 'image', 'all']).optional().default('all'), // EXTENDED
        limit: zod_1.z.number().min(1).max(50).optional().default(20),
        offset: zod_1.z.number().min(0).optional().default(0),
    }))
        .query(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        try {
            let query = ctx.supabase
                .from('file_metadata')
                .select('*')
                .eq('user_id', userId)
                .eq('upload_status', 'completed')
                .order('created_at', { ascending: false })
                .range(input.offset, input.offset + input.limit - 1);
            if (input.fileType !== 'all') {
                query = query.eq('file_type', input.fileType);
            }
            const { data: files, error } = await query;
            if (error) {
                console.error('Database error fetching user files:', error);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch files',
                });
            }
            // Generate thumbnail URLs for files that have them
            const filesWithThumbnails = await Promise.all((files || []).map(async (file) => {
                if (file.thumbnail_url) {
                    try {
                        const thumbnailUrl = await (0, r2_storage_1.generateThumbnailUrl)(file.thumbnail_url);
                        return { ...file, thumbnail_url: thumbnailUrl };
                    }
                    catch (error) {
                        console.error('Failed to generate thumbnail URL:', error);
                        return file;
                    }
                }
                return file;
            }));
            return {
                files: filesWithThumbnails,
                hasMore: files?.length === input.limit,
            };
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            console.error('Error fetching user files:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch files',
            });
        }
    }),
    // Get download URL for a file
    getDownloadUrl: trpc_1.protectedProcedure
        .input(zod_1.z.object({ fileId: zod_1.z.string() }))
        .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        try {
            // Get file metadata
            const { data: fileData, error } = await ctx.supabase
                .from('file_metadata')
                .select('*')
                .eq('id', input.fileId)
                .eq('user_id', userId)
                .eq('upload_status', 'completed')
                .single();
            if (error || !fileData) {
                throw new server_1.TRPCError({
                    code: 'NOT_FOUND',
                    message: 'File not found or access denied',
                });
            }
            // Generate download URL
            const downloadUrl = await (0, r2_storage_1.generateDownloadUrl)(fileData.s3_key, 3600); // 1 hour expiry
            return {
                downloadUrl,
                fileName: fileData.file_name,
                fileSize: fileData.file_size,
                fileType: fileData.file_type,
                expiresIn: 3600,
            };
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            console.error('Error generating download URL:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to generate download URL',
            });
        }
    }),
    // Delete a file
    deleteFile: trpc_1.protectedProcedure
        .input(zod_1.z.object({ fileId: zod_1.z.string() }))
        .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        try {
            // Get file metadata
            const { data: fileData, error: fetchError } = await ctx.supabase
                .from('file_metadata')
                .select('*')
                .eq('id', input.fileId)
                .eq('user_id', userId)
                .single();
            if (fetchError || !fileData) {
                throw new server_1.TRPCError({
                    code: 'NOT_FOUND',
                    message: 'File not found or access denied',
                });
            }
            // Delete from S3
            await (0, r2_storage_1.deleteFile)(fileData.s3_key);
            // Delete from database
            const { error: deleteError } = await ctx.supabase
                .from('file_metadata')
                .delete()
                .eq('id', input.fileId)
                .eq('user_id', userId);
            if (deleteError) {
                console.error('Database error deleting file:', deleteError);
                throw new server_1.TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to delete file record',
                });
            }
            return {
                success: true,
                fileId: input.fileId,
            };
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            console.error('Error deleting file:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to delete file',
            });
        }
    }),
    // Get upload statistics for rate limiting
    getUploadStats: trpc_1.protectedProcedure
        .query(({ ctx }) => {
        const userId = ctx.user.id;
        const remainingUploads = uploadRateLimit.getRemainingUploads(userId);
        return {
            remainingUploads,
            maxUploadsPerMinute: 10,
            resetTime: Date.now() + (60 * 1000), // 1 minute from now
        };
    }),
    // Get processing status for video/image files
    getProcessingStatus: trpc_1.protectedProcedure
        .input(zod_1.z.object({ fileId: zod_1.z.string() }))
        .query(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        try {
            const { data: file, error } = await ctx.supabase
                .from('file_metadata')
                .select('processing_status, file_type, video_metadata, image_metadata, thumbnail_url')
                .eq('id', input.fileId)
                .eq('user_id', userId)
                .single();
            if (error || !file) {
                throw new server_1.TRPCError({
                    code: 'NOT_FOUND',
                    message: 'File not found or access denied',
                });
            }
            return {
                status: file.processing_status,
                fileType: file.file_type,
                hasMetadata: !!(file.video_metadata || file.image_metadata),
                hasThumbnail: !!file.thumbnail_url,
            };
        }
        catch (error) {
            if (error instanceof server_1.TRPCError)
                throw error;
            console.error('Error fetching processing status:', error);
            throw new server_1.TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch processing status',
            });
        }
    }),
});
//# sourceMappingURL=file.js.map
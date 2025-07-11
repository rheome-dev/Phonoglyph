import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { generateUploadUrl, generateDownloadUrl, generateS3Key, deleteFile, r2Client, BUCKET_NAME, uploadThumbnail, generateThumbnailKey, generateThumbnailUrl } from '../services/r2-storage'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { 
  validateFile, 
  FileUploadSchema, 
  createUploadRateLimit,
  isExecutableFile,
  sanitizeFileName 
} from '../lib/file-validation'
import { MediaProcessor } from '../services/media-processor'
import { AssetManager } from '../services/asset-manager'

// Create rate limiter instance
const uploadRateLimit = createUploadRateLimit()

// File metadata schema for database storage - EXTENDED
const FileMetadataSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  fileType: z.enum(['midi', 'audio', 'video', 'image']), // EXTENDED
  mimeType: z.string(),
  fileSize: z.number(),
  s3Key: z.string(),
  s3Bucket: z.string(),
  uploadStatus: z.enum(['uploading', 'completed', 'failed']),
})

export const fileRouter = router({
  
  // Generate pre-signed URL for file upload - EXTENDED
  getUploadUrl: protectedProcedure
    .input(FileUploadSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      
      try {
        // Rate limiting check
        if (!uploadRateLimit.checkRateLimit(userId)) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: 'Upload rate limit exceeded. Please wait before uploading more files.',
          })
        }

        // Security check - reject executable files
        if (isExecutableFile(input.fileName)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Executable files are not allowed for security reasons.',
          })
        }

        // Validate file
        const validation = validateFile(input)
        if (!validation.isValid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `File validation failed: ${validation.errors.join(', ')}`,
          })
        }

        // Sanitize file name and generate S3 key
        const sanitizedFileName = sanitizeFileName(input.fileName)
        const s3Key = generateS3Key(userId, sanitizedFileName, validation.fileType)

        // Generate pre-signed URL
        const uploadUrl = await generateUploadUrl(s3Key, input.mimeType, 3600) // 1 hour expiry

        // Create file metadata record in database
        const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2)}`
        
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
            s3_bucket: process.env.CLOUDFLARE_R2_BUCKET || 'phonoglyph-uploads',
            processing_status: MediaProcessor.requiresProcessing(validation.fileType) ? 'pending' : 'completed',
          })

        if (dbError) {
          console.error('Database error creating file metadata:', dbError)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create file record',
          })
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
        }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        console.error('Error generating upload URL:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate upload URL',
        })
      }
    }),

  // Direct upload endpoint to avoid CORS issues - EXTENDED
  uploadFile: protectedProcedure
    .input(z.object({
      fileName: z.string(),
      fileType: z.enum(['midi', 'audio', 'video', 'image']), // EXTENDED
      mimeType: z.string(),
      fileSize: z.number(),
      fileData: z.string(), // Base64 encoded file data
      projectId: z.string().optional(), // NEW: Associate with project
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      
      try {
        // Rate limiting check
        if (!uploadRateLimit.checkRateLimit(userId)) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: 'Upload rate limit exceeded. Please wait before uploading more files.',
          })
        }

        // Security check - reject executable files
        if (isExecutableFile(input.fileName)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Executable files are not allowed for security reasons.',
          })
        }

        // Validate file
        const validation = validateFile({
          fileName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
        })
        
        if (!validation.isValid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `File validation failed: ${validation.errors.join(', ')}`,
          })
        }

        // Sanitize file name and generate S3 key
        const sanitizedFileName = sanitizeFileName(input.fileName)
        const s3Key = generateS3Key(userId, sanitizedFileName, validation.fileType)

        // Decode base64 file data
        const fileBuffer = Buffer.from(input.fileData, 'base64')

        // Upload directly to R2 through backend
        const command = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: input.mimeType,
        })

        await r2Client.send(command)

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
            s3_bucket: BUCKET_NAME,
            upload_status: 'completed',
            processing_status: MediaProcessor.requiresProcessing(validation.fileType) ? 'pending' : 'completed',
            project_id: input.projectId, // NEW: Associate with project
          })
          .select('id')
          .single();

        if (dbError) {
          console.error('Database error creating file metadata:', dbError)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create file record',
          })
        }

        // Trigger audio analysis and caching for audio files
        if (validation.fileType === 'audio') {
          try {
            const { AudioAnalyzer } = await import('../services/audio-analyzer');
            const audioAnalyzer = new AudioAnalyzer();
            // Use the file name (without extension) as the stem type
            const stemType = sanitizedFileName.replace(/\.[^/.]+$/, '');
            await audioAnalyzer.analyzeAndCache(
              data.id,
              userId,
              stemType,
              fileBuffer
            );
            console.log(`✅ Audio analysis and caching complete for file ${sanitizedFileName} (stemType: ${stemType})`);
          } catch (analysisError) {
            console.error(`❌ Failed to analyze and cache audio file ${sanitizedFileName}:`, analysisError);
            // Do not throw, allow upload to succeed even if analysis fails
          }
        }

        // Process video/image files for metadata and thumbnails
        if (MediaProcessor.requiresProcessing(validation.fileType) && (validation.fileType === 'video' || validation.fileType === 'image')) {
          try {
            const processing = await MediaProcessor.processUploadedFile(
              fileBuffer,
              sanitizedFileName,
              validation.fileType,
              data.id
            )

            // Upload thumbnail to R2
            await uploadThumbnail(processing.thumbnailKey, processing.thumbnail)

            // Update file metadata with processing results
            const metadataField = validation.fileType === 'video' ? 'video_metadata' : 'image_metadata'
            const { error: updateError } = await ctx.supabase
              .from('file_metadata')
              .update({
                [metadataField]: processing.metadata,
                thumbnail_url: processing.thumbnailKey,
                processing_status: 'completed'
              })
              .eq('id', data.id)

            if (updateError) {
              console.error('Failed to update file metadata:', updateError)
              // Don't throw error here - file upload was successful
            }

          } catch (processingError) {
            console.error('Media processing failed:', processingError)
            // Update status to failed but don't throw error
            await ctx.supabase
              .from('file_metadata')
              .update({ processing_status: 'failed' })
              .eq('id', data.id)
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
        }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        console.error('Error uploading file:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to upload file',
        })
      }
    }),

  // Confirm upload completion
  confirmUpload: protectedProcedure
    .input(z.object({ 
      fileId: z.string(),
      success: z.boolean().optional().default(true)
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id

      try {
        // Get file metadata
        const { data: fileData, error: fetchError } = await ctx.supabase
          .from('file_metadata')
          .select('*')
          .eq('id', input.fileId)
          .eq('user_id', userId)
          .single()

        if (fetchError || !fileData) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'File not found or access denied',
          })
        }

        // Update upload status
        const newStatus = input.success ? 'completed' : 'failed'
        
        const { error: updateError } = await ctx.supabase
          .from('file_metadata')
          .update({ 
            upload_status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.fileId)
          .eq('user_id', userId)

        if (updateError) {
          console.error('Database error updating file status:', updateError)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update file status',
          })
        }

        // If upload failed, clean up S3
        if (!input.success) {
          try {
            await deleteFile(fileData.s3_key)
          } catch (cleanupError) {
            console.error('Failed to cleanup failed upload:', cleanupError)
            // Don't throw - the database update was successful
          }
        }

        return {
          success: true,
          fileId: input.fileId,
          status: newStatus,
        }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        console.error('Error confirming upload:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to confirm upload',
        })
      }
    }),

  // List user's files - EXTENDED
  getUserFiles: protectedProcedure
    .input(z.object({
      fileType: z.enum(['midi', 'audio', 'video', 'image', 'all']).optional().default('all'), // EXTENDED
      limit: z.number().min(1).max(50).optional().default(20),
      offset: z.number().min(0).optional().default(0),
      projectId: z.string().optional(), // NEW: Filter by project
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id

      try {
        let query = ctx.supabase
          .from('file_metadata')
          .select('*')
          .eq('user_id', userId)
          .eq('upload_status', 'completed')
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1)

        if (input.fileType !== 'all') {
          query = query.eq('file_type', input.fileType)
        }

        if (input.projectId) {
          query = query.eq('project_id', input.projectId)
        }

        const { data: files, error } = await query

        if (error) {
          console.error('Database error fetching user files:', error)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch files',
          })
        }

        // Generate thumbnail URLs for files that have them
        const filesWithThumbnails = await Promise.all(
          (files || []).map(async (file: any) => {
            if (file.thumbnail_url) {
              try {
                const thumbnailUrl = await generateThumbnailUrl(file.thumbnail_url)
                return { ...file, thumbnail_url: thumbnailUrl }
              } catch (error) {
                console.error('Failed to generate thumbnail URL:', error)
                return file
              }
            }
            return file
          })
        )

        return {
          files: filesWithThumbnails,
          hasMore: files?.length === input.limit,
        }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        console.error('Error fetching user files:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch files',
        })
      }
    }),

  // Get download URL for a file
  getDownloadUrl: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id

      try {
        // Get file metadata
        const { data: fileData, error } = await ctx.supabase
          .from('file_metadata')
          .select('*')
          .eq('id', input.fileId)
          .eq('user_id', userId)
          .eq('upload_status', 'completed')
          .single()

        if (error || !fileData) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'File not found or access denied',
          })
        }

        // Generate download URL
        const downloadUrl = await generateDownloadUrl(fileData.s3_key, 3600) // 1 hour expiry

        return {
          downloadUrl,
          fileName: fileData.file_name,
          fileSize: fileData.file_size,
          fileType: fileData.file_type,
          expiresIn: 3600,
        }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        console.error('Error generating download URL:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate download URL',
        })
      }
    }),

  // Delete a file
  deleteFile: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id

      try {
        // Get file metadata
        const { data: fileData, error: fetchError } = await ctx.supabase
          .from('file_metadata')
          .select('*')
          .eq('id', input.fileId)
          .eq('user_id', userId)
          .single()

        if (fetchError || !fileData) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'File not found or access denied',
          })
        }

        // Delete from S3
        await deleteFile(fileData.s3_key)

        // Delete from database
        const { error: deleteError } = await ctx.supabase
          .from('file_metadata')
          .delete()
          .eq('id', input.fileId)
          .eq('user_id', userId)

        if (deleteError) {
          console.error('Database error deleting file:', deleteError)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete file record',
          })
        }

        return {
          success: true,
          fileId: input.fileId,
        }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        console.error('Error deleting file:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete file',
        })
      }
    }),

  // Get upload statistics for rate limiting
  getUploadStats: protectedProcedure
    .query(({ ctx }) => {
      const userId = ctx.user.id
      const remainingUploads = uploadRateLimit.getRemainingUploads(userId)
      
      return {
        remainingUploads,
        maxUploadsPerMinute: 10,
        resetTime: Date.now() + (60 * 1000), // 1 minute from now
      }
    }),

  // Get processing status for video/image files
  getProcessingStatus: protectedProcedure
    .input(z.object({ fileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id

      try {
        const { data: file, error } = await ctx.supabase
          .from('file_metadata')
          .select('processing_status, file_type, video_metadata, image_metadata, thumbnail_url')
          .eq('id', input.fileId)
          .eq('user_id', userId)
          .single()

        if (error || !file) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'File not found or access denied',
          })
        }

        return {
          status: file.processing_status,
          fileType: file.file_type,
          hasMetadata: !!(file.video_metadata || file.image_metadata),
          hasThumbnail: !!file.thumbnail_url,
        }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        console.error('Error fetching processing status:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch processing status',
        })
      }
    }),

  // NEW: Asset Management Endpoints

  // Get project assets with enhanced filtering
  getProjectAssets: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      assetType: z.enum(['midi', 'audio', 'video', 'image', 'all']).optional().default('all'),
      usageStatus: z.enum(['active', 'referenced', 'unused', 'all']).optional().default('all'),
      folderId: z.string().optional(),
      tagIds: z.array(z.string()).optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).optional().default(50),
      offset: z.number().min(0).optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const assetManager = new AssetManager(ctx.supabase)

      try {
        let query = ctx.supabase
          .from('file_metadata')
          .select(`
            *,
            asset_folders(name),
            asset_tag_relationships(
              asset_tags(id, name, color)
            )
          `)
          .eq('user_id', userId)
          .eq('project_id', input.projectId)
          .eq('upload_status', 'completed')
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1)

        if (input.assetType !== 'all') {
          query = query.eq('asset_type', input.assetType)
        }

        if (input.usageStatus !== 'all') {
          query = query.eq('usage_status', input.usageStatus)
        }

        if (input.folderId) {
          query = query.eq('folder_id', input.folderId)
        }

        if (input.search) {
          query = query.ilike('file_name', `%${input.search}%`)
        }

        const { data: files, error } = await query

        if (error) {
          console.error('Database error fetching project assets:', error)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch project assets',
          })
        }

        // Filter by tags if specified
        let filteredFiles = files || []
        if (input.tagIds && input.tagIds.length > 0) {
          filteredFiles = filteredFiles.filter((file: any) => {
            const fileTags = file.asset_tag_relationships?.map((rel: any) => rel.asset_tags.id) || []
            return input.tagIds!.some(tagId => fileTags.includes(tagId))
          })
        }

        // Generate thumbnail URLs
        const filesWithThumbnails = await Promise.all(
          filteredFiles.map(async (file: any) => {
            if (file.thumbnail_url) {
              try {
                const thumbnailUrl = await generateThumbnailUrl(file.thumbnail_url)
                return { ...file, thumbnail_url: thumbnailUrl }
              } catch (error) {
                console.error('Failed to generate thumbnail URL:', error)
                return file
              }
            }
            return file
          })
        )

        return {
          files: filesWithThumbnails,
          hasMore: filteredFiles.length === input.limit,
        }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        console.error('Error fetching project assets:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch project assets',
        })
      }
    }),

  // Start asset usage tracking
  startAssetUsage: protectedProcedure
    .input(z.object({
      fileId: z.string(),
      projectId: z.string(),
      usageType: z.enum(['visualizer', 'composition', 'export']),
      usageContext: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const assetManager = new AssetManager(ctx.supabase)

      try {
        // Verify file belongs to user and project
        const { data: file, error: fileError } = await ctx.supabase
          .from('file_metadata')
          .select('id')
          .eq('id', input.fileId)
          .eq('user_id', userId)
          .eq('project_id', input.projectId)
          .single()

        if (fileError || !file) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'File not found or access denied',
          })
        }

        const usageId = await assetManager.startUsageTracking(
          input.fileId,
          input.projectId,
          input.usageType,
          input.usageContext
        )

        return { usageId }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        console.error('Error starting asset usage tracking:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to start usage tracking',
        })
      }
    }),

  // End asset usage tracking
  endAssetUsage: protectedProcedure
    .input(z.object({
      usageId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const assetManager = new AssetManager(ctx.supabase)

      try {
        // Verify usage record belongs to user
        const { data: usage, error: usageError } = await ctx.supabase
          .from('asset_usage')
          .select('id')
          .eq('id', input.usageId)
          .eq('project_id', 
            ctx.supabase
              .from('projects')
              .select('id')
              .eq('user_id', userId)
          )
          .single()

        if (usageError || !usage) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Usage record not found or access denied',
          })
        }

        await assetManager.endUsageTracking(input.usageId)

        return { success: true }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        console.error('Error ending asset usage tracking:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to end usage tracking',
        })
      }
    }),

  // Get storage quota for project
  getStorageQuota: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const assetManager = new AssetManager(ctx.supabase)

      try {
        // Verify project belongs to user
        const { data: project, error: projectError } = await ctx.supabase
          .from('projects')
          .select('id')
          .eq('id', input.projectId)
          .eq('user_id', userId)
          .single()

        if (projectError || !project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found or access denied',
          })
        }

        const quota = await assetManager.getStorageQuota(input.projectId)

        return quota

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        console.error('Error fetching storage quota:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch storage quota',
        })
      }
    }),

  // Create asset folder
  createAssetFolder: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      parentFolderId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const assetManager = new AssetManager(ctx.supabase)

      try {
        // Verify project belongs to user
        const { data: project, error: projectError } = await ctx.supabase
          .from('projects')
          .select('id')
          .eq('id', input.projectId)
          .eq('user_id', userId)
          .single()

        if (projectError || !project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found or access denied',
          })
        }

        const folder = await assetManager.createFolder(
          input.projectId,
          input.name,
          input.description,
          input.parentFolderId
        )

        return folder

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        console.error('Error creating asset folder:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create asset folder',
        })
      }
    }),

  // Get asset folders
  getAssetFolders: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const assetManager = new AssetManager(ctx.supabase)

      try {
        // Verify project belongs to user
        const { data: project, error: projectError } = await ctx.supabase
          .from('projects')
          .select('id')
          .eq('id', input.projectId)
          .eq('user_id', userId)
          .single()

        if (projectError || !project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found or access denied',
          })
        }

        const folders = await assetManager.getFolders(input.projectId)

        return folders

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        console.error('Error fetching asset folders:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch asset folders',
        })
      }
    }),

  // Create asset tag
  createAssetTag: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string().min(1).max(50),
      color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const assetManager = new AssetManager(ctx.supabase)

      try {
        // Verify project belongs to user
        const { data: project, error: projectError } = await ctx.supabase
          .from('projects')
          .select('id')
          .eq('id', input.projectId)
          .eq('user_id', userId)
          .single()

        if (projectError || !project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found or access denied',
          })
        }

        const tag = await assetManager.createTag(
          input.projectId,
          input.name,
          input.color
        )

        return tag

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        console.error('Error creating asset tag:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create asset tag',
        })
      }
    }),

  // Get asset tags
  getAssetTags: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const assetManager = new AssetManager(ctx.supabase)

      try {
        // Verify project belongs to user
        const { data: project, error: projectError } = await ctx.supabase
          .from('projects')
          .select('id')
          .eq('id', input.projectId)
          .eq('user_id', userId)
          .single()

        if (projectError || !project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found or access denied',
          })
        }

        const tags = await assetManager.getTags(input.projectId)

        return tags

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        console.error('Error fetching asset tags:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch asset tags',
        })
      }
    }),

  // Add tag to file
  addTagToFile: protectedProcedure
    .input(z.object({
      fileId: z.string(),
      tagId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const assetManager = new AssetManager(ctx.supabase)

      try {
        // Verify file belongs to user
        const { data: file, error: fileError } = await ctx.supabase
          .from('file_metadata')
          .select('id')
          .eq('id', input.fileId)
          .eq('user_id', userId)
          .single()

        if (fileError || !file) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'File not found or access denied',
          })
        }

        await assetManager.addTagToFile(input.fileId, input.tagId)

        return { success: true }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        console.error('Error adding tag to file:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add tag to file',
        })
      }
    }),

  // Remove tag from file
  removeTagFromFile: protectedProcedure
    .input(z.object({
      fileId: z.string(),
      tagId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const assetManager = new AssetManager(ctx.supabase)

      try {
        // Verify file belongs to user
        const { data: file, error: fileError } = await ctx.supabase
          .from('file_metadata')
          .select('id')
          .eq('id', input.fileId)
          .eq('user_id', userId)
          .single()

        if (fileError || !file) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'File not found or access denied',
          })
        }

        await assetManager.removeTagFromFile(input.fileId, input.tagId)

        return { success: true }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        console.error('Error removing tag from file:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to remove tag from file',
        })
      }
    }),

  // Replace asset
  replaceAsset: protectedProcedure
    .input(z.object({
      oldFileId: z.string(),
      newFileId: z.string(),
      preserveMetadata: z.boolean().optional().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const assetManager = new AssetManager(ctx.supabase)

      try {
        // Verify both files belong to user
        const { data: files, error: filesError } = await ctx.supabase
          .from('file_metadata')
          .select('id')
          .in('id', [input.oldFileId, input.newFileId])
          .eq('user_id', userId)

        if (filesError || !files || files.length !== 2) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'One or both files not found or access denied',
          })
        }

        await assetManager.replaceAsset(
          input.oldFileId,
          input.newFileId,
          input.preserveMetadata
        )

        return { success: true }

      } catch (error) {
        if (error instanceof TRPCError) throw error
        
        console.error('Error replacing asset:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to replace asset',
        })
      }
    }),
}) 
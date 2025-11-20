import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { logger } from '../lib/logger'

export const assetRouter = router({
  // Create a new asset collection
  createCollection: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string().min(1),
      type: z.enum(['image_slideshow', 'generic']).default('generic'),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      
      try {
        // Verify project ownership
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

        const { data: collection, error } = await ctx.supabase
          .from('asset_collections')
          .insert({
            project_id: input.projectId,
            user_id: userId,
            name: input.name,
            type: input.type,
          })
          .select()
          .single()

        if (error) {
          logger.error('Database error creating collection:', error)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create collection',
          })
        }

        return collection
      } catch (error) {
        if (error instanceof TRPCError) throw error
        logger.error('Error creating collection:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create collection',
        })
      }
    }),

  // Add a file to a collection
  addFileToCollection: protectedProcedure
    .input(z.object({
      collectionId: z.string(),
      fileId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id

      try {
        // Verify collection ownership
        const { data: collection, error: collectionError } = await ctx.supabase
          .from('asset_collections')
          .select('id, project_id')
          .eq('id', input.collectionId)
          .eq('user_id', userId)
          .single()

        if (collectionError || !collection) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Collection not found or access denied',
          })
        }

        // Verify file ownership and project match (optional constraint, but good practice)
        // We allow files from different projects if they belong to the user, or restrict to same project?
        // For now, just check user ownership.
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

        // Get current max order
        const { data: maxOrderData, error: maxOrderError } = await ctx.supabase
          .from('asset_collection_items')
          .select('order')
          .eq('collection_id', input.collectionId)
          .order('order', { ascending: false })
          .limit(1)

        const nextOrder = maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].order + 1 : 0

        const { data: item, error } = await ctx.supabase
          .from('asset_collection_items')
          .insert({
            collection_id: input.collectionId,
            file_id: input.fileId,
            order: nextOrder,
          })
          .select()
          .single()

        if (error) {
          logger.error('Database error adding file to collection:', error)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to add file to collection',
          })
        }

        return item
      } catch (error) {
        if (error instanceof TRPCError) throw error
        logger.error('Error adding file to collection:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to add file to collection',
        })
      }
    }),

  // Get a collection with its items
  getCollection: protectedProcedure
    .input(z.object({
      collectionId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id

      try {
        const { data: collection, error } = await ctx.supabase
          .from('asset_collections')
          .select(`
            *,
            items:asset_collection_items(
              *,
              file:file_metadata(*)
            )
          `)
          .eq('id', input.collectionId)
          .eq('user_id', userId)
          .single()

        if (error || !collection) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Collection not found or access denied',
          })
        }
        
        // Sort items by order (supabase select ordering on related tables can be tricky, doing it in JS for safety)
        if (collection.items) {
            collection.items.sort((a: any, b: any) => a.order - b.order);
        }

        return collection
      } catch (error) {
        if (error instanceof TRPCError) throw error
        logger.error('Error fetching collection:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch collection',
        })
      }
    }),
    
  // Get all collections for a project
  getProjectCollections: protectedProcedure
    .input(z.object({
        projectId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
        const userId = ctx.user.id
        
        try {
            const { data: collections, error } = await ctx.supabase
                .from('asset_collections')
                .select('*')
                .eq('project_id', input.projectId)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                
            if (error) {
                logger.error('Database error fetching project collections:', error)
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch project collections'
                })
            }
            
            return collections
        } catch (error) {
            if (error instanceof TRPCError) throw error
            logger.error('Error fetching project collections:', error)
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch project collections'
            })
        }
    })
})


import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AssetManager } from '../services/asset-manager'
import { createTestSupabaseClient } from './helpers/test-supabase'

describe('AssetManager', () => {
  let assetManager: AssetManager
  let testSupabase: any

  beforeEach(async () => {
    testSupabase = createTestSupabaseClient()
    assetManager = new AssetManager(testSupabase)
  })

  afterEach(async () => {
    // Clean up test data
    await testSupabase.from('asset_usage').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await testSupabase.from('asset_tag_relationships').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await testSupabase.from('asset_tags').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await testSupabase.from('asset_folders').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await testSupabase.from('project_storage_quotas').delete().neq('project_id', 'test')
    await testSupabase.from('file_metadata').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await testSupabase.from('projects').delete().neq('id', 'test')
  })

  describe('Asset Usage Tracking', () => {
    it('should start usage tracking for a file', async () => {
      // Create test project and file
      const projectId = 'test-project-1'
      const fileId = 'test-file-1'
      
      await testSupabase.from('projects').insert({
        id: projectId,
        user_id: 'test-user',
        name: 'Test Project'
      })

      await testSupabase.from('file_metadata').insert({
        id: fileId,
        user_id: 'test-user',
        project_id: projectId,
        file_name: 'test.mid',
        file_type: 'midi',
        mime_type: 'audio/midi',
        file_size: 1024,
        s3_key: 'test-key',
        s3_bucket: 'test-bucket',
        upload_status: 'completed'
      })

      const usageId = await assetManager.startUsageTracking(
        fileId,
        projectId,
        'visualizer',
        { settings: { tempo: 120 } }
      )

      expect(usageId).toBeDefined()

      // Verify usage record was created
      const { data: usage } = await testSupabase
        .from('asset_usage')
        .select('*')
        .eq('id', usageId)
        .single()

      expect(usage).toBeDefined()
      expect(usage.file_id).toBe(fileId)
      expect(usage.project_id).toBe(projectId)
      expect(usage.usage_type).toBe('visualizer')
      expect(usage.usage_context).toEqual({ settings: { tempo: 120 } })
      expect(usage.ended_at).toBeNull()

      // Verify file usage status was updated
      const { data: file } = await testSupabase
        .from('file_metadata')
        .select('usage_status, last_used_at')
        .eq('id', fileId)
        .single()

      expect(file.usage_status).toBe('active')
      expect(file.last_used_at).toBeDefined()
    })

    it('should end usage tracking', async () => {
      // Create test usage record
      const usageId = 'test-usage-1'
      await testSupabase.from('asset_usage').insert({
        id: usageId,
        file_id: 'test-file-1',
        project_id: 'test-project-1',
        usage_type: 'visualizer',
        usage_context: {},
        started_at: new Date().toISOString()
      })

      await assetManager.endUsageTracking(usageId)

      // Verify usage record was updated
      const { data: usage } = await testSupabase
        .from('asset_usage')
        .select('ended_at')
        .eq('id', usageId)
        .single()

      expect(usage.ended_at).toBeDefined()
    })

    it('should update file usage status', async () => {
      const fileId = 'test-file-1'
      await testSupabase.from('file_metadata').insert({
        id: fileId,
        user_id: 'test-user',
        project_id: 'test-project-1',
        file_name: 'test.mid',
        file_type: 'midi',
        mime_type: 'audio/midi',
        file_size: 1024,
        s3_key: 'test-key',
        s3_bucket: 'test-bucket',
        upload_status: 'completed'
      })

      await assetManager.updateFileUsageStatus(fileId, 'referenced')

      const { data: file } = await testSupabase
        .from('file_metadata')
        .select('usage_status, last_used_at')
        .eq('id', fileId)
        .single()

      expect(file.usage_status).toBe('referenced')
      expect(file.last_used_at).toBeDefined()
    })

    it('should get asset usage history', async () => {
      const fileId = 'test-file-1'
      const projectId = 'test-project-1'

      // Create test usage records
      await testSupabase.from('asset_usage').insert([
        {
          file_id: fileId,
          project_id: projectId,
          usage_type: 'visualizer',
          usage_context: { session: 1 },
          started_at: new Date(Date.now() - 1000).toISOString(),
          ended_at: new Date().toISOString()
        },
        {
          file_id: fileId,
          project_id: projectId,
          usage_type: 'composition',
          usage_context: { session: 2 },
          started_at: new Date().toISOString()
        }
      ])

      const usage = await assetManager.getAssetUsage(fileId, projectId)

      expect(usage).toHaveLength(2)
      expect(usage[0].usageType).toBe('composition') // Most recent first
      expect(usage[1].usageType).toBe('visualizer')
    })
  })

  describe('Storage Quota Management', () => {
    it('should get storage quota for project', async () => {
      const projectId = 'test-project-1'

      // Create test quota
      await testSupabase.from('project_storage_quotas').insert({
        project_id: projectId,
        user_subscription_tier: 'free',
        total_limit_bytes: 104857600,
        used_bytes: 52428800,
        file_count_limit: 10,
        file_count_used: 5,
        per_file_size_limit: 52428800
      })

      const quota = await assetManager.getStorageQuota(projectId)

      expect(quota.projectId).toBe(projectId)
      expect(quota.userSubscriptionTier).toBe('free')
      expect(quota.totalLimitBytes).toBe(104857600)
      expect(quota.usedBytes).toBe(52428800)
      expect(quota.fileCountLimit).toBe(10)
      expect(quota.fileCountUsed).toBe(5)
    })

    it('should check storage quota before upload', async () => {
      const projectId = 'test-project-1'

      // Create test quota with limited space
      await testSupabase.from('project_storage_quotas').insert({
        project_id: projectId,
        user_subscription_tier: 'free',
        total_limit_bytes: 104857600, // 100MB
        used_bytes: 94371840, // 90MB used
        file_count_limit: 10,
        file_count_used: 5,
        per_file_size_limit: 52428800
      })

      // Check if 20MB file can be uploaded
      const result = await assetManager.checkStorageQuota(projectId, 20 * 1024 * 1024)

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Storage limit exceeded')
    })

    it('should allow upload within quota limits', async () => {
      const projectId = 'test-project-1'

      await testSupabase.from('project_storage_quotas').insert({
        project_id: projectId,
        user_subscription_tier: 'free',
        total_limit_bytes: 104857600,
        used_bytes: 52428800,
        file_count_limit: 10,
        file_count_used: 5,
        per_file_size_limit: 52428800
      })

      const result = await assetManager.checkStorageQuota(projectId, 10 * 1024 * 1024)

      expect(result.allowed).toBe(true)
    })
  })

  describe('Asset Organization', () => {
    it('should create asset folder', async () => {
      const projectId = 'test-project-1'
      await testSupabase.from('projects').insert({
        id: projectId,
        user_id: 'test-user',
        name: 'Test Project'
      })

      const folder = await assetManager.createFolder(
        projectId,
        'Test Folder',
        'Test description'
      )

      expect(folder.projectId).toBe(projectId)
      expect(folder.name).toBe('Test Folder')
      expect(folder.description).toBe('Test description')
      expect(folder.id).toBeDefined()
    })

    it('should get asset folders for project', async () => {
      const projectId = 'test-project-1'
      await testSupabase.from('projects').insert({
        id: projectId,
        user_id: 'test-user',
        name: 'Test Project'
      })

      // Create test folders
      await testSupabase.from('asset_folders').insert([
        {
          project_id: projectId,
          name: 'Folder 1',
          description: 'First folder'
        },
        {
          project_id: projectId,
          name: 'Folder 2',
          description: 'Second folder'
        }
      ])

      const folders = await assetManager.getFolders(projectId)

      expect(folders).toHaveLength(2)
      expect(folders[0].name).toBe('Folder 1')
      expect(folders[1].name).toBe('Folder 2')
    })

    it('should create asset tag', async () => {
      const projectId = 'test-project-1'
      await testSupabase.from('projects').insert({
        id: projectId,
        user_id: 'test-user',
        name: 'Test Project'
      })

      const tag = await assetManager.createTag(
        projectId,
        'Test Tag',
        '#FF0000'
      )

      expect(tag.projectId).toBe(projectId)
      expect(tag.name).toBe('Test Tag')
      expect(tag.color).toBe('#FF0000')
      expect(tag.id).toBeDefined()
    })

    it('should get asset tags for project', async () => {
      const projectId = 'test-project-1'
      await testSupabase.from('projects').insert({
        id: projectId,
        user_id: 'test-user',
        name: 'Test Project'
      })

      // Create test tags
      await testSupabase.from('asset_tags').insert([
        {
          project_id: projectId,
          name: 'Tag 1',
          color: '#FF0000'
        },
        {
          project_id: projectId,
          name: 'Tag 2',
          color: '#00FF00'
        }
      ])

      const tags = await assetManager.getTags(projectId)

      expect(tags).toHaveLength(2)
      expect(tags[0].name).toBe('Tag 1')
      expect(tags[1].name).toBe('Tag 2')
    })

    it('should add and remove tags from files', async () => {
      const fileId = 'test-file-1'
      const tagId = 'test-tag-1'

      // Create test file and tag
      await testSupabase.from('file_metadata').insert({
        id: fileId,
        user_id: 'test-user',
        project_id: 'test-project-1',
        file_name: 'test.mid',
        file_type: 'midi',
        mime_type: 'audio/midi',
        file_size: 1024,
        s3_key: 'test-key',
        s3_bucket: 'test-bucket',
        upload_status: 'completed'
      })

      await testSupabase.from('asset_tags').insert({
        id: tagId,
        project_id: 'test-project-1',
        name: 'Test Tag',
        color: '#FF0000'
      })

      // Add tag to file
      await assetManager.addTagToFile(fileId, tagId)

      let fileTags = await assetManager.getFileTags(fileId)
      expect(fileTags).toHaveLength(1)
      expect(fileTags[0].id).toBe(tagId)

      // Remove tag from file
      await assetManager.removeTagFromFile(fileId, tagId)

      fileTags = await assetManager.getFileTags(fileId)
      expect(fileTags).toHaveLength(0)
    })
  })

  describe('Asset Replacement', () => {
    it('should replace asset while preserving metadata', async () => {
      const oldFileId = 'old-file-1'
      const newFileId = 'new-file-1'
      const tagId = 'test-tag-1'

      // Create test files
      await testSupabase.from('file_metadata').insert([
        {
          id: oldFileId,
          user_id: 'test-user',
          project_id: 'test-project-1',
          file_name: 'old.mid',
          file_type: 'midi',
          mime_type: 'audio/midi',
          file_size: 1024,
          s3_key: 'old-key',
          s3_bucket: 'test-bucket',
          upload_status: 'completed',
          asset_type: 'midi',
          is_primary: true,
          usage_status: 'active',
          folder_id: 'test-folder-1'
        },
        {
          id: newFileId,
          user_id: 'test-user',
          project_id: 'test-project-1',
          file_name: 'new.mid',
          file_type: 'midi',
          mime_type: 'audio/midi',
          file_size: 2048,
          s3_key: 'new-key',
          s3_bucket: 'test-bucket',
          upload_status: 'completed'
        }
      ])

      // Create test tag and add to old file
      await testSupabase.from('asset_tags').insert({
        id: tagId,
        project_id: 'test-project-1',
        name: 'Test Tag',
        color: '#FF0000'
      })

      await testSupabase.from('asset_tag_relationships').insert({
        file_id: oldFileId,
        tag_id: tagId
      })

      // Replace asset
      await assetManager.replaceAsset(oldFileId, newFileId, true)

      // Verify new file has old file's metadata
      const { data: newFile } = await testSupabase
        .from('file_metadata')
        .select('*')
        .eq('id', newFileId)
        .single()

      expect(newFile.asset_type).toBe('midi')
      expect(newFile.is_primary).toBe(true)
      expect(newFile.usage_status).toBe('active')
      expect(newFile.folder_id).toBe('test-folder-1')
      expect(newFile.replacement_history).toContain(oldFileId)

      // Verify new file has the tag
      const newFileTags = await assetManager.getFileTags(newFileId)
      expect(newFileTags).toHaveLength(1)
      expect(newFileTags[0].id).toBe(tagId)

      // Verify old file is marked as unused
      const { data: oldFile } = await testSupabase
        .from('file_metadata')
        .select('usage_status, is_primary')
        .eq('id', oldFileId)
        .single()

      expect(oldFile.usage_status).toBe('unused')
      expect(oldFile.is_primary).toBe(false)
    })
  })
}) 
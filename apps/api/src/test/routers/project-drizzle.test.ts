import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../../db/drizzle';
import { projects } from '../../db/schema';
import { eq } from 'drizzle-orm';

describe('Project Router Drizzle Operations', () => {
  const testUserId = 'test-user-123';
  const testProjectData = {
    id: 'test-project-456',
    name: 'Test Project',
    description: 'A test project for Drizzle operations',
    privacySetting: 'private' as const,
    userId: testUserId,
    midiFilePath: '/test/midi/file.mid',
    audioFilePath: '/test/audio/file.wav',
    userVideoPath: null,
    renderConfiguration: { tempo: 120, effects: ['reverb'] },
  };

  afterEach(async () => {
    // Clean up test data
    await db
      .delete(projects)
      .where(eq(projects.userId, testUserId));
  });

  describe('Project CRUD Operations', () => {
    it('should create a project with type safety', async () => {
      const newProject = await db
        .insert(projects)
        .values(testProjectData)
        .returning();

      expect(newProject).toHaveLength(1);
      expect(newProject[0].id).toBe(testProjectData.id);
      expect(newProject[0].name).toBe(testProjectData.name);
      expect(newProject[0].userId).toBe(testUserId);
      expect(newProject[0].renderConfiguration).toEqual(testProjectData.renderConfiguration);
    });

    it('should retrieve projects for a user', async () => {
      // Create test project
      await db.insert(projects).values(testProjectData);

      // Retrieve projects
      const userProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, testUserId));

      expect(userProjects).toHaveLength(1);
      expect(userProjects[0].name).toBe(testProjectData.name);
    });

    it('should update a project with type safety', async () => {
      // Create test project
      await db.insert(projects).values(testProjectData);

      // Update project
      const updatedProject = await db
        .update(projects)
        .set({
          name: 'Updated Project Name',
          description: 'Updated description',
          renderConfiguration: { tempo: 140, effects: ['delay', 'reverb'] },
        })
        .where(eq(projects.id, testProjectData.id))
        .returning();

      expect(updatedProject).toHaveLength(1);
      expect(updatedProject[0].name).toBe('Updated Project Name');
      expect(updatedProject[0].description).toBe('Updated description');
      expect(updatedProject[0].renderConfiguration).toEqual({
        tempo: 140,
        effects: ['delay', 'reverb']
      });
    });

    it('should delete a project', async () => {
      // Create test project
      await db.insert(projects).values(testProjectData);

      // Delete project
      const deletedProject = await db
        .delete(projects)
        .where(eq(projects.id, testProjectData.id))
        .returning();

      expect(deletedProject).toHaveLength(1);

      // Verify deletion
      const remainingProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.id, testProjectData.id));

      expect(remainingProjects).toHaveLength(0);
    });

    it('should enforce user isolation', async () => {
      const otherUserId = 'other-user-789';
      
      // Create project for test user
      await db.insert(projects).values(testProjectData);

      // Try to retrieve as different user
      const otherUserProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, otherUserId));

      expect(otherUserProjects).toHaveLength(0);
    });

    it('should handle JSONB render configuration correctly', async () => {
      const complexRenderConfig = {
        tempo: 120,
        effects: ['reverb', 'delay', 'chorus'],
        visualSettings: {
          colorScheme: 'neon',
          particleCount: 1000,
          bloomIntensity: 0.8
        },
        audioSettings: {
          masterVolume: 0.9,
          stemVolumes: {
            drums: 0.8,
            bass: 0.7,
            vocals: 0.9,
            other: 0.6
          }
        }
      };

      const projectWithComplexConfig = {
        ...testProjectData,
        id: 'complex-config-project',
        renderConfiguration: complexRenderConfig
      };

      // Insert project with complex configuration
      const newProject = await db
        .insert(projects)
        .values(projectWithComplexConfig)
        .returning();

      expect(newProject[0].renderConfiguration).toEqual(complexRenderConfig);

      // Retrieve and verify
      const retrievedProject = await db
        .select()
        .from(projects)
        .where(eq(projects.id, 'complex-config-project'));

      expect(retrievedProject[0].renderConfiguration).toEqual(complexRenderConfig);
    });

    it('should handle null values correctly', async () => {
      const projectWithNulls = {
        ...testProjectData,
        id: 'null-values-project',
        description: null,
        audioFilePath: null,
        userVideoPath: null
      };

      const newProject = await db
        .insert(projects)
        .values(projectWithNulls)
        .returning();

      expect(newProject[0].description).toBeNull();
      expect(newProject[0].audioFilePath).toBeNull();
      expect(newProject[0].userVideoPath).toBeNull();
    });

    it('should automatically set timestamps', async () => {
      const beforeInsert = new Date();
      
      const newProject = await db
        .insert(projects)
        .values(testProjectData)
        .returning();

      const afterInsert = new Date();

      expect(newProject[0].createdAt).toBeInstanceOf(Date);
      expect(newProject[0].updatedAt).toBeInstanceOf(Date);
      expect(newProject[0].createdAt.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime());
      expect(newProject[0].createdAt.getTime()).toBeLessThanOrEqual(afterInsert.getTime());
    });
  });

  describe('Type Safety Validation', () => {
    it('should enforce required fields at compile time', () => {
      // This test validates TypeScript compilation
      // If this compiles, the type safety is working
      
      const validProject = {
        id: 'valid-project',
        name: 'Valid Project',
        userId: testUserId,
        midiFilePath: '/path/to/midi',
        renderConfiguration: {}
      };

      // This should compile without errors
      expect(() => {
        db.insert(projects).values(validProject);
      }).not.toThrow();
    });

    it('should provide proper IntelliSense for select operations', async () => {
      await db.insert(projects).values(testProjectData);

      const result = await db
        .select({
          projectId: projects.id,
          projectName: projects.name,
          createdDate: projects.createdAt
        })
        .from(projects)
        .where(eq(projects.userId, testUserId));

      expect(result[0]).toHaveProperty('projectId');
      expect(result[0]).toHaveProperty('projectName');
      expect(result[0]).toHaveProperty('createdDate');
      expect(result[0].projectName).toBe(testProjectData.name);
    });
  });
});

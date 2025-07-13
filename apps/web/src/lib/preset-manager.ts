// Preset Management System for Story 5.3: Stem-based Visualization Control
// Handles saving, loading, sharing, and organizing visualization presets

import { 
  VisualizationPreset, 
  StemVisualizationMapping,
  PRESET_CATEGORIES 
} from '@/types/stem-visualization';
import { 
  DEFAULT_PRESETS, 
  createCustomPreset,
  getPresetById 
} from '@/lib/default-visualization-mappings';

// Storage keys for local persistence
const STORAGE_KEYS = {
  CUSTOM_PRESETS: 'midiviz_custom_presets',
  PRESET_USAGE: 'midiviz_preset_usage',
  FAVORITE_PRESETS: 'midiviz_favorite_presets',
  PRESET_CACHE: 'midiviz_preset_cache',
  USER_CATEGORIES: 'midiviz_user_categories'
} as const;

// Preset operation results
export interface PresetOperationResult {
  success: boolean;
  preset?: VisualizationPreset;
  error?: string;
  message?: string;
}

// Preset search and filter options
export interface PresetFilterOptions {
  category?: keyof typeof PRESET_CATEGORIES | 'custom' | 'favorites';
  tags?: string[];
  searchTerm?: string;
  sortBy?: 'name' | 'usage' | 'date' | 'category';
  sortOrder?: 'asc' | 'desc';
  showDefaults?: boolean;
  showCustom?: boolean;
}

// Preset usage analytics
export interface PresetUsageStats {
  presetId: string;
  usageCount: number;
  lastUsed: string;
  totalTimeUsed: number; // in milliseconds
  averageSessionLength: number;
  tags: string[];
}

// Export/Import data structure
export interface PresetExportData {
  version: string;
  exportDate: string;
  presets: VisualizationPreset[];
  metadata: {
    totalPresets: number;
    categories: string[];
    exportedBy?: string;
  };
}

export class PresetManager {
  private customPresets: Map<string, VisualizationPreset> = new Map();
  private presetUsage: Map<string, PresetUsageStats> = new Map();
  private favoritePresets: Set<string> = new Set();
  private userCategories: Map<string, string[]> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  // Initialize the preset manager
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadFromStorage();
      this.isInitialized = true;
      console.log('📦 PresetManager initialized with', this.customPresets.size, 'custom presets');
    } catch (error) {
      console.error('Failed to initialize PresetManager:', error);
    }
  }

  // Load presets from local storage
  private async loadFromStorage(): Promise<void> {
    try {
      // Load custom presets
      const customPresetsData = localStorage.getItem(STORAGE_KEYS.CUSTOM_PRESETS);
      if (customPresetsData) {
        const presets: VisualizationPreset[] = JSON.parse(customPresetsData);
        presets.forEach(preset => {
          this.customPresets.set(preset.id, preset);
        });
      }

      // Load usage stats
      const usageData = localStorage.getItem(STORAGE_KEYS.PRESET_USAGE);
      if (usageData) {
        const usage: Record<string, PresetUsageStats> = JSON.parse(usageData);
        Object.entries(usage).forEach(([id, stats]) => {
          this.presetUsage.set(id, stats);
        });
      }

      // Load favorites
      const favoritesData = localStorage.getItem(STORAGE_KEYS.FAVORITE_PRESETS);
      if (favoritesData) {
        const favorites: string[] = JSON.parse(favoritesData);
        this.favoritePresets = new Set(favorites);
      }

      // Load user categories
      const categoriesData = localStorage.getItem(STORAGE_KEYS.USER_CATEGORIES);
      if (categoriesData) {
        const categories: Record<string, string[]> = JSON.parse(categoriesData);
        Object.entries(categories).forEach(([category, presetIds]) => {
          this.userCategories.set(category, presetIds);
        });
      }
    } catch (error) {
      console.error('Error loading presets from storage:', error);
    }
  }

  // Save presets to local storage
  private async saveToStorage(): Promise<void> {
    try {
      // Save custom presets
      const customPresetsArray = Array.from(this.customPresets.values());
      localStorage.setItem(STORAGE_KEYS.CUSTOM_PRESETS, JSON.stringify(customPresetsArray));

      // Save usage stats
      const usageObject = Object.fromEntries(this.presetUsage);
      localStorage.setItem(STORAGE_KEYS.PRESET_USAGE, JSON.stringify(usageObject));

      // Save favorites
      const favoritesArray = Array.from(this.favoritePresets);
      localStorage.setItem(STORAGE_KEYS.FAVORITE_PRESETS, JSON.stringify(favoritesArray));

      // Save user categories
      const categoriesObject = Object.fromEntries(this.userCategories);
      localStorage.setItem(STORAGE_KEYS.USER_CATEGORIES, JSON.stringify(categoriesObject));
    } catch (error) {
      console.error('Error saving presets to storage:', error);
      throw error;
    }
  }

  // Create a new custom preset
  async createPreset(
    name: string,
    description: string,
    mappings: Record<string, StemVisualizationMapping>,
    options: {
      category?: 'custom';
      tags?: string[];
      basePresetId?: string;
      settings?: VisualizationPreset['defaultSettings'];
    } = {}
  ): Promise<PresetOperationResult> {
    await this.initialize();

    try {
      // Validate name uniqueness
      if (this.isNameTaken(name)) {
        return {
          success: false,
          error: 'DUPLICATE_NAME',
          message: `Preset name "${name}" already exists`
        };
      }

      const preset: VisualizationPreset = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        description,
        category: options.category || 'custom',
        tags: options.tags || [],
        mappings,
        defaultSettings: options.settings || {
          masterIntensity: 1.0,
          transitionSpeed: 0.5,
          backgroundAlpha: 0.3,
          particleCount: 5000,
          qualityLevel: 'medium'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: undefined, // Will be set if user auth is available
        isDefault: false,
        usageCount: 0
      };

      // Store the preset
      this.customPresets.set(preset.id, preset);
      await this.saveToStorage();

      console.log(`✅ Created custom preset: ${name}`);
      return {
        success: true,
        preset,
        message: `Preset "${name}" created successfully`
      };
    } catch (error) {
      console.error('Error creating preset:', error);
      return {
        success: false,
        error: 'CREATE_FAILED',
        message: 'Failed to create preset'
      };
    }
  }

  // Update an existing preset
  async updatePreset(
    presetId: string,
    updates: Partial<Omit<VisualizationPreset, 'id' | 'createdAt' | 'isDefault'>>
  ): Promise<PresetOperationResult> {
    await this.initialize();

    try {
      const existingPreset = this.customPresets.get(presetId);
      if (!existingPreset) {
        return {
          success: false,
          error: 'PRESET_NOT_FOUND',
          message: `Preset with ID "${presetId}" not found`
        };
      }

      // Check if new name conflicts with existing presets
      if (updates.name && updates.name !== existingPreset.name && this.isNameTaken(updates.name)) {
        return {
          success: false,
          error: 'DUPLICATE_NAME',
          message: `Preset name "${updates.name}" already exists`
        };
      }

      const updatedPreset: VisualizationPreset = {
        ...existingPreset,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      this.customPresets.set(presetId, updatedPreset);
      await this.saveToStorage();

      console.log(`🔄 Updated preset: ${updatedPreset.name}`);
      return {
        success: true,
        preset: updatedPreset,
        message: `Preset "${updatedPreset.name}" updated successfully`
      };
    } catch (error) {
      console.error('Error updating preset:', error);
      return {
        success: false,
        error: 'UPDATE_FAILED',
        message: 'Failed to update preset'
      };
    }
  }

  // Delete a custom preset
  async deletePreset(presetId: string): Promise<PresetOperationResult> {
    await this.initialize();

    try {
      const preset = this.customPresets.get(presetId);
      if (!preset) {
        return {
          success: false,
          error: 'PRESET_NOT_FOUND',
          message: `Preset with ID "${presetId}" not found`
        };
      }

      // Cannot delete default presets
      if (preset.isDefault) {
        return {
          success: false,
          error: 'CANNOT_DELETE_DEFAULT',
          message: 'Cannot delete default presets'
        };
      }

      // Remove from collections
      this.customPresets.delete(presetId);
      this.favoritePresets.delete(presetId);
      this.presetUsage.delete(presetId);

      // Remove from user categories
      this.userCategories.forEach((presetIds, category) => {
        const index = presetIds.indexOf(presetId);
        if (index > -1) {
          presetIds.splice(index, 1);
        }
      });

      await this.saveToStorage();

      console.log(`🗑️ Deleted preset: ${preset.name}`);
      return {
        success: true,
        message: `Preset "${preset.name}" deleted successfully`
      };
    } catch (error) {
      console.error('Error deleting preset:', error);
      return {
        success: false,
        error: 'DELETE_FAILED',
        message: 'Failed to delete preset'
      };
    }
  }

  // Get all presets (default + custom) with filtering
  async getPresets(options: PresetFilterOptions = {}): Promise<VisualizationPreset[]> {
    await this.initialize();

    let allPresets: VisualizationPreset[] = [];

    // Include default presets if requested
    if (options.showDefaults !== false) {
      allPresets.push(...DEFAULT_PRESETS);
    }

    // Include custom presets if requested
    if (options.showCustom !== false) {
      allPresets.push(...Array.from(this.customPresets.values()));
    }

    // Apply filters
    let filteredPresets = allPresets;

    // Category filter
    if (options.category) {
      if (options.category === 'favorites') {
        filteredPresets = filteredPresets.filter(p => this.favoritePresets.has(p.id));
      } else {
        filteredPresets = filteredPresets.filter(p => p.category === options.category);
      }
    }

    // Tags filter
    if (options.tags && options.tags.length > 0) {
      filteredPresets = filteredPresets.filter(preset => 
        options.tags!.some(tag => preset.tags.includes(tag))
      );
    }

    // Search term filter
    if (options.searchTerm) {
      const searchLower = options.searchTerm.toLowerCase();
      filteredPresets = filteredPresets.filter(preset =>
        preset.name.toLowerCase().includes(searchLower) ||
        preset.description.toLowerCase().includes(searchLower) ||
        preset.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Sort presets
    if (options.sortBy) {
      filteredPresets.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (options.sortBy) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'usage':
            aValue = this.presetUsage.get(a.id)?.usageCount || 0;
            bValue = this.presetUsage.get(b.id)?.usageCount || 0;
            break;
          case 'date':
            aValue = new Date(a.updatedAt || a.createdAt);
            bValue = new Date(b.updatedAt || b.createdAt);
            break;
          case 'category':
            aValue = a.category;
            bValue = b.category;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return options.sortOrder === 'desc' ? 1 : -1;
        if (aValue > bValue) return options.sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    }

    return filteredPresets;
  }

  // Get a specific preset by ID
  async getPreset(presetId: string): Promise<VisualizationPreset | null> {
    await this.initialize();

    // Check custom presets first
    const customPreset = this.customPresets.get(presetId);
    if (customPreset) return customPreset;

    // Check default presets
    return getPresetById(presetId) || null;
  }

  // Record preset usage for analytics
  async recordUsage(presetId: string, sessionDuration: number = 0): Promise<void> {
    await this.initialize();

    try {
      const existing = this.presetUsage.get(presetId) || {
        presetId,
        usageCount: 0,
        lastUsed: new Date().toISOString(),
        totalTimeUsed: 0,
        averageSessionLength: 0,
        tags: []
      };

      const newUsage: PresetUsageStats = {
        ...existing,
        usageCount: existing.usageCount + 1,
        lastUsed: new Date().toISOString(),
        totalTimeUsed: existing.totalTimeUsed + sessionDuration,
        averageSessionLength: (existing.totalTimeUsed + sessionDuration) / (existing.usageCount + 1)
      };

      this.presetUsage.set(presetId, newUsage);

      // Update preset usage count
      const preset = this.customPresets.get(presetId);
      if (preset) {
        preset.usageCount = newUsage.usageCount;
        this.customPresets.set(presetId, preset);
      }

      await this.saveToStorage();
    } catch (error) {
      console.error('Error recording preset usage:', error);
    }
  }

  // Favorite/unfavorite a preset
  async toggleFavorite(presetId: string): Promise<boolean> {
    await this.initialize();

    try {
      if (this.favoritePresets.has(presetId)) {
        this.favoritePresets.delete(presetId);
        await this.saveToStorage();
        return false; // Unfavorited
      } else {
        this.favoritePresets.add(presetId);
        await this.saveToStorage();
        return true; // Favorited
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return this.favoritePresets.has(presetId);
    }
  }

  // Check if a preset is favorited
  isFavorite(presetId: string): boolean {
    return this.favoritePresets.has(presetId);
  }

  // Get preset usage statistics
  getUsageStats(presetId: string): PresetUsageStats | null {
    return this.presetUsage.get(presetId) || null;
  }

  // Get all usage statistics
  getAllUsageStats(): PresetUsageStats[] {
    return Array.from(this.presetUsage.values());
  }

  // Export presets to JSON
  async exportPresets(presetIds?: string[]): Promise<PresetExportData> {
    await this.initialize();

    let presetsToExport: VisualizationPreset[];

    if (presetIds) {
      // Export specific presets
      presetsToExport = [];
      for (const id of presetIds) {
        const preset = await this.getPreset(id);
        if (preset) presetsToExport.push(preset);
      }
    } else {
      // Export all custom presets
      presetsToExport = Array.from(this.customPresets.values());
    }

    const categories = [...new Set(presetsToExport.map(p => p.category))];

    return {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      presets: presetsToExport,
      metadata: {
        totalPresets: presetsToExport.length,
        categories,
        exportedBy: 'MidiViz Preset Manager'
      }
    };
  }

  // Import presets from JSON
  async importPresets(
    exportData: PresetExportData,
    options: { 
      overwriteExisting?: boolean; 
      addSuffix?: boolean;
      preserveIds?: boolean;
    } = {}
  ): Promise<{ 
    success: boolean; 
    imported: number; 
    skipped: number; 
    errors: string[];
  }> {
    await this.initialize();

    const results = {
      success: true,
      imported: 0,
      skipped: 0,
      errors: [] as string[]
    };

    try {
      for (const preset of exportData.presets) {
        // Check for conflicts
        const existingPreset = await this.getPreset(preset.id);
        const nameConflict = this.isNameTaken(preset.name);

        if (existingPreset && !options.overwriteExisting) {
          results.skipped++;
          continue;
        }

        if (nameConflict && !options.overwriteExisting) {
          if (options.addSuffix) {
            // Add suffix to make name unique
            let suffix = 1;
            let newName = `${preset.name} (${suffix})`;
            while (this.isNameTaken(newName)) {
              suffix++;
              newName = `${preset.name} (${suffix})`;
            }
            preset.name = newName;
          } else {
            results.skipped++;
            results.errors.push(`Name conflict: ${preset.name}`);
            continue;
          }
        }

        // Generate new ID if not preserving
        if (!options.preserveIds) {
          preset.id = `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        // Update timestamps
        preset.updatedAt = new Date().toISOString();
        if (!preset.createdAt) {
          preset.createdAt = preset.updatedAt;
        }

        // Store the preset
        this.customPresets.set(preset.id, preset);
        results.imported++;
      }

      await this.saveToStorage();
      console.log(`📥 Imported ${results.imported} presets, skipped ${results.skipped}`);

    } catch (error) {
      console.error('Error importing presets:', error);
      results.success = false;
      results.errors.push('Import failed: ' + (error as Error).message);
    }

    return results;
  }

  // Duplicate a preset
  async duplicatePreset(presetId: string, newName?: string): Promise<PresetOperationResult> {
    await this.initialize();

    try {
      const sourcePreset = await this.getPreset(presetId);
      if (!sourcePreset) {
        return {
          success: false,
          error: 'PRESET_NOT_FOUND',
          message: `Source preset with ID "${presetId}" not found`
        };
      }

      const duplicateName = newName || `${sourcePreset.name} (Copy)`;
      
      // Ensure unique name
      let finalName = duplicateName;
      let suffix = 1;
      while (this.isNameTaken(finalName)) {
        finalName = `${duplicateName} ${suffix}`;
        suffix++;
      }

      return await this.createPreset(
        finalName,
        sourcePreset.description,
        sourcePreset.mappings,
        {
          category: 'custom',
          tags: [...sourcePreset.tags],
          settings: sourcePreset.defaultSettings
        }
      );
    } catch (error) {
      console.error('Error duplicating preset:', error);
      return {
        success: false,
        error: 'DUPLICATE_FAILED',
        message: 'Failed to duplicate preset'
      };
    }
  }

  // Helper: Check if a preset name is already taken
  private isNameTaken(name: string): boolean {
    // Check default presets
    const defaultExists = DEFAULT_PRESETS.some(p => p.name.toLowerCase() === name.toLowerCase());
    if (defaultExists) return true;

    // Check custom presets
    const customExists = Array.from(this.customPresets.values())
      .some(p => p.name.toLowerCase() === name.toLowerCase());
    
    return customExists;
  }

  // Get popular presets based on usage
  async getPopularPresets(limit: number = 10): Promise<VisualizationPreset[]> {
    const allPresets = await this.getPresets();
    
    return allPresets
      .sort((a, b) => {
        const aUsage = this.presetUsage.get(a.id)?.usageCount || 0;
        const bUsage = this.presetUsage.get(b.id)?.usageCount || 0;
        return bUsage - aUsage;
      })
      .slice(0, limit);
  }

  // Get recently used presets
  async getRecentPresets(limit: number = 5): Promise<VisualizationPreset[]> {
    const recentIds = Array.from(this.presetUsage.values())
      .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
      .slice(0, limit)
      .map(stats => stats.presetId);

    const presets: VisualizationPreset[] = [];
    for (const id of recentIds) {
      const preset = await this.getPreset(id);
      if (preset) presets.push(preset);
    }

    return presets;
  }

  // Clear all custom presets (with confirmation)
  async clearAllCustomPresets(): Promise<PresetOperationResult> {
    try {
      this.customPresets.clear();
      this.favoritePresets.clear();
      this.presetUsage.clear();
      this.userCategories.clear();
      
      await this.saveToStorage();
      
      return {
        success: true,
        message: 'All custom presets cleared successfully'
      };
    } catch (error) {
      console.error('Error clearing presets:', error);
      return {
        success: false,
        error: 'CLEAR_FAILED',
        message: 'Failed to clear presets'
      };
    }
  }

  // Get preset statistics
  getStatistics() {
    return {
      totalCustomPresets: this.customPresets.size,
      totalFavorites: this.favoritePresets.size,
      totalUsageRecords: this.presetUsage.size,
      userCategories: this.userCategories.size,
      mostUsedPreset: this.getMostUsedPreset(),
      totalUsageTime: this.getTotalUsageTime()
    };
  }

  private getMostUsedPreset(): { presetId: string; usageCount: number } | null {
    let maxUsage = 0;
    let mostUsedId = '';
    
    for (const [id, stats] of this.presetUsage) {
      if (stats.usageCount > maxUsage) {
        maxUsage = stats.usageCount;
        mostUsedId = id;
      }
    }
    
    return mostUsedId ? { presetId: mostUsedId, usageCount: maxUsage } : null;
  }

  private getTotalUsageTime(): number {
    return Array.from(this.presetUsage.values())
      .reduce((total, stats) => total + stats.totalTimeUsed, 0);
  }
}

// Singleton instance
export const presetManager = new PresetManager();

console.log('📦 Preset management system loaded');
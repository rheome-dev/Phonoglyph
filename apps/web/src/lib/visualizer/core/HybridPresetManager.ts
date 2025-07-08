import { HybridPreset, HybridControlSource } from '@/types/hybrid-control';

export class HybridPresetManager {
  private presets: Map<string, HybridPreset> = new Map();
  private storageKey = 'hybrid-control-presets';
  
  constructor() {
    this.loadPresetsFromStorage();
    console.log('📝 HybridPresetManager initialized');
  }
  
  /**
   * Save a new preset configuration
   */
  savePreset(name: string, configuration: HybridControlSource, description?: string): HybridPreset {
    const preset: HybridPreset = {
      id: this.generatePresetId(),
      name,
      description,
      configuration: JSON.parse(JSON.stringify(configuration)), // Deep clone
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.presets.set(preset.id, preset);
    this.savePresetsToStorage();
    
    console.log(`💾 Saved preset: ${name} (${preset.id})`);
    return preset;
  }
  
  /**
   * Load a preset by ID
   */
  loadPreset(presetId: string): HybridPreset | null {
    const preset = this.presets.get(presetId);
    if (preset) {
      console.log(`📂 Loaded preset: ${preset.name} (${presetId})`);
      return preset;
    }
    
    console.warn(`⚠️ Preset not found: ${presetId}`);
    return null;
  }
  
  /**
   * Update an existing preset
   */
  updatePreset(presetId: string, updates: Partial<Pick<HybridPreset, 'name' | 'description' | 'configuration'>>): boolean {
    const preset = this.presets.get(presetId);
    if (!preset) {
      console.warn(`⚠️ Cannot update preset - not found: ${presetId}`);
      return false;
    }
    
    if (updates.name !== undefined) preset.name = updates.name;
    if (updates.description !== undefined) preset.description = updates.description;
    if (updates.configuration !== undefined) {
      preset.configuration = JSON.parse(JSON.stringify(updates.configuration));
    }
    preset.updatedAt = new Date();
    
    this.savePresetsToStorage();
    console.log(`✏️ Updated preset: ${preset.name} (${presetId})`);
    return true;
  }
  
  /**
   * Delete a preset
   */
  deletePreset(presetId: string): boolean {
    const preset = this.presets.get(presetId);
    if (!preset) {
      console.warn(`⚠️ Cannot delete preset - not found: ${presetId}`);
      return false;
    }
    
    this.presets.delete(presetId);
    this.savePresetsToStorage();
    console.log(`🗑️ Deleted preset: ${preset.name} (${presetId})`);
    return true;
  }
  
  /**
   * Get all presets
   */
  getAllPresets(): HybridPreset[] {
    return Array.from(this.presets.values()).sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }
  
  /**
   * Search presets by name
   */
  searchPresets(query: string): HybridPreset[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllPresets().filter(preset => 
      preset.name.toLowerCase().includes(lowerQuery) ||
      (preset.description && preset.description.toLowerCase().includes(lowerQuery))
    );
  }
  
  /**
   * Get presets by control source type
   */
  getPresetsByType(type: 'midi' | 'audio' | 'hybrid'): HybridPreset[] {
    return this.getAllPresets().filter(preset => 
      preset.configuration.type === type
    );
  }
  
  /**
   * Duplicate a preset
   */
  duplicatePreset(presetId: string, newName?: string): HybridPreset | null {
    const original = this.presets.get(presetId);
    if (!original) {
      console.warn(`⚠️ Cannot duplicate preset - not found: ${presetId}`);
      return null;
    }
    
    const name = newName || `${original.name} (Copy)`;
    return this.savePreset(name, original.configuration, original.description);
  }
  
  /**
   * Export presets to JSON
   */
  exportPresets(presetIds?: string[]): string {
    const presetsToExport = presetIds 
      ? presetIds.map(id => this.presets.get(id)).filter(Boolean)
      : this.getAllPresets();
    
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      presets: presetsToExport
    };
    
    console.log(`📤 Exported ${presetsToExport.length} presets`);
    return JSON.stringify(exportData, null, 2);
  }
  
  /**
   * Import presets from JSON
   */
  importPresets(jsonData: string, overwrite = false): { imported: number; skipped: number; errors: string[] } {
    const result = { imported: 0, skipped: 0, errors: [] as string[] };
    
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.presets || !Array.isArray(data.presets)) {
        result.errors.push('Invalid preset data format');
        return result;
      }
      
      for (const presetData of data.presets) {
        try {
          // Validate preset structure
          if (!this.validatePresetData(presetData)) {
            result.errors.push(`Invalid preset: ${presetData.name || 'Unknown'}`);
            continue;
          }
          
          // Check if preset already exists
          const existingPreset = Array.from(this.presets.values()).find(p => p.name === presetData.name);
          
          if (existingPreset && !overwrite) {
            result.skipped++;
            continue;
          }
          
          // Import the preset
          const preset: HybridPreset = {
            id: existingPreset?.id || this.generatePresetId(),
            name: presetData.name,
            description: presetData.description,
            configuration: presetData.configuration,
            createdAt: new Date(presetData.createdAt),
            updatedAt: new Date()
          };
          
          this.presets.set(preset.id, preset);
          result.imported++;
          
        } catch (error) {
          result.errors.push(`Error importing preset ${presetData.name}: ${error}`);
        }
      }
      
      if (result.imported > 0) {
        this.savePresetsToStorage();
      }
      
      console.log(`📥 Import complete: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} errors`);
      
    } catch (error) {
      result.errors.push(`JSON parse error: ${error}`);
    }
    
    return result;
  }
  
  /**
   * Create default presets
   */
  createDefaultPresets(): void {
    // Audio-only preset
    this.savePreset(
      'Audio Reactive',
      {
        type: 'audio',
        audioWeight: 1.0,
        midiWeight: 0.0,
        parameters: {
          globalScale: {
            source: 'audio',
            audioMapping: {
              feature: 'rms',
              scaling: 2.0,
              range: [0.5, 3.0],
              smoothing: 0.1
            }
          },
          colorIntensity: {
            source: 'audio',
            audioMapping: {
              feature: 'spectralCentroid',
              scaling: 1.5,
              range: [0.5, 2.0],
              smoothing: 0.2
            }
          }
        }
      },
      'Pure audio-reactive visualization based on RMS and spectral features'
    );
    
    // MIDI-only preset
    this.savePreset(
      'MIDI Controlled',
      {
        type: 'midi',
        midiWeight: 1.0,
        audioWeight: 0.0,
        parameters: {
          globalScale: {
            source: 'midi',
            midiMapping: {
              channel: 0,
              controller: 1, // Modulation wheel
              scaling: 2.0,
              range: [0.1, 3.0]
            }
          },
          rotationSpeed: {
            source: 'midi',
            midiMapping: {
              channel: 0,
              controller: 2, // Breath controller
              scaling: 1.0,
              range: [-2.0, 2.0]
            }
          }
        }
      },
      'Manual MIDI control using modulation wheel and breath controller'
    );
    
    // Hybrid preset
    this.savePreset(
      'Hybrid Performance',
      {
        type: 'hybrid',
        midiWeight: 0.6,
        audioWeight: 0.4,
        parameters: {
          globalScale: {
            source: 'hybrid',
            midiWeight: 0.7,
            audioWeight: 0.3,
            midiMapping: {
              channel: 0,
              controller: 1,
              scaling: 1.5,
              range: [0.5, 2.5]
            },
            audioMapping: {
              feature: 'rms',
              scaling: 1.0,
              range: [0.8, 1.2],
              smoothing: 0.15
            }
          },
          colorIntensity: {
            source: 'hybrid',
            midiWeight: 0.3,
            audioWeight: 0.7,
            midiMapping: {
              channel: 0,
              controller: 3,
              scaling: 1.0,
              range: [0.5, 1.5]
            },
            audioMapping: {
              feature: 'spectralCentroid',
              scaling: 1.2,
              range: [0.7, 1.8],
              smoothing: 0.25
            }
          }
        }
      },
      'Balanced hybrid control mixing MIDI precision with audio responsiveness'
    );
    
    console.log('🎛️ Created default hybrid control presets');
  }
  
  // Private helper methods
  
  private generatePresetId(): string {
    return `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private validatePresetData(data: any): boolean {
    const validTypes = ['midi', 'audio', 'hybrid'];
    return (
      data &&
      typeof data.name === 'string' &&
      data.configuration &&
      validTypes.indexOf(data.configuration.type) !== -1 &&
      typeof data.configuration.parameters === 'object'
    );
  }
  
  private loadPresetsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const presetArray = JSON.parse(stored);
        this.presets.clear();
        
        presetArray.forEach((preset: any) => {
          // Convert date strings back to Date objects
          preset.createdAt = new Date(preset.createdAt);
          preset.updatedAt = new Date(preset.updatedAt);
          this.presets.set(preset.id, preset);
        });
        
        console.log(`📂 Loaded ${this.presets.size} presets from storage`);
      } else {
        // Create default presets if none exist
        this.createDefaultPresets();
      }
    } catch (error) {
      console.error('❌ Error loading presets from storage:', error);
      this.createDefaultPresets();
    }
  }
  
  private savePresetsToStorage(): void {
    try {
      const presetArray = Array.from(this.presets.values());
      localStorage.setItem(this.storageKey, JSON.stringify(presetArray));
      console.log(`💾 Saved ${presetArray.length} presets to storage`);
    } catch (error) {
      console.error('❌ Error saving presets to storage:', error);
    }
  }
  
  /**
   * Get preset statistics
   */
  getPresetStats() {
    const presets = this.getAllPresets();
    const stats = {
      total: presets.length,
      byType: {
        midi: presets.filter(p => p.configuration.type === 'midi').length,
        audio: presets.filter(p => p.configuration.type === 'audio').length,
        hybrid: presets.filter(p => p.configuration.type === 'hybrid').length
      },
      recentlyUsed: presets.slice(0, 5).map(p => ({ id: p.id, name: p.name })),
      oldestPreset: presets.length > 0 ? presets[presets.length - 1] : null,
      newestPreset: presets.length > 0 ? presets[0] : null
    };
    
    return stats;
  }
  
  /**
   * Cleanup resources
   */
  dispose(): void {
    this.savePresetsToStorage();
    this.presets.clear();
    console.log('🧹 HybridPresetManager disposed');
  }
}
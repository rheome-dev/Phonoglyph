import { VideoTrigger } from './effectTriggers';

export interface GenrePreset {
  id: string;
  name: string;
  description: string;
  triggers: Omit<VideoTrigger, 'id' | 'layerId'>[];
}

export const GENRE_PRESETS: GenrePreset[] = [
  {
    id: 'electronic-drums',
    name: 'Electronic/EDM',
    description: 'Triggers for electronic drums and synthesizers',
    triggers: [
      {
        name: 'Kick Zoom',
        triggerType: 'transition',
        midiCondition: { type: 'note_on', note: 36, channel: 10 },
        effect: {
          type: 'zoom',
          duration: 0.2,
          intensity: 0.8,
          direction: 'in',
          easing: 'ease-out'
        },
        enabled: true,
        cooldown: 100,
        lastTriggered: 0
      },
      {
        name: 'Snare Glitch',
        triggerType: 'effect_burst',
        midiCondition: { type: 'note_velocity_threshold', note: 38, velocityThreshold: 100 },
        effect: {
          type: 'glitch',
          duration: 0.1,
          intensity: 1.0,
          easing: 'linear'
        },
        enabled: true,
        cooldown: 50,
        lastTriggered: 0
      },
      {
        name: 'Hi-Hat Strobe',
        triggerType: 'effect_burst',
        midiCondition: { type: 'note_on', note: 42, channel: 10 },
        effect: {
          type: 'strobe',
          duration: 0.15,
          intensity: 0.6,
          easing: 'linear',
          parameters: { frequency: 30 }
        },
        enabled: true,
        cooldown: 80,
        lastTriggered: 0
      },
      {
        name: 'Beat Sync Cut',
        triggerType: 'cut',
        midiCondition: { type: 'beat_detection', beatDivision: 8 },
        effect: {
          type: 'hard_cut',
          duration: 0.05,
          intensity: 1.0,
          easing: 'linear'
        },
        enabled: true,
        cooldown: 200,
        lastTriggered: 0
      }
    ]
  },
  
  {
    id: 'rock-drums',
    name: 'Rock/Metal',
    description: 'Aggressive cuts and transitions for rock music',
    triggers: [
      {
        name: 'Kick Hard Cut',
        triggerType: 'cut',
        midiCondition: { type: 'note_on', note: 36 },
        effect: {
          type: 'hard_cut',
          duration: 0.05,
          intensity: 1.0,
          easing: 'linear'
        },
        enabled: true,
        cooldown: 200,
        lastTriggered: 0
      },
      {
        name: 'Snare Slide',
        triggerType: 'transition',
        midiCondition: { type: 'note_velocity_threshold', note: 38, velocityThreshold: 80 },
        effect: {
          type: 'slide',
          duration: 0.25,
          intensity: 0.9,
          direction: 'left',
          easing: 'ease-out'
        },
        enabled: true,
        cooldown: 150,
        lastTriggered: 0
      },
      {
        name: 'Cymbal Strobe',
        triggerType: 'effect_burst',
        midiCondition: { type: 'note_velocity_threshold', note: 49, velocityThreshold: 90 },
        effect: {
          type: 'strobe',
          duration: 0.3,
          intensity: 0.9,
          easing: 'linear',
          parameters: { frequency: 25 }
        },
        enabled: true,
        cooldown: 500,
        lastTriggered: 0
      },
      {
        name: 'Fill Spin',
        triggerType: 'transition',
        midiCondition: { type: 'note_velocity_threshold', note: 46, velocityThreshold: 110 },
        effect: {
          type: 'spin',
          duration: 0.4,
          intensity: 0.7,
          easing: 'ease-in-out'
        },
        enabled: true,
        cooldown: 800,
        lastTriggered: 0
      }
    ]
  },
  
  {
    id: 'jazz-smooth',
    name: 'Jazz/Smooth',
    description: 'Subtle transitions and crossfades',
    triggers: [
      {
        name: 'Chord Crossfade',
        triggerType: 'transition',
        midiCondition: { type: 'chord_change', chordTolerance: 0.7 },
        effect: {
          type: 'crossfade',
          duration: 1.0,
          intensity: 0.6,
          easing: 'ease-in-out'
        },
        enabled: true,
        cooldown: 1000,
        lastTriggered: 0
      },
      {
        name: 'Brush Snare Fade',
        triggerType: 'transition',
        midiCondition: { type: 'note_velocity_threshold', note: 38, velocityThreshold: 40 },
        effect: {
          type: 'crossfade',
          duration: 0.8,
          intensity: 0.4,
          easing: 'ease-out'
        },
        enabled: true,
        cooldown: 600,
        lastTriggered: 0
      },
      {
        name: 'Piano Accent Zoom',
        triggerType: 'transition',
        midiCondition: { type: 'note_velocity_threshold', note: 60, velocityThreshold: 100 },
        effect: {
          type: 'zoom',
          duration: 0.6,
          intensity: 0.3,
          direction: 'in',
          easing: 'ease-in-out'
        },
        enabled: true,
        cooldown: 800,
        lastTriggered: 0
      }
    ]
  },

  {
    id: 'hip-hop',
    name: 'Hip-Hop/Trap',
    description: 'Rhythmic cuts and bass-heavy triggers',
    triggers: [
      {
        name: '808 Kick Zoom',
        triggerType: 'transition',
        midiCondition: { type: 'note_velocity_threshold', note: 36, velocityThreshold: 90 },
        effect: {
          type: 'zoom',
          duration: 0.3,
          intensity: 0.9,
          direction: 'in',
          easing: 'bounce'
        },
        enabled: true,
        cooldown: 150,
        lastTriggered: 0
      },
      {
        name: 'Trap Snare Cut',
        triggerType: 'cut',
        midiCondition: { type: 'note_on', note: 40, channel: 10 },
        effect: {
          type: 'hard_cut',
          duration: 0.08,
          intensity: 1.0,
          easing: 'linear'
        },
        enabled: true,
        cooldown: 120,
        lastTriggered: 0
      },
      {
        name: 'Hi-Hat Roll Slide',
        triggerType: 'transition',
        midiCondition: { type: 'beat_detection', beatDivision: 16 },
        effect: {
          type: 'slide',
          duration: 0.12,
          intensity: 0.7,
          direction: 'right',
          easing: 'ease-out'
        },
        enabled: true,
        cooldown: 60,
        lastTriggered: 0
      }
    ]
  },

  {
    id: 'ambient-cinematic',
    name: 'Ambient/Cinematic',
    description: 'Slow, atmospheric transitions',
    triggers: [
      {
        name: 'Pad Swell Crossfade',
        triggerType: 'transition',
        midiCondition: { type: 'note_velocity_threshold', note: 48, velocityThreshold: 60 },
        effect: {
          type: 'crossfade',
          duration: 2.0,
          intensity: 0.5,
          easing: 'ease-in-out'
        },
        enabled: true,
        cooldown: 2000,
        lastTriggered: 0
      },
      {
        name: 'String Accent Zoom',
        triggerType: 'transition',
        midiCondition: { type: 'chord_change', chordTolerance: 0.8 },
        effect: {
          type: 'zoom',
          duration: 1.5,
          intensity: 0.4,
          direction: 'out',
          easing: 'ease-in-out'
        },
        enabled: true,
        cooldown: 1500,
        lastTriggered: 0
      },
      {
        name: 'Texture Change Slide',
        triggerType: 'transition',
        midiCondition: { type: 'note_velocity_threshold', note: 72, velocityThreshold: 80 },
        effect: {
          type: 'slide',
          duration: 1.2,
          intensity: 0.6,
          direction: 'up',
          easing: 'ease-in-out'
        },
        enabled: true,
        cooldown: 1000,
        lastTriggered: 0
      }
    ]
  },

  {
    id: 'funk-groove',
    name: 'Funk/Groove',
    description: 'Syncopated rhythmic triggers',
    triggers: [
      {
        name: 'Bass Slap Cut',
        triggerType: 'cut',
        midiCondition: { type: 'note_velocity_threshold', note: 33, velocityThreshold: 95 },
        effect: {
          type: 'hard_cut',
          duration: 0.06,
          intensity: 1.0,
          easing: 'linear'
        },
        enabled: true,
        cooldown: 100,
        lastTriggered: 0
      },
      {
        name: 'Ghost Snare Glitch',
        triggerType: 'effect_burst',
        midiCondition: { type: 'note_velocity_threshold', note: 38, velocityThreshold: 30 },
        effect: {
          type: 'glitch',
          duration: 0.08,
          intensity: 0.4,
          easing: 'linear'
        },
        enabled: true,
        cooldown: 80,
        lastTriggered: 0
      },
      {
        name: 'Offbeat Slide',
        triggerType: 'transition',
        midiCondition: { type: 'beat_detection', beatDivision: 8 },
        effect: {
          type: 'slide',
          duration: 0.2,
          intensity: 0.5,
          direction: 'left',
          easing: 'bounce'
        },
        enabled: true,
        cooldown: 150,
        lastTriggered: 0
      }
    ]
  }
];

export class GenrePresetManager {
  private presets: Map<string, GenrePreset> = new Map();

  constructor() {
    // Load default presets
    GENRE_PRESETS.forEach(preset => {
      this.presets.set(preset.id, preset);
    });
  }

  getPreset(id: string): GenrePreset | undefined {
    return this.presets.get(id);
  }

  getAllPresets(): GenrePreset[] {
    return Array.from(this.presets.values());
  }

  getPresetsByCategory(): Record<string, GenrePreset[]> {
    const categories = {
      'Electronic': this.getPresetsByIds(['electronic-drums']),
      'Rock/Metal': this.getPresetsByIds(['rock-drums']),
      'Jazz': this.getPresetsByIds(['jazz-smooth']),
      'Hip-Hop': this.getPresetsByIds(['hip-hop']),
      'Ambient': this.getPresetsByIds(['ambient-cinematic']),
      'Funk': this.getPresetsByIds(['funk-groove'])
    };
    
    return categories;
  }

  private getPresetsByIds(ids: string[]): GenrePreset[] {
    return ids.map(id => this.presets.get(id)).filter(Boolean) as GenrePreset[];
  }

  addPreset(preset: GenrePreset): void {
    this.presets.set(preset.id, preset);
  }

  removePreset(id: string): boolean {
    return this.presets.delete(id);
  }

  updatePreset(id: string, updates: Partial<GenrePreset>): boolean {
    const preset = this.presets.get(id);
    if (!preset) return false;

    this.presets.set(id, { ...preset, ...updates });
    return true;
  }

  createTriggersFromPreset(
    presetId: string, 
    layerId: string, 
    generateId: () => string
  ): VideoTrigger[] {
    const preset = this.presets.get(presetId);
    if (!preset) return [];

    return preset.triggers.map(triggerTemplate => ({
      ...triggerTemplate,
      id: generateId(),
      layerId,
      lastTriggered: 0
    }));
  }

  exportPreset(id: string): string | null {
    const preset = this.presets.get(id);
    if (!preset) return null;

    return JSON.stringify(preset, null, 2);
  }

  importPreset(jsonData: string): boolean {
    try {
      const preset = JSON.parse(jsonData) as GenrePreset;
      
      if (!preset.id || !preset.name || !preset.triggers) {
        return false;
      }

      this.presets.set(preset.id, preset);
      return true;
    } catch (error) {
      console.error('Failed to import preset:', error);
      return false;
    }
  }

  searchPresets(query: string): GenrePreset[] {
    const searchTerm = query.toLowerCase();
    return Array.from(this.presets.values()).filter(preset =>
      preset.name.toLowerCase().includes(searchTerm) ||
      preset.description.toLowerCase().includes(searchTerm) ||
      preset.triggers.some(trigger => 
        trigger.name.toLowerCase().includes(searchTerm) ||
        trigger.effect.type.toLowerCase().includes(searchTerm)
      )
    );
  }

  clonePreset(id: string, newId: string, newName: string): GenrePreset | null {
    const original = this.presets.get(id);
    if (!original) return null;

    const cloned: GenrePreset = {
      ...original,
      id: newId,
      name: newName,
      triggers: original.triggers.map(trigger => ({ ...trigger }))
    };

    this.presets.set(newId, cloned);
    return cloned;
  }

  mergePresets(presetIds: string[], newId: string, newName: string): GenrePreset | null {
    const presetsToMerge = presetIds.map(id => this.presets.get(id)).filter(Boolean) as GenrePreset[];
    
    if (presetsToMerge.length === 0) return null;

    const mergedTriggers = presetsToMerge.reduce((acc, preset) => acc.concat(preset.triggers), [] as typeof presetsToMerge[0]['triggers']);
    const descriptions = presetsToMerge.map(p => p.name).join(' + ');

    const merged: GenrePreset = {
      id: newId,
      name: newName,
      description: `Merged preset: ${descriptions}`,
      triggers: mergedTriggers
    };

    this.presets.set(newId, merged);
    return merged;
  }

  getPresetStats(id: string): {
    triggerCount: number;
    effectTypes: string[];
    conditionTypes: string[];
    avgDuration: number;
    avgCooldown: number;
  } | null {
    const preset = this.presets.get(id);
    if (!preset) return null;

    const effectTypes = [...new Set(preset.triggers.map(t => t.effect.type))];
    const conditionTypes = [...new Set(preset.triggers.map(t => t.midiCondition.type))];
    const avgDuration = preset.triggers.reduce((sum, t) => sum + t.effect.duration, 0) / preset.triggers.length;
    const avgCooldown = preset.triggers.reduce((sum, t) => sum + t.cooldown, 0) / preset.triggers.length;

    return {
      triggerCount: preset.triggers.length,
      effectTypes,
      conditionTypes,
      avgDuration,
      avgCooldown
    };
  }
}
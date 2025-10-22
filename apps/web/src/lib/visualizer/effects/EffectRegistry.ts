import { debugLog } from '@/lib/utils';
import type { VisualEffect } from '@/types/visualizer';

export interface EffectConstructor {
  new (config?: any): VisualEffect;
}

export interface EffectDefinition {
  id: string;
  name: string;
  description: string;
  category?: string;
  version?: string;
  author?: string;
  constructor: EffectConstructor;
  defaultConfig?: any;
}

export class EffectRegistry {
  private static effects = new Map<string, EffectDefinition>();

  static register(effectDef: EffectDefinition): void {
    if (!effectDef?.id || !effectDef?.constructor) {
      debugLog.warn('Attempted to register invalid effect definition', effectDef);
      return;
    }
    this.effects.set(effectDef.id, effectDef);
    debugLog.log(`[EffectRegistry] Registered effect: ${effectDef.id}`);
  }

  static createEffect(effectId: string, config?: any): VisualEffect | null {
    const effectDef = this.effects.get(effectId);
    if (!effectDef) {
      debugLog.warn(`[EffectRegistry] Effect not found: ${effectId}`);
      return null;
    }
    try {
      return new effectDef.constructor(config ?? effectDef.defaultConfig);
    } catch (error) {
      debugLog.error(`[EffectRegistry] Failed to create effect ${effectId}:`, error);
      return null;
    }
  }

  static getAvailableEffects(): EffectDefinition[] {
    return Array.from(this.effects.values());
  }

  static getEffectById(id: string): EffectDefinition | null {
    return this.effects.get(id) ?? null;
  }

  static getRegisteredEffectIds(): string[] {
    return Array.from(this.effects.keys());
  }
}



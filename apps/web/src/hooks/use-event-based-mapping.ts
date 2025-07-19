import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

/**
 * Event-Based Mapping Hook
 * 
 * This hook integrates with your existing Meyda.js audio analysis pipeline:
 * 1. Uses existing audio analysis cache from `audio_analysis_cache` table
 * 2. Extracts events from Meyda features (RMS, spectral centroid, etc.)
 * 3. Provides MIDI-like interface for visualization parameter mapping
 * 4. Works with existing audio analysis workers
 */

// Types (imported from shared types or redefined for frontend)
interface TransientEvent {
  timestamp: number;
  amplitude: number;
  frequency: number;
  duration: number;
  confidence: number;
  envelope?: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
}

interface ChromaEvent {
  timestamp: number;
  chroma: number[];
  rootNote: number;
  confidence: number;
  keySignature?: string;
}

interface AudioEventData {
  transients: TransientEvent[];
  chroma: ChromaEvent[];
  rms: number[];
  spectralFeatures: {
    centroid: number[];
    rolloff: number[];
    flatness: number[];
  };
  eventCount: number;
}

interface EventBasedMappingConfig {
  mode: 'midi-like' | 'advanced';
  features: {
    transient: boolean;
    chroma: boolean;
    volume: boolean;
    brightness: boolean;
  };
  sensitivity: {
    transient: number;
    chroma: number;
    volume: number;
    brightness: number;
  };
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
}

interface AudioEventMapping {
  id: string;
  eventType: 'transient' | 'chroma' | 'volume' | 'brightness';
  targetParameter: string;
  mapping: {
    source: 'transient' | 'chroma' | 'volume' | 'brightness';
    transform: 'linear' | 'exponential' | 'logarithmic' | 'envelope';
    range: [number, number];
    sensitivity: number;
    envelope?: {
      attack: number;
      decay: number;
      sustain: number;
      release: number;
    };
  };
  enabled: boolean;
}

interface UseEventBasedMappingOptions {
  projectId: string;
  autoSync?: boolean;
  syncInterval?: number;
}

interface UseEventBasedMapping {
  // State
  config: EventBasedMappingConfig;
  mappings: AudioEventMapping[];
  audioEventData: AudioEventData | null;
  isLoading: boolean;
  error: string | null;
  presets: Array<{
    id: string;
    name: string;
    description: string;
    mappings: AudioEventMapping[];
  }>;

  // Mapping CRUD operations
  createMapping: (eventType: string, targetParameter: string, customConfig?: any) => Promise<void>;
  updateMapping: (mappingId: string, updates: Partial<AudioEventMapping>) => Promise<void>;
  deleteMapping: (mappingId: string) => Promise<void>;
  toggleMapping: (mappingId: string) => Promise<void>;

  // Real-time value calculation
  getMappedValue: (eventType: string, currentTime?: number) => number;
  getAllMappedValues: (currentTime?: number) => Record<string, number>;

  // Configuration management
  updateConfig: (updates: Partial<EventBasedMappingConfig>) => void;
  updateSensitivity: (eventType: keyof EventBasedMappingConfig['sensitivity'], sensitivity: number) => void;
  updateEnvelope: (envelope: Partial<EventBasedMappingConfig['envelope']>) => void;

  // Audio event data management
  extractAudioEvents: (fileMetadataId: string, stemType: string, forceRecompute?: boolean) => Promise<void>;
  getCachedEvents: (fileMetadataId: string, stemType: string) => Promise<void>;
  setAudioEventData: (data: AudioEventData) => void;

  // Preset management
  loadPresets: () => Promise<void>;
  applyPreset: (presetId: string) => Promise<void>;
  createBulkMappings: (mappings: Array<{ eventType: string; targetParameter: string; config?: any }>) => Promise<void>;

  // Real-time features
  startRealTimeSync: () => void;
  stopRealTimeSync: () => void;
  isRealTimeActive: boolean;
}

const DEFAULT_CONFIG: EventBasedMappingConfig = {
  mode: 'midi-like',
  features: {
    transient: true,
    chroma: true,
    volume: true,
    brightness: true
  },
  sensitivity: {
    transient: 50,
    chroma: 30,
    volume: 50,
    brightness: 50
  },
  envelope: {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.7,
    release: 0.3
  }
};

export const useEventBasedMapping = (options: UseEventBasedMappingOptions): UseEventBasedMapping => {
  const { projectId, autoSync = true, syncInterval = 1000 } = options;
  const { toast } = useToast();

  // State
  const [config, setConfig] = useState<EventBasedMappingConfig>(DEFAULT_CONFIG);
  const [mappings, setMappings] = useState<AudioEventMapping[]>([]);
  const [audioEventData, setAudioEventDataState] = useState<AudioEventData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presets, setPresets] = useState<any[]>([]);
  const [isRealTimeActive, setIsRealTimeActive] = useState(false);
  const [syncInterval_id, setSyncIntervalId] = useState<NodeJS.Timeout | null>(null);

  // API hooks
  const getMappings = api.eventBasedMapping.getByProject.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const createMappingMutation = api.eventBasedMapping.create.useMutation({
    onSuccess: () => {
      getMappings.refetch();
      toast({ title: "Mapping created successfully" });
    },
    onError: (error) => {
      setError(error.message);
      toast({ title: "Failed to create mapping", variant: "destructive" });
    }
  });

  const updateMappingMutation = api.eventBasedMapping.update.useMutation({
    onSuccess: () => {
      getMappings.refetch();
      toast({ title: "Mapping updated successfully" });
    },
    onError: (error) => {
      setError(error.message);
      toast({ title: "Failed to update mapping", variant: "destructive" });
    }
  });

  const deleteMappingMutation = api.eventBasedMapping.delete.useMutation({
    onSuccess: () => {
      getMappings.refetch();
      toast({ title: "Mapping deleted successfully" });
    },
    onError: (error) => {
      setError(error.message);
      toast({ title: "Failed to delete mapping", variant: "destructive" });
    }
  });

  const toggleMappingMutation = api.eventBasedMapping.toggle.useMutation({
    onSuccess: () => {
      getMappings.refetch();
    },
    onError: (error) => {
      setError(error.message);
      toast({ title: "Failed to toggle mapping", variant: "destructive" });
    }
  });

  const extractEventsMutation = api.eventBasedMapping.extractAudioEvents.useMutation({
    onSuccess: (data) => {
      setAudioEventDataState(data.data);
      toast({ 
        title: data.cached ? "Events loaded from cache" : "Events extracted successfully",
        description: `Found ${data.data.eventCount} events`
      });
    },
    onError: (error) => {
      setError(error.message);
      toast({ title: "Failed to extract audio events", variant: "destructive" });
    }
  });

  const getPresetsQuery = api.eventBasedMapping.getPresets.useQuery();

  const applyPresetMutation = api.eventBasedMapping.applyPreset.useMutation({
    onSuccess: (data) => {
      getMappings.refetch();
      toast({ 
        title: "Preset applied successfully",
        description: `Applied ${data.data.length} mappings from ${data.preset.name}`
      });
    },
    onError: (error) => {
      setError(error.message);
      toast({ title: "Failed to apply preset", variant: "destructive" });
    }
  });

  const createBulkMappingsMutation = api.eventBasedMapping.createBulk.useMutation({
    onSuccess: (data) => {
      getMappings.refetch();
      toast({ 
        title: "Bulk mappings created",
        description: `Created ${data.count} mappings`
      });
    },
    onError: (error) => {
      setError(error.message);
      toast({ title: "Failed to create bulk mappings", variant: "destructive" });
    }
  });

  // Update state when queries complete
  useEffect(() => {
    if (getMappings.data?.success) {
      setMappings(getMappings.data.data);
    }
  }, [getMappings.data]);

  useEffect(() => {
    if (getPresetsQuery.data?.success) {
      setPresets(getPresetsQuery.data.data);
    }
  }, [getPresetsQuery.data]);

  useEffect(() => {
    setIsLoading(
      getMappings.isLoading ||
      createMappingMutation.isLoading ||
      updateMappingMutation.isLoading ||
      deleteMappingMutation.isLoading ||
      extractEventsMutation.isLoading
    );
  }, [
    getMappings.isLoading,
    createMappingMutation.isLoading,
    updateMappingMutation.isLoading,
    deleteMappingMutation.isLoading,
    extractEventsMutation.isLoading
  ]);

  // Mapping CRUD operations
  const createMapping = useCallback(async (
    eventType: string,
    targetParameter: string,
    customConfig?: any
  ) => {
    setError(null);
    await createMappingMutation.mutateAsync({
      projectId,
      eventType: eventType as any,
      targetParameter,
      mappingConfig: customConfig
    });
  }, [projectId, createMappingMutation]);

  const updateMapping = useCallback(async (
    mappingId: string,
    updates: Partial<AudioEventMapping>
  ) => {
    setError(null);
    await updateMappingMutation.mutateAsync({
      mappingId,
      ...updates
    });
  }, [updateMappingMutation]);

  const deleteMapping = useCallback(async (mappingId: string) => {
    setError(null);
    await deleteMappingMutation.mutateAsync({ mappingId });
  }, [deleteMappingMutation]);

  const toggleMapping = useCallback(async (mappingId: string) => {
    const mapping = mappings.find(m => m.id === mappingId);
    if (!mapping) return;

    setError(null);
    await toggleMappingMutation.mutateAsync({
      mappingId,
      enabled: !mapping.enabled
    });
  }, [mappings, toggleMappingMutation]);

  // Real-time value calculation
  const getMappedValue = useCallback((
    eventType: string,
    currentTime: number = 0
  ): number => {
    if (!audioEventData) return 0;

    const mapping = mappings.find(m => 
      m.eventType === eventType && m.enabled
    );
    
    if (!mapping) return 0;

    // This is a simplified version - in a real implementation,
    // you'd use the actual EventBasedMappingService logic
    switch (eventType) {
      case 'transient':
        return getTransientValue(audioEventData.transients, currentTime, mapping);
      case 'chroma':
        return getChromaValue(audioEventData.chroma, currentTime, mapping);
      case 'volume':
        return getVolumeValue(audioEventData.rms, currentTime, mapping);
      case 'brightness':
        return getBrightnessValue(audioEventData.spectralFeatures, currentTime, mapping);
      default:
        return 0;
    }
  }, [audioEventData, mappings]);

  const getAllMappedValues = useCallback((currentTime: number = 0): Record<string, number> => {
    const values: Record<string, number> = {};
    
    mappings.forEach(mapping => {
      if (mapping.enabled) {
        values[mapping.targetParameter] = getMappedValue(mapping.eventType, currentTime);
      }
    });

    return values;
  }, [mappings, getMappedValue]);

  // Configuration management
  const updateConfig = useCallback((updates: Partial<EventBasedMappingConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const updateSensitivity = useCallback((
    eventType: keyof EventBasedMappingConfig['sensitivity'],
    sensitivity: number
  ) => {
    setConfig(prev => ({
      ...prev,
      sensitivity: {
        ...prev.sensitivity,
        [eventType]: sensitivity
      }
    }));
  }, []);

  const updateEnvelope = useCallback((envelope: Partial<EventBasedMappingConfig['envelope']>) => {
    setConfig(prev => ({
      ...prev,
      envelope: {
        ...prev.envelope,
        ...envelope
      }
    }));
  }, []);

  // Audio event data management
  const extractAudioEvents = useCallback(async (
    fileMetadataId: string,
    stemType: string,
    forceRecompute: boolean = false
  ) => {
    setError(null);
    
    // This now uses your existing Meyda analysis cache
    await extractEventsMutation.mutateAsync({
      fileMetadataId,
      stemType,
      config,
      forceRecompute
    });
  }, [config, extractEventsMutation]);

  const getCachedEvents = useCallback(async (
    fileMetadataId: string,
    stemType: string
  ) => {
    // This would use the getCachedEvents query
    // Implementation depends on your specific caching strategy
  }, []);

  const setAudioEventData = useCallback((data: AudioEventData) => {
    setAudioEventDataState(data);
  }, []);

  // Preset management
  const loadPresets = useCallback(async () => {
    await getPresetsQuery.refetch();
  }, [getPresetsQuery]);

  const applyPreset = useCallback(async (presetId: string) => {
    setError(null);
    await applyPresetMutation.mutateAsync({
      projectId,
      presetId
    });
  }, [projectId, applyPresetMutation]);

  const createBulkMappings = useCallback(async (
    mappingConfigs: Array<{ eventType: string; targetParameter: string; config?: any }>
  ) => {
    setError(null);
    await createBulkMappingsMutation.mutateAsync({
      projectId,
      mappings: mappingConfigs.map(config => ({
        eventType: config.eventType as any,
        targetParameter: config.targetParameter,
        mappingConfig: config.config
      }))
    });
  }, [projectId, createBulkMappingsMutation]);

  // Real-time features
  const startRealTimeSync = useCallback(() => {
    if (isRealTimeActive || !autoSync) return;

    const intervalId = setInterval(() => {
      getMappings.refetch();
    }, syncInterval);

    setSyncIntervalId(intervalId);
    setIsRealTimeActive(true);
  }, [isRealTimeActive, autoSync, syncInterval, getMappings]);

  const stopRealTimeSync = useCallback(() => {
    if (syncInterval_id) {
      clearInterval(syncInterval_id);
      setSyncIntervalId(null);
    }
    setIsRealTimeActive(false);
  }, [syncInterval_id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncInterval_id) {
        clearInterval(syncInterval_id);
      }
    };
  }, [syncInterval_id]);

  return {
    // State
    config,
    mappings,
    audioEventData,
    isLoading,
    error,
    presets,

    // Mapping operations
    createMapping,
    updateMapping,
    deleteMapping,
    toggleMapping,

    // Real-time value calculation
    getMappedValue,
    getAllMappedValues,

    // Configuration management
    updateConfig,
    updateSensitivity,
    updateEnvelope,

    // Audio event data management
    extractAudioEvents,
    getCachedEvents,
    setAudioEventData,

    // Preset management
    loadPresets,
    applyPreset,
    createBulkMappings,

    // Real-time features
    startRealTimeSync,
    stopRealTimeSync,
    isRealTimeActive
  };
};

// Helper functions for value calculation (simplified versions)
function getTransientValue(
  transients: TransientEvent[],
  currentTime: number,
  mapping: AudioEventMapping
): number {
  // Find active transient at current time
  const activeTransient = transients.find(t => 
    currentTime >= t.timestamp && currentTime <= t.timestamp + t.duration
  );
  
  if (!activeTransient) return mapping.mapping.range[0];
  
  // Apply basic transform
  let value = activeTransient.amplitude * (mapping.mapping.sensitivity / 100);
  
  // Scale to range
  return mapping.mapping.range[0] + value * (mapping.mapping.range[1] - mapping.mapping.range[0]);
}

function getChromaValue(
  chromaEvents: ChromaEvent[],
  currentTime: number,
  mapping: AudioEventMapping
): number {
  // Find most recent chroma event
  const activeChroma = chromaEvents
    .filter(c => c.timestamp <= currentTime)
    .pop();
  
  if (!activeChroma) return mapping.mapping.range[0];
  
  // Use confidence or dominant note strength
  let value = activeChroma.confidence * (mapping.mapping.sensitivity / 100);
  
  // Scale to range
  return mapping.mapping.range[0] + value * (mapping.mapping.range[1] - mapping.mapping.range[0]);
}

function getVolumeValue(
  rms: number[],
  currentTime: number,
  mapping: AudioEventMapping
): number {
  if (rms.length === 0) return mapping.mapping.range[0];
  
  // Convert time to array index (assuming 25ms hop size)
  const index = Math.floor(currentTime / 0.025);
  if (index < 0 || index >= rms.length) return mapping.mapping.range[0];
  
  let value = rms[index] * (mapping.mapping.sensitivity / 100);
  
  // Apply logarithmic transform if specified
  if (mapping.mapping.transform === 'logarithmic') {
    value = value > 0 ? Math.log(1 + value) / Math.log(2) : 0;
  }
  
  // Scale to range
  return mapping.mapping.range[0] + value * (mapping.mapping.range[1] - mapping.mapping.range[0]);
}

function getBrightnessValue(
  spectralFeatures: AudioEventData['spectralFeatures'],
  currentTime: number,
  mapping: AudioEventMapping
): number {
  if (spectralFeatures.centroid.length === 0) return mapping.mapping.range[0];
  
  // Convert time to array index
  const index = Math.floor(currentTime / 0.025);
  if (index < 0 || index >= spectralFeatures.centroid.length) return mapping.mapping.range[0];
  
  // Normalize centroid to 0-1 range
  const normalizedCentroid = Math.min(1, spectralFeatures.centroid[index] / 8000);
  let value = normalizedCentroid * (mapping.mapping.sensitivity / 100);
  
  // Scale to range
  return mapping.mapping.range[0] + value * (mapping.mapping.range[1] - mapping.mapping.range[0]);
}
// Hybrid Control Panel Component
// Note: This is a simplified version due to import constraints
// The full implementation would include React hooks and interactive controls

import { HybridController } from '@/lib/visualizer/core/HybridController';
import { HybridParameterConfig } from '@/types/hybrid-control';

interface HybridControlPanelProps {
  hybridController: HybridController;
  onParameterChange?: (parameter: string, config: HybridParameterConfig) => void;
}

/**
 * Simplified Hybrid Control Panel
 * Provides interface for switching between MIDI, audio, and hybrid control sources
 */
export function HybridControlPanel({ hybridController, onParameterChange }: HybridControlPanelProps) {
  
  // Set control source for a parameter
  const setControlSource = (parameter: string, source: 'midi' | 'audio' | 'hybrid') => {
    const config: HybridParameterConfig = {
      source,
      midiWeight: source === 'hybrid' ? 0.5 : source === 'midi' ? 1.0 : 0.0,
      audioWeight: source === 'hybrid' ? 0.5 : source === 'audio' ? 1.0 : 0.0,
      midiMapping: source !== 'audio' ? {
        channel: 0,
        controller: 1,
        scaling: 1.0,
        range: [0, 1]
      } : undefined,
      audioMapping: source !== 'midi' ? {
        feature: 'rms',
        scaling: 1.0,
        range: [0, 1],
        smoothing: 0.2
      } : undefined
    };

    hybridController.setControlSource(parameter, config);
    onParameterChange?.(parameter, config);
  };

  const startController = () => {
    hybridController.start();
  };

  const stopController = () => {
    hybridController.stop();
  };

  const adjustSync = (deltaMs: number) => {
    hybridController.adjustSyncOffset(deltaMs);
  };

  // Return the control interface
  return {
    setControlSource,
    startController,
    stopController,
    adjustSync,
    getSyncStatus: () => hybridController.getSyncStatus(),
    getPerformanceStats: () => hybridController.getPerformanceStats()
  };
}
    
    const config: HybridParameterConfig = {
      source: newSource,
      midiWeight: newSource === 'hybrid' ? midiWeight : newSource === 'midi' ? 1.0 : 0.0,
      audioWeight: newSource === 'hybrid' ? audioWeight : newSource === 'audio' ? 1.0 : 0.0,
      midiMapping: newSource !== 'audio' ? {
        channel: 0,
        controller: 1, // Modulation wheel
        scaling: 1.0,
        range: [0, 1]
      } : undefined,
      audioMapping: newSource !== 'midi' ? {
        feature: 'rms',
        scaling: 1.0,
        range: [0, 1],
        smoothing: 0.2
      } : undefined
    };

    hybridController.setControlSource(selectedParameter, config);
    onParameterChange?.(selectedParameter, config);
  }, [selectedParameter, midiWeight, audioWeight, hybridController, onParameterChange]);

  const handleWeightChange = useCallback((type: 'midi' | 'audio', value: number) => {
    if (type === 'midi') {
      setMidiWeight(value);
    } else {
      setAudioWeight(value);
    }

    if (controlSource === 'hybrid') {
      const config: HybridParameterConfig = {
        source: 'hybrid',
        midiWeight: type === 'midi' ? value : midiWeight,
        audioWeight: type === 'audio' ? value : audioWeight,
        midiMapping: {
          channel: 0,
          controller: 1,
          scaling: 1.0,
          range: [0, 1]
        },
        audioMapping: {
          feature: 'rms',
          scaling: 1.0,
          range: [0, 1],
          smoothing: 0.2
        }
      };

      hybridController.setControlSource(selectedParameter, config);
      onParameterChange?.(selectedParameter, config);
    }
  }, [controlSource, midiWeight, audioWeight, selectedParameter, hybridController, onParameterChange]);

  const handleStart = () => {
    hybridController.start();
    setIsActive(true);
  };

  const handleStop = () => {
    hybridController.stop();
    setIsActive(false);
  };

  const handleSyncAdjustment = (deltaMs: number) => {
    hybridController.adjustSyncOffset(deltaMs);
  };

  const getSyncQualityColor = (quality: number) => {
    if (quality > 0.8) return 'text-green-500';
    if (quality > 0.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSyncStatusBadge = (status: SyncStatus | null) => {
    if (!status) return <Badge variant="secondary">Unknown</Badge>;
    
    if (status.isSync) {
      return <Badge variant="default" className="bg-green-500">Synced</Badge>;
    } else {
      return <Badge variant="destructive">Out of Sync</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Hybrid Control System</span>
            <div className="flex items-center gap-2">
              {getSyncStatusBadge(syncStatus)}
              {isActive ? (
                <Button onClick={handleStop} variant="outline" size="sm">
                  <Pause className="w-4 h-4 mr-1" />
                  Stop
                </Button>
              ) : (
                <Button onClick={handleStart} size="sm">
                  <Play className="w-4 h-4 mr-1" />
                  Start
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Performance Stats */}
          {performanceStats && (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Latency:</span>
                <span className="ml-2">{performanceStats.controlLatency.toFixed(1)}ms</span>
              </div>
              <div>
                <span className="font-medium">Sources:</span>
                <span className="ml-2">{performanceStats.activeSources}</span>
              </div>
              <div>
                <span className="font-medium">Updates:</span>
                <span className="ml-2">{performanceStats.updateCount}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parameter Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Parameter Control</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {VISUALIZER_PARAMETERS.map((param) => (
              <Button
                key={param.key}
                variant={selectedParameter === param.key ? "default" : "outline"}
                onClick={() => setSelectedParameter(param.key)}
                className="text-sm"
              >
                {param.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Control Source Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Control Source</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {CONTROL_SOURCES.map((source) => {
              const Icon = source.icon;
              return (
                <Button
                  key={source.key}
                  variant={controlSource === source.key ? "default" : "outline"}
                  onClick={() => handleSourceChange(source.key)}
                  className="flex flex-col items-center gap-2 h-16"
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{source.label}</span>
                </Button>
              );
            })}
          </div>

          {/* Hybrid Weight Controls */}
          {controlSource === 'hybrid' && (
            <div className="mt-6 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">MIDI Weight</span>
                  <span className="text-sm text-muted-foreground">{midiWeight.toFixed(2)}</span>
                </div>
                <Slider
                  value={[midiWeight]}
                  onValueChange={(value) => handleWeightChange('midi', value[0])}
                  min={0}
                  max={1}
                  step={0.01}
                  className="w-full"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Audio Weight</span>
                  <span className="text-sm text-muted-foreground">{audioWeight.toFixed(2)}</span>
                </div>
                <Slider
                  value={[audioWeight]}
                  onValueChange={(value) => handleWeightChange('audio', value[0])}
                  min={0}
                  max={1}
                  step={0.01}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Synchronization Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5" />
            Synchronization
          </CardTitle>
        </CardHeader>
        <CardContent>
          {syncStatus && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Offset:</span>
                  <span className="ml-2">{(syncStatus.offset * 1000).toFixed(1)}ms</span>
                </div>
                <div>
                  <span className="font-medium">Drift:</span>
                  <span className="ml-2">{(syncStatus.drift * 1000).toFixed(1)}ms</span>
                </div>
                <div>
                  <span className="font-medium">Quality:</span>
                  <span className={`ml-2 ${getSyncQualityColor(syncStatus.quality)}`}>
                    {(syncStatus.quality * 100).toFixed(0)}%
                  </span>
                </div>
                <div>
                  <span className="font-medium">Last Update:</span>
                  <span className="ml-2">
                    {Math.round((Date.now() - syncStatus.lastUpdate) / 1000)}s ago
                  </span>
                </div>
              </div>

              {/* Manual Sync Adjustment */}
              <div className="pt-3 border-t">
                <span className="text-sm font-medium mb-2 block">Manual Adjustment</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncAdjustment(-10)}
                  >
                    -10ms
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncAdjustment(-1)}
                  >
                    -1ms
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncAdjustment(0)}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncAdjustment(1)}
                  >
                    +1ms
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncAdjustment(10)}
                  >
                    +10ms
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
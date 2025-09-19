'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, Zap, Music, Volume2, BarChart3, ToggleLeft, ToggleRight } from 'lucide-react';

interface AnalysisMethodControlsProps {
  analysisMethod: 'original' | 'enhanced' | 'both';
  analysisParams: {
    transientThreshold: number;
    onsetThreshold: number;
    chromaSmoothing: number;
    rmsWindowSize: number;
    pitchConfidence: number;
    minNoteDuration: number;
  };
  onMethodChange: (method: 'original' | 'enhanced' | 'both') => void;
  onParamsChange: (params: Partial<typeof analysisParams>) => void;
  isAnalyzing?: boolean;
}

export function AnalysisMethodControls({
  analysisMethod,
  analysisParams,
  onMethodChange,
  onParamsChange,
  isAnalyzing = false
}: AnalysisMethodControlsProps) {
  const handleParamChange = (key: string, value: number | number[]) => {
    onParamsChange({
      [key]: Array.isArray(value) ? value[0] : value
    });
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'original': return <BarChart3 className="w-4 h-4" />;
      case 'enhanced': return <Zap className="w-4 h-4" />;
      case 'both': return <Settings className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'original': return 'bg-blue-600/20 text-blue-400 border-blue-600';
      case 'enhanced': return 'bg-purple-600/20 text-purple-400 border-purple-600';
      case 'both': return 'bg-green-600/20 text-green-400 border-green-600';
      default: return 'bg-slate-600/20 text-slate-400 border-slate-600';
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5" />
          Audio Analysis Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Analysis Method Selection */}
        <div className="space-y-3">
          <Label className="text-slate-300 text-sm font-medium">Analysis Method</Label>
          <div className="flex gap-2">
            <Button
              variant={analysisMethod === 'original' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onMethodChange('original')}
              disabled={isAnalyzing}
              className="flex-1"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Original
            </Button>
            <Button
              variant={analysisMethod === 'enhanced' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onMethodChange('enhanced')}
              disabled={isAnalyzing}
              className="flex-1"
            >
              <Zap className="w-4 h-4 mr-2" />
              Enhanced
            </Button>
            <Button
              variant={analysisMethod === 'both' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onMethodChange('both')}
              disabled={isAnalyzing}
              className="flex-1"
            >
              <Settings className="w-4 h-4 mr-2" />
              Both
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getMethodColor(analysisMethod)}>
              {getMethodIcon(analysisMethod)}
              <span className="ml-1 capitalize">{analysisMethod}</span>
            </Badge>
            {isAnalyzing && (
              <Badge variant="outline" className="bg-yellow-600/20 text-yellow-400 border-yellow-600">
                Analyzing...
              </Badge>
            )}
          </div>
        </div>

        {/* Enhanced Analysis Parameters */}
        {(analysisMethod === 'enhanced' || analysisMethod === 'both') && (
          <>
            <Separator className="bg-slate-600" />
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Enhanced Analysis Parameters</h3>
              </div>
              
              {/* Transient Detection */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-red-400" />
                  <Label className="text-xs text-slate-300">Transient Detection</Label>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-slate-400">
                      Threshold: {analysisParams.transientThreshold.toFixed(2)}
                    </Label>
                    <Slider
                      value={[analysisParams.transientThreshold]}
                      onValueChange={(value) => handleParamChange('transientThreshold', value)}
                      min={0.1}
                      max={0.9}
                      step={0.05}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">
                      Onset: {analysisParams.onsetThreshold.toFixed(2)}
                    </Label>
                    <Slider
                      value={[analysisParams.onsetThreshold]}
                      onValueChange={(value) => handleParamChange('onsetThreshold', value)}
                      min={0.05}
                      max={0.5}
                      step={0.025}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Chroma Analysis */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Music className="w-3 h-3 text-blue-400" />
                  <Label className="text-xs text-slate-300">Chroma Analysis</Label>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-slate-400">
                      Smoothing: {analysisParams.chromaSmoothing.toFixed(2)}
                    </Label>
                    <Slider
                      value={[analysisParams.chromaSmoothing]}
                      onValueChange={(value) => handleParamChange('chromaSmoothing', value)}
                      min={0.1}
                      max={0.95}
                      step={0.05}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">
                      Confidence: {analysisParams.pitchConfidence.toFixed(2)}
                    </Label>
                    <Slider
                      value={[analysisParams.pitchConfidence]}
                      onValueChange={(value) => handleParamChange('pitchConfidence', value)}
                      min={0.3}
                      max={0.95}
                      step={0.05}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* RMS Analysis */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-3 h-3 text-green-400" />
                  <Label className="text-xs text-slate-300">RMS Analysis</Label>
                </div>
                <div>
                  <Label className="text-xs text-slate-400">
                    Window Size: {analysisParams.rmsWindowSize}
                  </Label>
                  <Slider
                    value={[analysisParams.rmsWindowSize]}
                    onValueChange={(value) => handleParamChange('rmsWindowSize', value)}
                    min={256}
                    max={4096}
                    step={128}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="pt-2">
              <Label className="text-xs text-slate-300 mb-2 block">Quick Presets</Label>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onParamsChange({
                    transientThreshold: 0.2,
                    onsetThreshold: 0.15,
                    chromaSmoothing: 0.7,
                    rmsWindowSize: 512,
                    pitchConfidence: 0.6,
                    minNoteDuration: 0.08
                  })}
                  className="text-xs px-2 py-1 h-7"
                >
                  Sensitive
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onParamsChange({
                    transientThreshold: 0.4,
                    onsetThreshold: 0.25,
                    chromaSmoothing: 0.8,
                    rmsWindowSize: 1024,
                    pitchConfidence: 0.75,
                    minNoteDuration: 0.12
                  })}
                  className="text-xs px-2 py-1 h-7"
                >
                  Balanced
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onParamsChange({
                    transientThreshold: 0.6,
                    onsetThreshold: 0.35,
                    chromaSmoothing: 0.9,
                    rmsWindowSize: 2048,
                    pitchConfidence: 0.85,
                    minNoteDuration: 0.2
                  })}
                  className="text-xs px-2 py-1 h-7"
                >
                  Conservative
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Analysis Status */}
        {analysisMethod === 'enhanced' || analysisMethod === 'both' ? (
          <div className="p-3 bg-purple-900/20 border border-purple-600/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-white">Enhanced Analysis</span>
            </div>
            <div className="text-xs text-purple-300 space-y-1">
              <p>• Transient detection for onset analysis</p>
              <p>• Chroma analysis for pitch detection</p>
              <p>• RMS processing for amplitude tracking</p>
              <p>• MIDI-like control parameters</p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-blue-900/20 border border-blue-600/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-white">Original Analysis</span>
            </div>
            <div className="text-xs text-blue-300 space-y-1">
              <p>• Standard frequency analysis</p>
              <p>• Volume and spectral features</p>
              <p>• FFT-based processing</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

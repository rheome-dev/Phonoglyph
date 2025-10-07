'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Settings, Zap, Music, Volume2 } from 'lucide-react';

interface AnalysisParametersProps {
  params: {
    transientThreshold: number;
    onsetThreshold: number;
    chromaSmoothing: number;
    rmsWindowSize: number;
    pitchConfidence: number;
    minNoteDuration: number;
  };
  onParamsChange: (params: any) => void;
}

export function AnalysisParameters({ params, onParamsChange }: AnalysisParametersProps) {
  const handleParamChange = (key: string, value: number | number[]) => {
    onParamsChange({
      ...params,
      [key]: Array.isArray(value) ? value[0] : value
    });
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Analysis Parameters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Transient Detection Parameters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-red-400" />
            <h3 className="text-lg font-semibold text-white">Transient Detection</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label className="text-slate-300">
                Transient Threshold: {params.transientThreshold.toFixed(2)}
              </Label>
              <Slider
                value={[params.transientThreshold]}
                onValueChange={(value) => handleParamChange('transientThreshold', value)}
                min={0.1}
                max={0.9}
                step={0.05}
                className="mt-2"
              />
              <p className="text-xs text-slate-400 mt-1">
                Higher values detect fewer, stronger transients
              </p>
            </div>

            <div>
              <Label className="text-slate-300">
                Onset Threshold: {params.onsetThreshold.toFixed(2)}
              </Label>
              <Slider
                value={[params.onsetThreshold]}
                onValueChange={(value) => handleParamChange('onsetThreshold', value)}
                min={0.05}
                max={0.5}
                step={0.025}
                className="mt-2"
              />
              <p className="text-xs text-slate-400 mt-1">
                Sensitivity for detecting note onsets
              </p>
            </div>
          </div>
        </div>

        <Separator className="bg-slate-600" />

        {/* Chroma/Pitch Detection Parameters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Music className="w-4 h-4 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Chroma & Pitch Detection</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label className="text-slate-300">
                Chroma Smoothing: {params.chromaSmoothing.toFixed(2)}
              </Label>
              <Slider
                value={[params.chromaSmoothing]}
                onValueChange={(value) => handleParamChange('chromaSmoothing', value)}
                min={0.1}
                max={0.95}
                step={0.05}
                className="mt-2"
              />
              <p className="text-xs text-slate-400 mt-1">
                Higher values create smoother pitch transitions
              </p>
            </div>

            <div>
              <Label className="text-slate-300">
                Pitch Confidence: {params.pitchConfidence.toFixed(2)}
              </Label>
              <Slider
                value={[params.pitchConfidence]}
                onValueChange={(value) => handleParamChange('pitchConfidence', value)}
                min={0.3}
                max={0.95}
                step={0.05}
                className="mt-2"
              />
              <p className="text-xs text-slate-400 mt-1">
                Minimum confidence for pitch detection
              </p>
            </div>

            <div>
              <Label className="text-slate-300">
                Min Note Duration: {params.minNoteDuration.toFixed(2)}s
              </Label>
              <Slider
                value={[params.minNoteDuration]}
                onValueChange={(value) => handleParamChange('minNoteDuration', value)}
                min={0.05}
                max={0.5}
                step={0.025}
                className="mt-2"
              />
              <p className="text-xs text-slate-400 mt-1">
                Minimum duration for valid notes
              </p>
            </div>
          </div>
        </div>

        <Separator className="bg-slate-600" />

        {/* RMS Analysis Parameters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Volume2 className="w-4 h-4 text-green-400" />
            <h3 className="text-lg font-semibold text-white">RMS Analysis</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label className="text-slate-300">
                Window Size: {params.rmsWindowSize}
              </Label>
              <Slider
                value={[params.rmsWindowSize]}
                onValueChange={(value) => handleParamChange('rmsWindowSize', value)}
                min={256}
                max={4096}
                step={128}
                className="mt-2"
              />
              <p className="text-xs text-slate-400 mt-1">
                Larger windows = smoother RMS values
              </p>
            </div>
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="pt-4">
          <h4 className="text-sm font-medium text-slate-300 mb-3">Quick Presets</h4>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onParamsChange({
                transientThreshold: 0.2,
                onsetThreshold: 0.15,
                chromaSmoothing: 0.7,
                rmsWindowSize: 512,
                pitchConfidence: 0.6,
                minNoteDuration: 0.08
              })}
              className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
            >
              Sensitive
            </button>
            <button
              onClick={() => onParamsChange({
                transientThreshold: 0.4,
                onsetThreshold: 0.25,
                chromaSmoothing: 0.8,
                rmsWindowSize: 1024,
                pitchConfidence: 0.75,
                minNoteDuration: 0.12
              })}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Balanced
            </button>
            <button
              onClick={() => onParamsChange({
                transientThreshold: 0.6,
                onsetThreshold: 0.35,
                chromaSmoothing: 0.9,
                rmsWindowSize: 2048,
                pitchConfidence: 0.85,
                minNoteDuration: 0.2
              })}
              className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              Conservative
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}





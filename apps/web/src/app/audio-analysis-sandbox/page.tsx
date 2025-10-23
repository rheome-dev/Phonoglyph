'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, Play, Pause, Download, Settings, BarChart3, Music, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AudioAnalysisSandbox } from '@/components/audio-analysis/audio-analysis-sandbox';
import { AnalysisVisualization } from '@/components/audio-analysis/analysis-visualization';
import { AnalysisParameters } from '@/components/audio-analysis/analysis-parameters';
import { AnalysisComparison } from '@/components/audio-analysis/analysis-comparison';
import { AudioAnalysisSandboxService } from '@/services/audio-analysis-sandbox-service';
import { ApiTest } from '@/components/audio-analysis/api-test';
import { AuthStatus } from '@/components/audio-analysis/auth-status';
import { debugLog } from '@/lib/utils';

export default function AudioAnalysisSandboxPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [cachedAnalysis, setCachedAnalysis] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisParams, setAnalysisParams] = useState({
    transientThreshold: 0.3,
    onsetThreshold: 0.2,
    chromaSmoothing: 0.8,
    rmsWindowSize: 1024,
    pitchConfidence: 0.7,
    minNoteDuration: 0.1
  });

  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an audio file (MP3, WAV, etc.)',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select a file smaller than 50MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    setAnalysisData(null);
    setCurrentTime(0);
    setIsPlaying(false);

    // Load audio buffer for analysis
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const buffer = await audioContext.decodeAudioData(arrayBuffer);
        setAudioBuffer(buffer);
        setDuration(buffer.duration);
      } catch (error) {
        debugLog.error('Error loading audio:', error);
        toast({
          title: 'Error loading audio',
          description: 'Failed to decode audio file',
          variant: 'destructive',
        });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [toast]);

  const handleAnalyze = useCallback(async () => {
    if (!audioBuffer) return;

    setIsAnalyzing(true);
    setAnalysisData(null); // Clear previous analysis
    
    toast({
      title: 'Starting analysis...',
      description: 'Processing audio with new parameters',
    });
  }, [audioBuffer, toast]);

  const handleAnalysisComplete = useCallback((analysis: any) => {
    setAnalysisData(analysis);
    setIsAnalyzing(false);
    
    // Compare with cached analysis if available
    if (cachedAnalysis) {
      const comparisonData = AudioAnalysisSandboxService.compareAnalysis(analysis, cachedAnalysis);
      setComparison(comparisonData);
    }
    
    toast({
      title: 'Analysis complete!',
      description: 'Audio analysis finished successfully',
    });
  }, [cachedAnalysis, toast]);

  const handleSaveToCache = useCallback(async () => {
    if (!analysisData || !selectedFile) return;
    
    setIsSaving(true);
    try {
      // First upload the file if it hasn't been uploaded yet
      let fileId = 'sandbox-file'; // Default for demo
      
      // In a real implementation, you would upload the file first and get a real fileId
      // For now, we'll use a placeholder
      
      const success = await AudioAnalysisSandboxService.saveToCache(analysisData, fileId, 'master');
      if (success) {
        toast({
          title: 'Saved to cache!',
          description: 'Analysis data has been saved to the backend cache',
        });
      } else {
        throw new Error('Failed to save to cache');
      }
    } catch (error) {
      debugLog.error('Save error:', error);
      toast({
        title: 'Save failed',
        description: 'Failed to save analysis to cache',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [analysisData, selectedFile, toast]);

  const handleLoadFromCache = useCallback(async () => {
    if (!selectedFile) return;
    
    setIsLoading(true);
    try {
      const fileId = 'sandbox-file'; // In real implementation, this would be the actual file ID
      const sandboxData = await AudioAnalysisSandboxService.loadFromCache(fileId, 'master');
      if (sandboxData) {
        setAnalysisData(sandboxData);
        toast({
          title: 'Loaded from cache!',
          description: 'Analysis data has been loaded from the backend cache',
        });
      } else {
        toast({
          title: 'No cached data',
          description: 'No cached analysis found for this file',
          variant: 'destructive',
        });
      }
    } catch (error) {
      debugLog.error('Load error:', error);
      toast({
        title: 'Load failed',
        description: 'Failed to load analysis from cache',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, toast]);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">
            Audio Analysis Sandbox
          </h1>
          <p className="text-xl text-slate-300">
            Test transient detection, chroma analysis, and RMS processing
          </p>
          <div className="flex justify-center gap-4">
            <Badge variant="outline" className="text-slate-300 border-slate-600">
              <Music className="w-3 h-3 mr-1" />
              Transient Detection
            </Badge>
            <Badge variant="outline" className="text-slate-300 border-slate-600">
              <BarChart3 className="w-3 h-3 mr-1" />
              Chroma Analysis
            </Badge>
            <Badge variant="outline" className="text-slate-300 border-slate-600">
              <Volume2 className="w-3 h-3 mr-1" />
              RMS Processing
            </Badge>
          </div>
        </div>

        {/* API Connection Test */}
        <ApiTest />

        {/* Authentication Status */}
        <AuthStatus />

        {/* File Upload Section */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Audio File Upload
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
              />
              
              {selectedFile && (
                <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Music className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="text-white font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-slate-400">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !audioBuffer}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                    </Button>
                    <Button
                      onClick={handlePlayPause}
                      disabled={!audioBuffer}
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {/* Hidden audio element for playback */}
              {selectedFile && (
                <audio
                  ref={audioRef}
                  src={URL.createObjectURL(selectedFile)}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleEnded}
                  className="hidden"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Audio Analysis Sandbox Component */}
        {audioBuffer && (
          <AudioAnalysisSandbox
            audioBuffer={audioBuffer}
            params={analysisParams}
            onAnalysisComplete={handleAnalysisComplete}
          />
        )}

        {/* Analysis Parameters */}
        {audioBuffer && (
          <AnalysisParameters
            params={analysisParams}
            onParamsChange={setAnalysisParams}
          />
        )}

        {/* Visualization */}
        {analysisData && (
          <AnalysisVisualization
            analysisData={analysisData}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            isPlaying={isPlaying}
          />
        )}

        {/* Analysis Comparison */}
        {comparison && (
          <AnalysisComparison
            comparison={comparison}
            onSaveToCache={handleSaveToCache}
            onLoadFromCache={handleLoadFromCache}
            isSaving={isSaving}
            isLoading={isLoading}
          />
        )}

        {/* Analysis Results Summary */}
        {analysisData && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <h3 className="text-lg font-semibold text-white">Transients</h3>
                  <p className="text-2xl font-bold text-red-400">
                    {analysisData.transients?.length || 0}
                  </p>
                  <p className="text-sm text-slate-400">Detected onsets</p>
                </div>
                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <h3 className="text-lg font-semibold text-white">Chroma Notes</h3>
                  <p className="text-2xl font-bold text-blue-400">
                    {new Set(analysisData.chroma?.map((c: any) => c.note) || []).size}
                  </p>
                  <p className="text-sm text-slate-400">Unique notes</p>
                </div>
                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <h3 className="text-lg font-semibold text-white">RMS Avg</h3>
                  <p className="text-2xl font-bold text-green-400">
                    {analysisData.rms?.length ? 
                      (analysisData.rms.reduce((sum: number, r: any) => sum + r.value, 0) / analysisData.rms.length).toFixed(3) : 
                      '0.000'
                    }
                  </p>
                  <p className="text-sm text-slate-400">Average amplitude</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Upload, 
  FileMusic, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  Music,
  X,
  Settings,
  Target,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MidiStemsUploadProps {
  onStemsReady?: (stems: Record<string, File>) => void;
  onComplete?: (fileIds: string[]) => void;
  className?: string;
}

interface MidiFile {
  type: 'vocals' | 'drums' | 'bass' | 'melody' | 'chords' | 'other';
  file: File;
  trackCount?: number;
  noteCount?: number;
  duration?: number;
}

export function MidiStemsUpload({ onStemsReady, onComplete, className }: MidiStemsUploadProps) {
  const [midiFiles, setMidiFiles] = useState<MidiFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoLengthMatch, setAutoLengthMatch] = useState(true);
  const [normalizeTempo, setNormalizeTempo] = useState(true);

  const { toast } = useToast();

  const expectedMidiTypes = ['vocals', 'drums', 'bass', 'melody', 'chords', 'other'];

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(file => {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.mid') && !file.name.toLowerCase().endsWith('.midi')) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} is not a MIDI file`,
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 10MB for MIDI)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} is larger than 10MB`,
          variant: 'destructive',
        });
        return;
      }

      // Try to determine MIDI type from filename
      const fileName = file.name.toLowerCase();
      let midiType: 'vocals' | 'drums' | 'bass' | 'melody' | 'chords' | 'other' = 'other';
      
      if (fileName.includes('vocal') || fileName.includes('voice') || fileName.includes('sing')) {
        midiType = 'vocals';
      } else if (fileName.includes('drum') || fileName.includes('beat') || fileName.includes('percussion')) {
        midiType = 'drums';
      } else if (fileName.includes('bass') || fileName.includes('low')) {
        midiType = 'bass';
      } else if (fileName.includes('melody') || fileName.includes('lead')) {
        midiType = 'melody';
      } else if (fileName.includes('chord') || fileName.includes('harmony')) {
        midiType = 'chords';
      }

      // Check if we already have this MIDI type
      const existingIndex = midiFiles.findIndex(m => m.type === midiType);
      
      if (existingIndex >= 0) {
        // Replace existing file
        setMidiFiles(prev => prev.map((midi, index) => 
          index === existingIndex ? { ...midi, file } : midi
        ));
      } else {
        // Add new file
        setMidiFiles(prev => [...prev, { type: midiType, file }]);
      }
    });
  }, [midiFiles, toast]);

  const removeMidi = useCallback((type: string) => {
    setMidiFiles(prev => prev.filter(midi => midi.type !== type));
  }, []);

  const handleUpload = useCallback(async () => {
    if (midiFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const uploadedFileIds: string[] = [];
      const totalFiles = midiFiles.length;
      
      for (let i = 0; i < midiFiles.length; i++) {
        const midi = midiFiles[i];
        
        // Update progress
        setUploadProgress((i / totalFiles) * 100);
        
        // Upload file
        const formData = new FormData();
        formData.append('file', midi.file);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${midi.file.name}`);
        }

        const { fileId } = await response.json();
        uploadedFileIds.push(fileId);
      }
      
      setUploadProgress(100);
      
      toast({
        title: 'Upload complete!',
        description: `Successfully uploaded ${midiFiles.length} MIDI files.`,
      });

      onComplete?.(uploadedFileIds);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [midiFiles, toast, onComplete]);

  const getMidiIcon = (type: string) => {
    switch (type) {
      case 'vocals':
        return <Music className="h-4 w-4" />;
      case 'drums':
        return <FileMusic className="h-4 w-4" />;
      case 'bass':
        return <FileMusic className="h-4 w-4" />;
      case 'melody':
        return <FileMusic className="h-4 w-4" />;
      case 'chords':
        return <FileMusic className="h-4 w-4" />;
      case 'other':
        return <FileMusic className="h-4 w-4" />;
      default:
        return <FileMusic className="h-4 w-4" />;
    }
  };

  const getMidiColor = (type: string) => {
    switch (type) {
      case 'vocals':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'drums':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'bass':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'melody':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'chords':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'other':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileMusic className="h-5 w-5" />
          MIDI Stems Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">MIDI Files</span>
            <Badge variant="secondary" className="text-xs">
              {midiFiles.length} files selected
            </Badge>
          </div>
          
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
            onClick={() => document.getElementById('midi-stems-upload')?.click()}
          >
            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              Click to select MIDI files
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Supports .mid and .midi files (max 10MB each)
            </p>
          </div>
          
          <input
            id="midi-stems-upload"
            type="file"
            accept=".mid,.midi"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Advanced Settings */}
        <div className="space-y-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <Settings className="h-4 w-4" />
            Advanced Settings
            <span className={cn("transition-transform", showAdvanced ? "rotate-180" : "")}>
              ▼
            </span>
          </button>
          
          {showAdvanced && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Auto Length Matching</Label>
                  <p className="text-xs text-gray-600">
                    Automatically match all MIDI files to the same length
                  </p>
                </div>
                <Switch
                  checked={autoLengthMatch}
                  onCheckedChange={setAutoLengthMatch}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Normalize Tempo</Label>
                  <p className="text-xs text-gray-600">
                    Adjust tempo to match the main audio file
                  </p>
                </div>
                <Switch
                  checked={normalizeTempo}
                  onCheckedChange={setNormalizeTempo}
                />
              </div>
            </div>
          )}
        </div>

        {/* Selected Files */}
        {midiFiles.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Selected MIDI Files:</h4>
            <div className="grid gap-2">
              {midiFiles.map((midi) => (
                <div
                  key={midi.type}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    getMidiColor(midi.type)
                  )}
                >
                  <div className="flex items-center gap-3">
                    {getMidiIcon(midi.type)}
                    <div>
                      <p className="font-medium capitalize">{midi.type}</p>
                      <p className="text-sm opacity-75">{midi.file.name}</p>
                      {midi.trackCount && (
                        <p className="text-xs opacity-60">{midi.trackCount} tracks</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeMidi(midi.type)}
                    className="p-1 hover:bg-black/10 rounded-full transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missing Types */}
        {midiFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Recommended MIDI Types:</h4>
            <div className="grid grid-cols-2 gap-2">
              {expectedMidiTypes
                .filter(type => !midiFiles.find(midi => midi.type === type))
                .map(type => (
                  <div
                    key={type}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-dashed border-gray-300"
                  >
                    {getMidiIcon(type)}
                    <span className="text-sm text-gray-600 capitalize">{type}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Uploading MIDI files...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={midiFiles.length === 0 || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload {midiFiles.length} MIDI File{midiFiles.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>

        {/* Info Section */}
        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-purple-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-purple-900">Maximum Control</h4>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• Precise note-by-note visualization control</li>
                <li>• Individual track mapping and effects</li>
                <li>• Real-time parameter automation</li>
                <li>• Professional-grade visualization quality</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Advanced Tips */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Advanced Setup Tips:</h4>
              <ul className="text-sm text-blue-800 space-y-1 mt-2">
                <li>• Export each instrument as a separate MIDI file</li>
                <li>• Ensure all files have the same tempo and time signature</li>
                <li>• Use descriptive filenames (e.g., "drums.mid", "vocals.mid")</li>
                <li>• Consider using a DAW for precise MIDI export</li>
                <li>• Match MIDI length to your main audio file</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Complexity Warning */}
        <div className="p-4 bg-red-50 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900">Advanced Complexity</h4>
              <p className="text-sm text-red-800">
                This method requires manual MIDI file preparation. Each instrument needs to be exported as a separate MIDI file with matching length and tempo.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, 
  CheckCircle, 
  Play, 
  Zap, 
  Layers, 
  Download,
  Monitor,
  X
} from 'lucide-react';

/**
 * TestingGuide - Interactive guide for testing performance enhancements
 */

interface TestStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  instructions: string[];
  expectedResults: string[];
}

export const TestingGuide: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  
  const testSteps: TestStep[] = [
    {
      id: 'performance-monitoring',
      title: 'Performance Monitoring',
      description: 'Test real-time performance metrics',
      icon: <Monitor className="h-4 w-4" />,
      completed: completedSteps.has('performance-monitoring'),
      instructions: [
        '1. Click the "Performance Debug" button in the bottom-right corner',
        '2. Toggle "Real-time Monitoring" to ON',
        '3. Play some audio with MIDI data',
        '4. Watch the FPS, Memory, Effects, and Layers metrics update'
      ],
      expectedResults: [
        'FPS should be 55-60 (green badge)',
        'Memory usage should be reasonable (<200MB)',
        'Audio Textures should show "Enabled"',
        'Metrics should update smoothly without stuttering'
      ]
    },
    {
      id: 'audio-texture-pipeline',
      title: 'Audio Texture Pipeline',
      description: 'Test GPU-based audio feature processing',
      icon: <Zap className="h-4 w-4" />,
      completed: completedSteps.has('audio-texture-pipeline'),
      instructions: [
        '1. Ensure you have audio analysis data loaded',
        '2. In the Performance Debug panel, click "Run Tests"',
        '3. Watch for "Audio analysis loaded into GPU textures" message',
        '4. Create some audio-to-visual parameter mappings',
        '5. Play audio and observe smooth visual reactions'
      ],
      expectedResults: [
        'Test should show "✅ Audio analysis loaded into GPU textures"',
        'Visual effects should react smoothly to audio',
        'No frame drops during complex audio-reactive scenes',
        'Console should show optimized lookup messages'
      ]
    },
    {
      id: 'media-layer-compositing',
      title: 'GPU Media Layer Compositing',
      description: 'Test multi-layer GPU compositing',
      icon: <Layers className="h-4 w-4" />,
      completed: completedSteps.has('media-layer-compositing'),
      instructions: [
        '1. Run the performance tests (they create a test media layer)',
        '2. Look for "Test media layer added with audio-reactive opacity"',
        '3. Play audio and watch the test layer react',
        '4. Check that FPS remains high with multiple layers',
        '5. Use "Clear Test Layer" to remove the test layer'
      ],
      expectedResults: [
        'Test layer should appear with colored squares',
        'Layer opacity should react to drum audio features',
        'FPS should remain 55-60 even with test layer active',
        'Layer should be cleanly removed when cleared'
      ]
    },
    {
      id: 'export-pipeline',
      title: 'Video Export Pipeline',
      description: 'Test Remotion export functionality',
      icon: <Download className="h-4 w-4" />,
      completed: completedSteps.has('export-pipeline'),
      instructions: [
        '1. Look for the "Video Export" panel in the top-left corner',
        '2. Select an export preset (e.g., "YouTube 1080p")',
        '3. Click "Start Export" to test the export pipeline',
        '4. Watch the progress indicators and job status',
        '5. Note: Actual video rendering is simulated for now'
      ],
      expectedResults: [
        'Export panel should appear when audio/MIDI data is loaded',
        'Export presets should be selectable',
        'Progress should show phases: preparing → analyzing → rendering',
        'Export should complete without errors'
      ]
    },
    {
      id: 'performance-comparison',
      title: 'Performance Comparison',
      description: 'Compare before/after performance',
      icon: <Play className="h-4 w-4" />,
      completed: completedSteps.has('performance-comparison'),
      instructions: [
        '1. Create a complex scene with multiple effects enabled',
        '2. Add several audio-to-visual parameter mappings',
        '3. Play audio and monitor FPS in the debug panel',
        '4. Try adding/removing effects to see performance impact',
        '5. Check browser DevTools Performance tab for detailed metrics'
      ],
      expectedResults: [
        'Complex scenes should maintain 55-60 FPS',
        'Adding effects should have minimal FPS impact',
        'Memory usage should remain stable over time',
        'No significant garbage collection spikes'
      ]
    }
  ];
  
  const markStepCompleted = (stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
  };
  
  const resetProgress = () => {
    setCompletedSteps(new Set());
  };
  
  const completedCount = completedSteps.size;
  const totalSteps = testSteps.length;
  
  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        className="fixed top-4 right-4 z-50 bg-blue-600 hover:bg-blue-700"
      >
        <BookOpen className="h-4 w-4 mr-2" />
        Testing Guide
      </Button>
    );
  }
  
  return (
    <Card className="fixed top-4 right-4 w-96 max-h-[80vh] overflow-y-auto z-50 bg-stone-900/95 border-stone-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-stone-100">
            <BookOpen className="h-5 w-5" />
            Performance Testing Guide
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="text-stone-400 hover:text-stone-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-stone-300 border-stone-600">
            {completedCount}/{totalSteps} Complete
          </Badge>
          {completedCount === totalSteps && (
            <Badge className="bg-green-600 text-white">
              All Tests Complete! 🎉
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-sm text-stone-400 mb-4">
          Follow these steps to test the new performance enhancements:
        </div>
        
        {testSteps.map((step, index) => (
          <div key={step.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${step.completed ? 'bg-green-600/20' : 'bg-stone-700'}`}>
                {step.completed ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  step.icon
                )}
              </div>
              
              <div className="flex-1">
                <h4 className="font-medium text-stone-200">{step.title}</h4>
                <p className="text-sm text-stone-400">{step.description}</p>
              </div>
              
              {!step.completed && (
                <Button
                  size="sm"
                  onClick={() => markStepCompleted(step.id)}
                  className="bg-green-600 hover:bg-green-700 text-xs"
                >
                  Mark Done
                </Button>
              )}
            </div>
            
            <div className="ml-11 space-y-2">
              <div className="text-xs text-stone-300 font-medium">Instructions:</div>
              <ul className="text-xs text-stone-400 space-y-1">
                {step.instructions.map((instruction, i) => (
                  <li key={i}>{instruction}</li>
                ))}
              </ul>
              
              <div className="text-xs text-stone-300 font-medium">Expected Results:</div>
              <ul className="text-xs text-stone-400 space-y-1">
                {step.expectedResults.map((result, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-green-400 mt-0.5">•</span>
                    {result}
                  </li>
                ))}
              </ul>
            </div>
            
            {index < testSteps.length - 1 && (
              <Separator className="bg-stone-700" />
            )}
          </div>
        ))}
        
        <div className="pt-4 border-t border-stone-700">
          <Button
            onClick={resetProgress}
            variant="outline"
            size="sm"
            className="w-full border-stone-600 text-stone-300"
          >
            Reset Progress
          </Button>
        </div>
        
        {completedCount === totalSteps && (
          <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-3">
            <div className="text-green-400 font-medium text-sm mb-1">
              🎉 Congratulations!
            </div>
            <div className="text-green-300 text-xs">
              You've successfully tested all the performance enhancements. Your Phonoglyph system is now running with:
            </div>
            <ul className="text-green-300 text-xs mt-2 space-y-1">
              <li>• GPU-based audio texture pipeline</li>
              <li>• Optimized real-time parameter mapping</li>
              <li>• Multi-layer GPU compositing</li>
              <li>• Professional video export capability</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

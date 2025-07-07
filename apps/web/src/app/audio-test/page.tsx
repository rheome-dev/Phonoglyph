'use client';

import { AudioVisualizer } from '@/components/midi/audio-visualizer';

export default function AudioTestPage() {
  return (
    <div className="w-screen h-screen">
      <AudioVisualizer className="w-full h-full" />
    </div>
  );
} 
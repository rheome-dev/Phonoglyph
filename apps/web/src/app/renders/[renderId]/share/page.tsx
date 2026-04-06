'use client';

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/** Format bytes to human-readable string */
function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Format seconds to M:SS */
function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return 'Unknown';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface RenderData {
  id: string;
  project_name: string | null;
  status: string;
  output_url: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export default function RenderSharePage({ params }: { params: Promise<{ renderId: string }> }) {
  const { renderId } = use(params);
  const router = useRouter();
  const [render, setRender] = useState<RenderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/renders/${renderId}`)
      .then(res => {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then(data => {
        setRender(data);
        setIsLoading(false);
      })
      .catch(() => {
        setError(true);
        setIsLoading(false);
      });
  }, [renderId]);

  const metadata = render?.metadata as Record<string, any> | null;

  // Build the canonical shareable URL
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/renders/${renderId}/share`
    : '';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-stone-400 mx-auto mb-3" />
          <p className="text-stone-400 font-mono text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !render || render.status !== 'completed') {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-white mb-2">Video unavailable</h1>
          <p className="text-stone-400 mb-6">
            This render doesn&apos;t exist, isn&apos;t ready, or you don&apos;t have access.
          </p>
          <Button onClick={() => router.push('/')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go to Raybox
          </Button>
        </div>
      </div>
    );
  }

  const projectName = render.project_name ?? 'Raybox Render';
  const videoUrl = render.output_url ?? '';
  const thumbnailUrl = shareUrl; // Use the share page itself as the OG preview

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      {/* Minimal header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
        <span className="text-stone-400 text-sm font-mono">raybox.fm</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/renders/${renderId}/result`)}
        >
          <ExternalLink className="w-3 h-3 mr-1.5" />
          Open in Raybox
        </Button>
      </div>

      <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
        {/* Project name + badge */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white truncate mr-4">{projectName}</h1>
          <Badge variant="default" className="bg-emerald-600 shrink-0">Completed</Badge>
        </div>

        {/* Video player */}
        <div className="rounded-xl overflow-hidden bg-black shadow-2xl">
          <video
            key={videoUrl}
            src={videoUrl}
            controls
            className="w-full"
            playsInline
            preload="metadata"
          />
        </div>

        {/* CTA row */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              const a = document.createElement('a');
              a.href = videoUrl;
              a.download = `${projectName.replace(/[^a-z0-9]/gi, '_')}.mp4`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push('/')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Create Your Own
          </Button>
        </div>

        {/* Metadata strip */}
        <div className="bg-stone-900 rounded-xl p-4 border border-stone-800">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-stone-500 text-xs uppercase tracking-wide mb-1">Duration</p>
              <p className="text-white font-medium text-sm">{formatDuration(metadata?.duration)}</p>
            </div>
            <div>
              <p className="text-stone-500 text-xs uppercase tracking-wide mb-1">Format</p>
              <p className="text-white font-medium text-sm">MP4</p>
            </div>
            <div>
              <p className="text-stone-500 text-xs uppercase tracking-wide mb-1">Size</p>
              <p className="text-white font-medium text-sm">{metadata?.resolution ?? '1080×1920'}</p>
            </div>
          </div>
        </div>

        {/* Footer attribution */}
        <p className="text-center text-stone-600 text-xs">
          Made with{' '}
          <a href="/" className="underline hover:text-stone-400 transition-colors">
            Raybox
          </a>
        </p>
      </div>
    </div>
  );
}

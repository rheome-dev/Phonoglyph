'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Link2, Share2, Instagram, Youtube, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CreditsDisplay } from '@/components/polar/CreditsDisplay';

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

/** Relative time string */
function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}

export default function RenderResultPage({ params }: { params: Promise<{ renderId: string }> }) {
  const { renderId } = use(params);
  const router = useRouter();
  const [copied, setCopied] = React.useState(false);
  const [fileSize, setFileSize] = React.useState<number | null>(null);
  const [render, setRender] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<any>(null);

  // Fetch render data from public API (no auth required)
  React.useEffect(() => {
    if (!renderId) return;
    fetch(`/api/renders/${renderId}`)
      .then(res => {
        if (!res.ok) throw new Error('Render not found');
        return res.json();
      })
      .then(data => {
        setRender(data);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err);
        setIsLoading(false);
      });
  }, [renderId]);

  // Fetch file size from S3 via HEAD request
  React.useEffect(() => {
    if (!render?.output_url) return;
    fetch(render.output_url, { method: 'HEAD' })
      .then(res => {
        const size = parseInt(res.headers.get('content-length') ?? '0', 10);
        setFileSize(size > 0 ? size : null);
      })
      .catch(() => setFileSize(null));
  }, [render?.output_url]);

  const metadata = render?.metadata as Record<string, any> | null;

  const handleDownload = () => {
    if (!render?.output_url) return;
    const a = document.createElement('a');
    a.href = render.output_url;
    a.download = 'render.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Build the canonical shareable URL for this render
  const getShareableUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/renders/${renderId}/share`;
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(getShareableUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Share via Web Share API (native share sheet on mobile, or navigator.share fallback).
   * Falls back to copying the link if Web Share is not supported.
   */
  const handleNativeShare = async (platform: 'tiktok' | 'instagram' | 'youtube') => {
    const shareUrl = getShareableUrl();
    const title = render?.project_name ?? 'My Raybox Render';
    const text = `Check out my ${title} — made with Raybox`;

    // Web Share API is available on mobile and some desktop browsers
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or share failed — fall through to clipboard
        if ((err as Error).name === 'AbortError') return;
      }
    }

    // Fallback: copy link to clipboard with platform-specific guidance
    await navigator.clipboard.writeText(shareUrl);
    const guidance = {
      tiktok: 'Link copied! Paste it in the TikTok app when creating your post.',
      instagram: 'Link copied! Paste it in your Instagram bio or story.',
      youtube: 'Link copied! Paste it in your video description on YouTube.',
    }[platform];

    alert(guidance);
  };

  const handleShareTikTok = () => handleNativeShare('tiktok');
  const handleShareInstagram = () => handleNativeShare('instagram');
  const handleShareYouTube = () => handleNativeShare('youtube');

  const handleRenderAgain = () => {
    if (render?.project_id) {
      router.push(`/creative-visualizer?projectId=${render.project_id}`);
    } else {
      router.push('/creative-visualizer');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-stone-400 mx-auto mb-3" />
          <p className="text-stone-400 font-mono text-sm">Loading render...</p>
        </div>
      </div>
    );
  }

  if (error || !render) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-white mb-2">Render not found</h1>
          <p className="text-stone-400 mb-6">
            This render doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Button onClick={() => router.push('/creative-visualizer')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Editor
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
        <Button
          variant="ghost"
          onClick={() => router.push('/creative-visualizer')}
          className="text-stone-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Editor
        </Button>
        <CreditsDisplay onOpenPurchase={() => router.push('/settings?tab=credits')} />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Project name + timestamp */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">
              {render.project_name ?? 'Untitled Render'}
            </h1>
            <p className="text-stone-500 text-sm mt-0.5">{timeAgo(render.created_at)}</p>
          </div>
          <Badge
            variant={render.status === 'completed' ? 'default' : 'outline'}
            className={render.status === 'completed' ? 'bg-emerald-600' : 'text-stone-400'}
          >
            {render.status}
          </Badge>
        </div>

        {/* Video player */}
        <div className="rounded-xl overflow-hidden bg-black">
          <video
            key={render.output_url}
            src={render.output_url}
            controls
            className="w-full"
            playsInline
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleDownload} className="flex-1 min-w-[140px]">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" onClick={handleCopyLink} className="flex-1 min-w-[140px]">
            <Link2 className="w-4 h-4 mr-2" />
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
          <Button variant="outline" onClick={handleShareTikTok} className="flex-1 min-w-[140px]">
            <Share2 className="w-4 h-4 mr-2" />
            TikTok
          </Button>
          <Button variant="outline" onClick={handleShareInstagram} className="flex-1 min-w-[140px]">
            <Instagram className="w-4 h-4 mr-2" />
            Instagram
          </Button>
          <Button variant="outline" onClick={handleShareYouTube} className="flex-1 min-w-[140px]">
            <Youtube className="w-4 h-4 mr-2" />
            YouTube
          </Button>
        </div>

        {/* Metadata */}
        <Card className="bg-stone-900 border-stone-800">
          <CardContent className="py-4 px-5">
            <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide mb-3">
              Render Details
            </h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-stone-500">Duration</span>
                <p className="text-white font-medium">
                  {formatDuration(metadata?.duration)}
                </p>
              </div>
              <div>
                <span className="text-stone-500">Resolution</span>
                <p className="text-white font-medium">
                  {metadata?.resolution ?? '1080×1920'}
                </p>
              </div>
              <div>
                <span className="text-stone-500">Format</span>
                <p className="text-white font-medium">MP4 (H.264)</p>
              </div>
              <div>
                <span className="text-stone-500">File size</span>
                <p className="text-white font-medium">
                  {fileSize ? formatBytes(fileSize) : '—'}
                </p>
              </div>
              <div>
                <span className="text-stone-500">Credits spent</span>
                <p className="text-white font-medium">{render.credits_spent ?? 1}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleRenderAgain}
            className="flex-1 bg-white text-stone-900 hover:bg-stone-200"
          >
            Render Again
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/creative-visualizer')}
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Editor
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Download, Link2, Share2, Instagram, Youtube, Loader2 } from 'lucide-react';
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

export default function RenderResultPage({ params }: { params: { renderId: string } }) {
  const { renderId } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [copied, setCopied] = React.useState(false);
  const [fileSize, setFileSize] = React.useState<number | null>(null);
  const [videoDuration, setVideoDuration] = React.useState<number | null>(null);
  const [render, setRender] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<any>(null);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Resolve projectId and projectName from DB data or query params
  const projectId = render?.project_id || searchParams.get('projectId') || null;
  const projectName = render?.project_name || searchParams.get('projectName') || null;

  // Fetch render data from public API (no auth required)
  // Falls back to outputUrl query parameter if the DB record doesn't exist
  React.useEffect(() => {
    if (!renderId) return;
    fetch(`/api/renders/${renderId}`)
      .then(res => {
        if (!res.ok) throw new Error('Render not found');
        return res.json();
      })
      .then(data => {
        setRender({ ...data, _fromDb: true });
        setIsLoading(false);
      })
      .catch(err => {
        // Fallback: if the DB record is missing but we have the output URL
        // from the query string, create a synthetic render object
        const fallbackUrl = searchParams.get('outputUrl');
        if (fallbackUrl) {
          setRender({
            id: renderId,
            status: 'completed',
            output_url: fallbackUrl,
            project_id: searchParams.get('projectId') || null,
            project_name: searchParams.get('projectName') || null,
            created_at: new Date().toISOString(),
            metadata: {},
          });
          setIsLoading(false);
        } else {
          setError(err);
          setIsLoading(false);
        }
      });
  }, [renderId, searchParams]);

  // Get duration and file size from the video element once loaded
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleMetadata = () => {
      if (video.duration && isFinite(video.duration)) {
        setVideoDuration(video.duration);
      }
    };

    video.addEventListener('loadedmetadata', handleMetadata);
    // If already loaded (e.g. cached)
    if (video.readyState >= 1 && video.duration && isFinite(video.duration)) {
      setVideoDuration(video.duration);
    }

    return () => video.removeEventListener('loadedmetadata', handleMetadata);
  }, [render?.output_url]);

  // Fetch file size — try HEAD request, fall back to fetching the whole response for size
  React.useEffect(() => {
    if (!render?.output_url) return;
    fetch(render.output_url, { method: 'HEAD' })
      .then(res => {
        const size = parseInt(res.headers.get('content-length') ?? '0', 10);
        if (size > 0) {
          setFileSize(size);
        }
      })
      .catch(() => setFileSize(null));
  }, [render?.output_url]);

  const metadata = render?.metadata as Record<string, any> | null;

  const handleDownload = async () => {
    if (!render?.output_url || isDownloading) return;
    setIsDownloading(true);
    try {
      // Fetch the video as a blob so we get a same-origin object URL.
      // Cross-origin S3/R2 URLs ignore the <a download> attribute,
      // so this is the only reliable way to trigger an actual file download.
      const res = await fetch(render.output_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(render.project_name || 'render').replace(/[^a-z0-9]/gi, '_')}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback: open the URL directly
      window.open(render.output_url, '_blank');
    } finally {
      setIsDownloading(false);
    }
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
    const title = projectName ?? 'My Raybox Render';
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

  /** Navigate back to the editor for this specific project */
  const navigateToEditor = () => {
    if (projectId) {
      router.push(`/creative-visualizer?projectId=${projectId}`);
    } else {
      router.push('/creative-visualizer');
    }
  };

  const handleRenderAgain = () => {
    navigateToEditor();
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
          <button
            onClick={navigateToEditor}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-stone-700 text-stone-300 hover:bg-stone-800 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Editor
          </button>
        </div>
      </div>
    );
  }

  // Resolve display duration: video element > metadata > null
  const displayDuration = videoDuration ?? metadata?.duration ?? null;

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800">
        <button
          onClick={navigateToEditor}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-stone-400 hover:bg-stone-800 hover:text-white transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Editor
        </button>
        <CreditsDisplay onOpenPurchase={() => router.push('/settings?tab=credits')} />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Project name + timestamp */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">
              {projectName ?? 'Untitled'}
            </h1>
            <p className="text-stone-500 text-sm mt-0.5">{timeAgo(render.created_at)}</p>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              render.status === 'completed'
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
                : 'border border-stone-700 text-stone-400'
            }`}
          >
            {render.status}
          </span>
        </div>

        {/* Video player */}
        <div className="rounded-xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            key={render.output_url}
            src={render.output_url}
            controls
            className="w-full"
            playsInline
          />
        </div>

        {/* Action buttons — explicitly styled for dark background */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-stone-700 text-stone-300 hover:bg-stone-800 hover:text-white transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isDownloading ? 'Downloading...' : 'Download'}
          </button>
          <button
            onClick={handleCopyLink}
            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-stone-700 text-stone-300 hover:bg-stone-800 hover:text-white transition-colors text-sm font-medium"
          >
            <Link2 className="w-4 h-4" />
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={handleShareTikTok}
            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-stone-700 text-stone-300 hover:bg-stone-800 hover:text-white transition-colors text-sm font-medium"
          >
            <Share2 className="w-4 h-4" />
            TikTok
          </button>
          <button
            onClick={handleShareInstagram}
            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-stone-700 text-stone-300 hover:bg-stone-800 hover:text-white transition-colors text-sm font-medium"
          >
            <Instagram className="w-4 h-4" />
            Instagram
          </button>
          <button
            onClick={handleShareYouTube}
            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-stone-700 text-stone-300 hover:bg-stone-800 hover:text-white transition-colors text-sm font-medium"
          >
            <Youtube className="w-4 h-4" />
            YouTube
          </button>
        </div>

        {/* Metadata */}
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-5">
          <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide mb-3">
            Render Details
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-stone-500">Duration</span>
              <p className="text-white font-medium">
                {formatDuration(displayDuration)}
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
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleRenderAgain}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-white text-stone-900 hover:bg-stone-200 transition-colors text-sm font-medium"
          >
            Render Again
          </button>
          <button
            onClick={navigateToEditor}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-stone-700 text-stone-300 hover:bg-stone-800 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Editor
          </button>
        </div>
      </div>
    </div>
  );
}

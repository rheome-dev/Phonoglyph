'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function PreviewRedirectPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const handlePreviewRedirect = () => {
      // Get the saved preview URL from localStorage
      const savedPreviewUrl = localStorage.getItem('phonoglyph_preview_url');
      const next = searchParams.get('next') || '/';

      if (savedPreviewUrl) {
        // Clear the saved URL
        localStorage.removeItem('phonoglyph_preview_url');
        
        // Redirect to the preview deployment with the session
        const redirectUrl = `${savedPreviewUrl}${next}`;
        console.log('Redirecting to preview deployment:', redirectUrl);
        window.location.href = redirectUrl;
      } else {
        // Fallback to normal redirect
        console.log('No preview URL found, redirecting normally');
        router.push(next);
      }
    };

    // Small delay to ensure the session is properly set
    const timeoutId = setTimeout(handlePreviewRedirect, 100);

    return () => clearTimeout(timeoutId);
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <div className="text-sm text-stone-300">Redirecting to preview deployment...</div>
      </div>
    </div>
  );
} 
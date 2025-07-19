'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

export default function PreviewRedirectPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const handlePreviewRedirect = () => {
      try {
        // Only access localStorage on the client side
        if (typeof window === 'undefined') return;

        // Get the saved preview URL from localStorage
        const savedPreviewUrl = localStorage.getItem('phonoglyph_preview_url');
        const next = searchParams.get('next') || '/';

        if (savedPreviewUrl) {
          // Clear the saved URL
          localStorage.removeItem('phonoglyph_preview_url');
          
          // Redirect to the preview deployment with the session
          const redirectUrl = `${savedPreviewUrl}${next}`;
          console.log('Redirecting to preview deployment:', redirectUrl);
          setIsRedirecting(true);
          window.location.href = redirectUrl;
        } else {
          // Fallback to normal redirect
          console.log('No preview URL found, redirecting normally');
          setIsRedirecting(true);
          router.push(next);
        }
      } catch (error) {
        console.error('Error during preview redirect:', error);
        // Fallback to normal redirect on error
        const next = searchParams.get('next') || '/';
        setIsRedirecting(true);
        router.push(next);
      }
    };

    // Small delay to ensure the session is properly set and we're on the client
    const timeoutId = setTimeout(handlePreviewRedirect, 100);

    return () => clearTimeout(timeoutId);
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <div className="text-sm text-stone-300">
          {isRedirecting ? 'Redirecting...' : 'Processing authentication...'}
        </div>
      </div>
    </div>
  );
} 
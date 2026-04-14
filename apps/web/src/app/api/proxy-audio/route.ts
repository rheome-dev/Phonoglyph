import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        });

        if (!response.ok) {
            console.error(`Proxy fetch failed for ${url}: ${response.status} ${response.statusText}`);
            return new NextResponse(`Failed to fetch: ${response.statusText}`, { status: response.status });
        }

        const blob = await response.blob();
        const headers = new Headers();

        // Copy relevant headers from the original response
        const contentType = response.headers.get('Content-Type');
        if (contentType) headers.set('Content-Type', contentType);

        const contentLength = response.headers.get('Content-Length');
        if (contentLength) headers.set('Content-Length', contentLength);

        // Cache for 1 hour
        headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        headers.set('Access-Control-Allow-Origin', '*');

        return new NextResponse(blob, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

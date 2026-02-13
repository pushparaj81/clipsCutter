import { NextRequest, NextResponse } from 'next/server';
import { getVideoInfo } from '@/lib/video';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url } = body;

        // Validate URL
        if (!url || typeof url !== 'string') {
            return NextResponse.json(
                { error: 'A valid YouTube URL is required.' },
                { status: 400 }
            );
        }

        // Basic YouTube URL check
        const isYouTube =
            url.includes('youtube.com/watch') ||
            url.includes('youtu.be/') ||
            url.includes('youtube.com/shorts/');

        if (!isYouTube) {
            return NextResponse.json(
                { error: 'Only YouTube URLs are supported.' },
                { status: 400 }
            );
        }

        console.log('--- API /api/video-info ---');
        console.log('Incoming URL:', url);

        // Fetch video metadata using our yt-dlp wrapper
        const videoInfo = await getVideoInfo(url);

        console.log('Fetched Video Info:', videoInfo);
        console.log('---------------------------');

        return NextResponse.json(videoInfo, { status: 200 });
    } catch (error) {
        console.error('Error in /api/video-info:', error);
        return NextResponse.json(
            { error: 'Failed to fetch video information. Please check the URL.' },
            { status: 500 }
        );
    }
}

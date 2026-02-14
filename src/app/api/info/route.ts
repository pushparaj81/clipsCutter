import { NextRequest, NextResponse } from 'next/server';
import { getVideoMetadata } from '@/services/downloader';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const metadata = await getVideoMetadata(url);

    const videoId = metadata.id || metadata.display_id || new URL(url).searchParams.get('v') || url.split('/').pop()?.split('?')[0];
    
    console.log(`Extracted Video ID: ${videoId}, Title: ${metadata.title}`);

    // Extract relevant fields standard for the frontend
    const info = {
      videoId,
      title: metadata.title || 'Untitled Video',
      thumbnail: metadata.thumbnail || (metadata.thumbnails && metadata.thumbnails.length > 0 ? metadata.thumbnails[metadata.thumbnails.length - 1].url : null),
      duration: Number(metadata.duration) || 0,
      availableQualities: metadata.availableQualities,
      availableFormats: metadata.availableFormats
    };

    if (!info.videoId) {
      throw new Error('Could not determine video ID');
    }

    return NextResponse.json(info);
  } catch (error: any) {
    console.error('Info API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata', details: error.message },
      { status: 500 }
    );
  }
}

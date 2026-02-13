import { NextRequest, NextResponse } from 'next/server';
import { getVideoMetadata } from '@/services/downloader';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const metadata = await getVideoMetadata(url);

    // Extract relevant fields standard for the frontend
    const info = {
      videoId: metadata.id || metadata.display_id,
      title: metadata.title,
      thumbnail: metadata.thumbnail || (metadata.thumbnails && metadata.thumbnails.length > 0 ? metadata.thumbnails[metadata.thumbnails.length - 1].url : null),
      duration: metadata.duration,
      formats: metadata.formats ? metadata.formats.map((f: any) => ({
        format_id: f.format_id,
        ext: f.ext,
        resolution: f.resolution,
        filesize: f.filesize
      })) : []
    };

    return NextResponse.json(info);
  } catch (error: any) {
    console.error('Info API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata', details: error.message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clipsQueue } from '@/lib/queue';
import { ClipJobData } from '@/lib/queue';
import { getVideoInfo } from '@/lib/video';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url, startTime, endTime, format = 'mp4', quality = 'best' } = body;

        console.log('--- API /api/clips ---');
        console.log('  URL:', url);

        // Validate required fields
        if (!url || !startTime || !endTime) {
            return NextResponse.json(
                { error: 'url, startTime, and endTime are required.' },
                { status: 400 }
            );
        }

        // NEW: Fetch video info here so we have the title immediately
        console.log('  Fetching title metadata...');
        const videoInfo = await getVideoInfo(url);
        const title = videoInfo.title || 'Untitled Clip';

        // Step 1: Create a record in the database with the title
        const clip = await prisma.clip.create({
            data: {
                youtubeUrl: url,
                startTime,
                endTime,
                format,
                quality,
                title,
            },
        });
        console.log('  Created Clip Record:', clip.id, '| Title:', title);

        // Step 2: Add the job to the queue
        const jobData: ClipJobData = {
            clipId: clip.id,
            youtubeUrl: url,
            startTime,
            endTime,
            format,
            quality,
        };

        await clipsQueue.add('clip-job', jobData, {
            jobId: clip.id,
        });
        console.log('  Added to Queue:', clip.id);
        console.log('--- API /api/clips: Job submitted ---');

        // Step 3: Return the clip ID immediately so the frontend can poll for status
        return NextResponse.json(
            {
                id: clip.id,
                status: clip.status,
                message: 'Job submitted! Use /api/clips/' + clip.id + ' to check status.',
            },
            { status: 201 }
        );

    } catch (error: any) {
        console.error('Error in /api/clips:', error);
        return NextResponse.json(
            { error: 'Failed to create clip job.' },
            { status: 500 }
        );
    }
}

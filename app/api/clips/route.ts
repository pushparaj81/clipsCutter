import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clipsQueue } from '@/lib/queue';
import { ClipJobData } from '@/lib/queue';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url, startTime, endTime, format = 'mp4', quality = 'best' } = body;

        console.log('--- API /api/clips ---');
        console.log('  URL:', url);
        console.log('  Time:', startTime, '->', endTime);
        console.log('  Format:', format, '| Quality:', quality);

        // Validate required fields
        if (!url || !startTime || !endTime) {
            return NextResponse.json(
                { error: 'url, startTime, and endTime are required.' },
                { status: 400 }
            );
        }

        // Step 1: Create a record in the database
        const clip = await prisma.clip.create({
            data: {
                youtubeUrl: url,
                startTime,
                endTime,
                format,
                quality,
            },
        });
        console.log('  Created Clip Record:', clip.id);

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

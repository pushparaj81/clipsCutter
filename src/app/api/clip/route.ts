import { NextRequest, NextResponse } from 'next/server';
import { clipQueue } from '@/lib/queue';
import { prisma } from '@/lib/prisma';
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { videoId, startTime, endTime } = body;

    // 1. Validate Input
    if (!videoId || typeof startTime !== 'number' || typeof endTime !== 'number') {
      return NextResponse.json({ error: 'Invalid input parameters' }, { status: 400 });
    }

    if (startTime >= endTime) {
      return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 });
    }
    
    // Max duration check (e.g., 10 minutes)
    if (endTime - startTime > 600) {
      return NextResponse.json({ error: 'Clip duration exceeds 10 minutes' }, { status: 400 });
    }

    // 3. Process Video (Phase 2: Use Queue)
    // Create DB entry first
    const clip = await prisma.clip.create({
      data: {
        videoId,
        startTime,
        endTime,
        status: 'PENDING',
        originalUrl: `https://youtube.com/watch?v=${videoId}`
      }
    });

    // Add to BullMQ
    await clipQueue.add('process-clip', {
      videoId,
      startTime,
      endTime,
      clipId: clip.id
    });

    return NextResponse.json({
      status: 'queued',
      clipId: clip.id,
      jobId: (await clipQueue.getJob(clip.id))?.id, // best effort to get job ID if needed immediately
      message: 'Processing started'
    });

  } catch (error: any) {
    console.error('Clip API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process clip', details: error.message },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clipQueue } from '@/lib/queue';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clipId = searchParams.get('id');

    if (!clipId) {
      return NextResponse.json({ error: 'Clip ID is required' }, { status: 400 });
    }

    const clip = await prisma.clip.findUnique({
      where: { id: clipId }
    });

    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    // Optional: Check BullMQ job status if DB status is pending/processing
    const job = await clipQueue.getJob(clipId); // Using clipId as jobId based on previous logic
    const jobState = await job?.getState();

    return NextResponse.json({
      status: clip.status,
      jobState: jobState || 'unknown',
      downloadUrl: clip.downloadUrl,
      createdAt: clip.createdAt
    });

  } catch (error: any) {
    console.error('Status API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}

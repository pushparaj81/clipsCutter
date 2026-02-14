import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ videoId: string }> }
) {
    try {
        const { videoId } = await params;

        if (!videoId) {
            return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
        }

        const clips = await prisma.clip.findMany({
            where: { videoId },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(clips);
    } catch (error: any) {
        console.error('Error fetching clips for video:', error);
        return NextResponse.json(
            { error: 'Failed to fetch clips' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ videoId: string }> }
) {
    try {
        const { videoId } = await params;

        if (!videoId) {
            return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
        }

        // 1. Fetch all clips to get file paths
        const clips = await prisma.clip.findMany({
            where: { videoId },
            select: { id: true, filePath: true }
        });

        // 2. Delete physical files
        for (const clip of clips) {
            if (clip.filePath) {
                try {
                    const absolutePath = path.resolve(clip.filePath);
                    await fs.unlink(absolutePath);
                    console.log(`[CLEANUP] Deleted file: ${absolutePath}`);
                } catch (err: any) {
                    if (err.code !== 'ENOENT') {
                        console.error(`[CLEANUP] Failed to delete file ${clip.filePath}:`, err.message);
                    }
                }
            }
        }

        // 3. Delete database records
        await prisma.clip.deleteMany({
            where: { videoId }
        });

        return NextResponse.json({ success: true, message: `Cleared ${clips.length} sessions.` });
    } catch (error: any) {
        console.error('Error clearing clips for video:', error);
        return NextResponse.json(
            { error: 'Failed to clear clips', details: error.message },
            { status: 500 }
        );
    }
}

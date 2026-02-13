import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        console.log(`--- API /api/clips/${id} ---`);

        const clip = await prisma.clip.findUnique({
            where: { id },
        });

        if (!clip) {
            console.log(`  Clip ${id} not found.`);
            return NextResponse.json(
                { error: 'Clip not found.' },
                { status: 404 }
            );
        }

        console.log(`  Status: ${clip.status}`);
        if (clip.downloadUrl) console.log(`  Download: ${clip.downloadUrl}`);
        if (clip.error) console.log(`  Error: ${clip.error}`);

        return NextResponse.json({
            id: clip.id,
            status: clip.status,
            downloadUrl: clip.downloadUrl,
            title: clip.title,
            error: clip.error,
            createdAt: clip.createdAt,
        });

    } catch (error: any) {
        console.error('Error in /api/clips/[id]:', error);
        return NextResponse.json(
            { error: 'Failed to fetch clip status.' },
            { status: 500 }
        );
    }
}

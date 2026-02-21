import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ videoId: string }> }
) {
    try {
        const { videoId } = await params;

        const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000'}/api/clips/video/${videoId}`, { cache: 'no-store' });

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json(errorData, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Video Clips Proxy Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch video clips' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ videoId: string }> }
) {
    try {
        const { videoId } = await params;

        const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000'}/api/clips/video/${videoId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json(errorData, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Delete Clips Proxy Error:', error);
        return NextResponse.json(
            { error: 'Failed to delete video clips' },
            { status: 500 }
        );
    }
}

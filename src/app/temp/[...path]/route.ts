import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path } = await params;
        const filePath = path.join('/');

        const backendUrl = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';
        const remoteUrl = `${backendUrl}/temp/${filePath}`;

        console.log(`[TEMP PROXY] Fetching: ${remoteUrl}`);

        const response = await fetch(remoteUrl);

        if (!response.ok) {
            return new NextResponse('File not found', { status: 404 });
        }

        // Stream the response to handle large video files efficiently
        return new NextResponse(response.body, {
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
                'Content-Length': response.headers.get('Content-Length') || '',
                'Content-Disposition': response.headers.get('Content-Disposition') || `attachment; filename="${filePath}"`,
            },
        });
    } catch (error: any) {
        console.error('Temp Proxy Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

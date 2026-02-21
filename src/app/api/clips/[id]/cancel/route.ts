import { NextRequest, NextResponse } from 'next/server';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000'}/api/clips/${id}/cancel`, {
            method: 'POST'
        });

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json(errorData, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: unknown) {
        console.error('Clip Cancel Proxy Error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: 'Failed to cancel clip', details: errorMessage },
            { status: 500 }
        );
    }
}

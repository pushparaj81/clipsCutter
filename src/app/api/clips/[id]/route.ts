import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000'}/api/clips/${id}`);

        if (!response.ok) {
            const errorData = await response.json();
            return NextResponse.json(errorData, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Clip Status Proxy Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch clip status' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Forward to Python backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000'}/api/clip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to create clip job in Python backend');
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('*** CLIP PROXY ERROR ***', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}


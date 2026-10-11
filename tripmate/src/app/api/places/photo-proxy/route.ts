import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const photoName = req.nextUrl.searchParams.get('name');
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!photoName || !googleApiKey) {
    return NextResponse.json({ error: 'Photo proxy unavailable' }, { status: 404 });
  }

  try {
    const url = `https://places.googleapis.com/v1/${photoName}/media?key=${googleApiKey}&maxHeightPx=400`;
    const imageRes = await fetch(url);
    if (!imageRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch photo' }, { status: 502 });
    }

    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    const buffer = await imageRes.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Photo proxy error' }, { status: 500 });
  }
}

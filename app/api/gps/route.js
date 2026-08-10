import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.VTS_GPS_API_URL;
  const token = process.env.VTS_GPS_TOKEN;

  if (!url || !token) {
    return NextResponse.json(
      { error: 'Konfigurasi GPS API belum ada di .env.local (VTS_GPS_API_URL / VTS_GPS_TOKEN).' },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Vendor API respond ${res.status}.` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('GPS proxy error:', err);
    return NextResponse.json(
      { error: 'Gagal terhubung ke vendor GPS API.' },
      { status: 502 }
    );
  }
}

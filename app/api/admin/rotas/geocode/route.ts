import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return NextResponse.json({}, { status: 500 })

  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json({})

  try {
    const res  = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${apiKey}&language=pt-BR`,
      { cache: 'no-store' }
    )
    const data = await res.json()
    if (data.status === 'OK' && data.results[0]) {
      const loc = data.results[0].geometry.location
      return NextResponse.json({ lat: loc.lat, lng: loc.lng })
    }
  } catch { /* silencioso */ }

  return NextResponse.json({})
}

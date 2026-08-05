import { NextRequest, NextResponse } from 'next/server'
import { optimizeRoute, buildScheduleFlat, buildMapsLinks } from '@/lib/route-types'
import type { RoutePlace } from '@/lib/route-types'

export async function POST(req: NextRequest) {
  const { places, forceInclude, startTime, maxVenues } = await req.json() as {
    places: RoutePlace[]
    forceInclude?: string[]
    startTime?: string
    maxVenues?: number
  }

  if (!places?.length) {
    return NextResponse.json({ scheduled: [], manual: [], mapsLinks: [] })
  }

  const [h, m]  = (startTime ?? '09:00').split(':').map(Number)
  const startMin = h * 60 + (m || 0)
  const max      = maxVenues ?? 12

  const forceSet              = new Set<string>(forceInclude ?? [])
  const ordered               = optimizeRoute(places)
  const { scheduled, manual } = buildScheduleFlat(ordered, startMin, max, forceSet)
  const mapsLinks             = buildMapsLinks(scheduled)

  return NextResponse.json({ scheduled, manual, mapsLinks })
}

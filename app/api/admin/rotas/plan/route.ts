import { NextRequest, NextResponse } from 'next/server'
import { optimizeRoute, buildSchedule, buildMapsLinks } from '@/lib/route-types'
import type { RoutePlace } from '@/lib/route-types'

export async function POST(req: NextRequest) {
  const { places, selectedWindows, forceInclude } = await req.json() as {
    places: RoutePlace[]; selectedWindows?: string[]; forceInclude?: string[]
  }

  if (!places?.length) {
    return NextResponse.json({ scheduled: [], manual: [], mapsLinks: [] })
  }

  const forceSet              = new Set<string>(forceInclude ?? [])
  const ordered               = optimizeRoute(places)
  const { scheduled, manual } = buildSchedule(ordered, selectedWindows ?? ['manha','tarde','noturna'], forceSet)
  const mapsLinks             = buildMapsLinks(scheduled)

  return NextResponse.json({ scheduled, manual, mapsLinks })
}

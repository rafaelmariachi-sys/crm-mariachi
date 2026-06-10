import { NextRequest, NextResponse } from 'next/server'
import { NEGATIVE_KEYWORDS } from '@/lib/prospect-types'
import { passesAlcoholFilter } from '@/lib/route-types'

export const maxDuration = 60

const MAPS  = 'https://maps.googleapis.com/maps/api/place'
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

const MERCADO_SPECIALTY = [
  'gourmet','vinho','bebida','empório','emporio','drink','cerveja',
  'adega','bar','bistrô','bistro','gastro','artesanal','deli','delicatessen',
]

function passesFilter(name: string, types: string[] = []): boolean {
  const nl = name.toLowerCase()
  if (nl.includes('supermercado')) return false
  if (nl.includes('mercado')) {
    if (!MERCADO_SPECIALTY.some(kw => nl.includes(kw))) return false
  }
  for (const kw of NEGATIVE_KEYWORDS) {
    if (nl.includes(kw)) return false
  }
  const negTypes = new Set([
    'school','university','hospital','pharmacy','drugstore','gas_station',
    'car_repair','car_dealer','laundry','beauty_salon','hair_care','dentist',
    'doctor','physiotherapist','veterinary_care','supermarket',
    'grocery_or_supermarket','real_estate_agency','bank','pet_store','gym',
  ])
  for (const t of types) { if (negTypes.has(t)) return false }
  return true
}

function extractInstagram(url?: string | null): string {
  if (!url) return ''
  try {
    const u = new URL(url)
    if (u.hostname.includes('instagram.com')) {
      const parts = u.pathname.split('/').filter(Boolean)
      const reserved = ['p','reel','reels','explore','stories','tv','accounts']
      if (parts.length > 0 && !reserved.includes(parts[0])) return '@' + parts[0]
    }
  } catch {
    const m = url.match(/instagram\.com\/([A-Za-z0-9._]+)/)
    if (m) return '@' + m[1]
  }
  return ''
}

function normalizeStr(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

function extractNeighborhood(components: any[] = []): string {
  for (const c of components) {
    if (c.types?.includes('sublocality_level_1')) return c.long_name
  }
  for (const c of components) {
    if (c.types?.includes('sublocality')) return c.long_name
  }
  return ''
}

function correctTypeByName(name: string, typeLabel: string): string {
  const n = normalizeStr(name)
  if (n.includes('adega') || n.includes('emporio') || n.includes('empório') || n.includes('vinoteca'))
    return 'Empórios, Adegas e Lojas de Bebidas'
  if (n.includes('cervejaria') || n.includes('brewpub'))
    return 'Cervejarias e Brewpubs'
  if (n.includes('cocktail') || n.includes('speakeasy'))
    return 'Cocktail Bars e Speakeasies'
  if (n.includes('balada') || n.includes('nightclub'))
    return 'Baladas e Casas Noturnas'
  if (n.includes('distribuidora'))
    return 'Distribuidoras de Bebidas'
  return typeLabel
}

function formatHorario(oh: any): string {
  if (!oh?.weekday_text?.length) return 'Não informado'
  return oh.weekday_text.join(' | ')
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY não configurada' }, { status: 500 })

  const { query, typeLabel, lat, lng } = await req.json() as {
    query: string; typeLabel: string; lat?: number; lng?: number
  }

  if (!query?.trim()) return NextResponse.json({ error: 'query obrigatória' }, { status: 400 })

  // ── Text Search ──────────────────────────────────────────────────────────
  const places: any[] = []
  let pageToken: string | null = null
  let page = 0

  do {
    if (page > 0) await sleep(2200)
    const params = new URLSearchParams({ query, key: apiKey, language: 'pt-BR' })
    if (pageToken) {
      params.set('pagetoken', pageToken)
    } else if (lat && lng) {
      params.set('location', `${lat},${lng}`)
      params.set('radius',   '3000')
    }

    const res  = await fetch(`${MAPS}/textsearch/json?${params}`, { cache: 'no-store' })
    const data = await res.json()

    if (data.status === 'ZERO_RESULTS') break
    if (data.status === 'REQUEST_DENIED') return NextResponse.json({ error: data.error_message }, { status: 403 })
    if (!['OK', 'NEXT_PAGE_AVAILABLE'].includes(data.status)) break

    places.push(...(data.results || []))
    pageToken = data.next_page_token ?? null
    page++
    await sleep(150)
  } while (pageToken && page < 3)

  if (places.length === 0) return NextResponse.json({ places: [] })

  // ── Place Details ────────────────────────────────────────────────────────
  const results: any[] = []

  for (const place of places) {
    if (!place.place_id) continue
    if (!passesFilter(place.name, place.types)) continue

    const dp = new URLSearchParams({
      place_id: place.place_id,
      key:      apiKey,
      language: 'pt-BR',
      fields:   'name,formatted_address,address_components,formatted_phone_number,website,opening_hours,geometry,editorial_summary',
    })
    const dr = await fetch(`${MAPS}/details/json?${dp}`, { cache: 'no-store' })
    const dd = await dr.json()
    if (dd.status !== 'OK') continue
    await sleep(120)

    const d        = dd.result
    const finalName = d.name || place.name
    const editorial = d.editorial_summary?.overview ?? ''
    const finalType = correctTypeByName(finalName, typeLabel)

    // Filtro de bebidas alcoólicas / destilados
    if (!passesAlcoholFilter(finalType, finalName, editorial)) continue

    results.push({
      place_id:      place.place_id,
      name:          finalName,
      type_label:    finalType,
      address:       d.formatted_address || place.formatted_address || '',
      neighborhood:  extractNeighborhood(d.address_components),
      phone:         d.formatted_phone_number || '',
      instagram:     extractInstagram(d.website),
      horario_texto: formatHorario(d.opening_hours),
      opening_hours: d.opening_hours || null,
      lat:           d.geometry?.location?.lat ?? place.geometry?.location?.lat ?? null,
      lng:           d.geometry?.location?.lng ?? place.geometry?.location?.lng ?? null,
    })
  }

  return NextResponse.json({ places: results })
}

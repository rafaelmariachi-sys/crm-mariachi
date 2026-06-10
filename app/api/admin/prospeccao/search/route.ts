import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NEGATIVE_KEYWORDS, detectCuisine } from '@/lib/prospect-types'

export const maxDuration = 60

const MAPS  = 'https://maps.googleapis.com/maps/api/place'
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// ── Filtro negativo ───────────────────────────────────────────────────────────

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
  for (const t of types) {
    if (negTypes.has(t)) return false
  }
  return true
}

type LatLng = { lat: number; lng: number }

// Distância em metros entre dois pontos (fórmula de Haversine)
function distanceM(a: LatLng, b: LatLng): number {
  const R  = 6_371_000
  const φ1 = (a.lat * Math.PI) / 180
  const φ2 = (b.lat * Math.PI) / 180
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180
  const x  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

// ── Helpers de endereço ───────────────────────────────────────────────────────

function extractInstagramHandle(url?: string | null): string {
  if (!url) return ''
  try {
    const u = new URL(url)
    if (u.hostname.includes('instagram.com')) {
      const parts    = u.pathname.split('/').filter(Boolean)
      const reserved = ['p','reel','reels','explore','stories','tv','accounts']
      if (parts.length > 0 && !reserved.includes(parts[0])) return '@' + parts[0]
    }
  } catch {
    const m = url.match(/instagram\.com\/([A-Za-z0-9._]+)/)
    if (m) return '@' + m[1]
  }
  return ''
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

function extractCity(components: any[] = []): string {
  for (const c of components) {
    if (c.types?.includes('administrative_area_level_2')) return c.long_name
  }
  return ''
}

function normalizeStr(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

// Corrige o tipo com base no nome do lugar — evita que uma adega fique como "Bar"
function correctTypeByName(name: string, typeLabel: string): string {
  const n = normalizeStr(name)
  if (n.includes('adega') || n.includes('emporio') || n.includes('empório') || n.includes('loja de bebidas') || n.includes('vinoteca'))
    return 'Empórios, Adegas e Lojas de Bebidas'
  if (n.includes('cervejaria') || n.includes('brewpub') || n.includes('brew'))
    return 'Cervejarias e Brewpubs'
  if (n.includes('cocktail') || n.includes('speakeasy'))
    return 'Cocktail Bars e Speakeasies'
  if (n.includes('balada') || n.includes('nightclub') || n.includes('night club'))
    return 'Baladas e Casas Noturnas'
  if (n.includes('distribuidora'))
    return 'Distribuidoras de Bebidas'
  return typeLabel
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GOOGLE_PLACES_API_KEY não configurada no .env.local' },
      { status: 500 }
    )
  }

  const { query, territory, typeLabel, neighborhood, city, lat, lng } = await req.json() as {
    query: string; territory: string; typeLabel: string
    neighborhood: string; city: string; lat: number; lng: number
  }

  if (!query?.trim()) {
    return NextResponse.json({ error: 'query obrigatória' }, { status: 400 })
  }

  // Coordenadas já vêm embutidas nos territórios — sem chamada extra à API
  const center: LatLng | null = (lat && lng) ? { lat, lng } : null
  const radiusM = neighborhood ? 2500 : 10_000

  // ── 1. Text Search com paginação e location bias ────────────────────────────
  const places: any[] = []
  let pageToken: string | null = null
  let page = 0

  do {
    if (page > 0) await sleep(2200)

    const params = new URLSearchParams({ query, key: apiKey, language: 'pt-BR' })
    if (pageToken) {
      params.set('pagetoken', pageToken)
    } else if (center) {
      // location bias: orienta a busca para o bairro/cidade certo
      params.set('location', `${center.lat},${center.lng}`)
      params.set('radius',   String(radiusM))
    }

    const res  = await fetch(`${MAPS}/textsearch/json?${params}`, { cache: 'no-store' })
    const data = await res.json()

    if (data.status === 'ZERO_RESULTS') break
    if (data.status === 'REQUEST_DENIED') {
      return NextResponse.json({ error: `API Key inválida: ${data.error_message}` }, { status: 403 })
    }
    if (!['OK', 'NEXT_PAGE_AVAILABLE'].includes(data.status)) break

    places.push(...(data.results || []))
    pageToken = data.next_page_token ?? null
    page++

    await sleep(150)
  } while (pageToken && page < 3)

  if (places.length === 0) {
    return NextResponse.json({ added: 0, skipped: 0 })
  }

  // ── 3. Filtro rápido por distância (antes de chamar Place Details) ──────────
  const nearbyPlaces = places.filter(p => {
    if (!center || !p.geometry?.location) return true // sem coords → não filtrar
    return distanceM(center, p.geometry.location) <= radiusM * 1.4 // 40% de tolerância
  })

  // ── 4. Verificar place_ids já existentes ────────────────────────────────────
  const supabase  = createAdminClient()
  const placeIds  = nearbyPlaces.map(p => p.place_id).filter(Boolean)

  const { data: existing } = await supabase
    .from('prospects')
    .select('place_id')
    .in('place_id', placeIds)

  const existingSet = new Set((existing ?? []).map((r: any) => r.place_id))

  // ── 5. Place Details para cada novo lugar aprovado ─────────────────────────
  const newRows: any[] = []
  let skipped = (places.length - nearbyPlaces.length) + existingSet.size

  for (const place of nearbyPlaces) {
    if (!place.place_id || existingSet.has(place.place_id)) { skipped++; continue }
    if (!passesFilter(place.name, place.types))              { skipped++; continue }

    const dp = new URLSearchParams({
      place_id: place.place_id,
      key:      apiKey,
      language: 'pt-BR',
      fields:   'name,formatted_address,address_components,formatted_phone_number,website,rating,user_ratings_total,types',
    })

    const dr = await fetch(`${MAPS}/details/json?${dp}`, { cache: 'no-store' })
    const dd = await dr.json()
    if (dd.status !== 'OK') { skipped++; continue }
    const d = dd.result

    await sleep(120)

    // Validação final por cidade (segundo nível de segurança)
    if (city) {
      const resultCity = extractCity(d.address_components)
      if (resultCity) {
        const expCity = normalizeStr(city)
        const gotCity = normalizeStr(resultCity)
        if (!gotCity.includes(expCity) && !expCity.includes(gotCity)) {
          skipped++
          continue
        }
      }
    }

    const finalName = d.name || place.name
    newRows.push({
      place_id:         place.place_id,
      name:             finalName,
      type:             correctTypeByName(finalName, typeLabel) || null,
      cuisine:          typeLabel === 'Restaurantes' ? detectCuisine(finalName) : null,
      address:          d.formatted_address  || place.formatted_address || null,
      neighborhood:     extractNeighborhood(d.address_components)       || null,
      city:             extractCity(d.address_components)               || null,
      phone:            d.formatted_phone_number                        || null,
      website:          d.website                                       || null,
      instagram_google: extractInstagramHandle(d.website)               || null,
      rating:           d.rating             ?? place.rating            ?? null,
      review_count:     d.user_ratings_total  ?? place.user_ratings_total ?? null,
      territory:        territory || null,
      status:           'novo',
    })
  }

  if (newRows.length > 0) {
    const { error } = await supabase.from('prospects').insert(newRows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ added: newRows.length, skipped })
}

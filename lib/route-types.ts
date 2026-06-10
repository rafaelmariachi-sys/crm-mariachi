// ── Tipos e lógica pura do Planejador de Rotas ───────────────────────────

export const ORIGEM = { lat: -23.5060, lng: -46.6958, label: 'Freguesia do Ó' }

// ── Microrregiões (coordenadas = centroide do grupo de bairros) ───────────

export type MicroRegion = {
  key:           string   // valor único para o Select
  label:         string   // ex: "Zona Oeste 1"
  sublabel:      string   // ex: "Barra Funda · Água Branca"
  region:        string   // agrupamento: "Zona Oeste"
  queryHint:     string   // bairro principal p/ query Google
  city:          string
  lat:           number
  lng:           number
}

const SP = 'São Paulo'

export const MICRO_REGIONS: MicroRegion[] = [
  // ── Centro ──────────────────────────────────────────────────────────────
  { key:'c1', region:'Centro', label:'Centro 1', sublabel:'Sé · República · Bela Vista',             queryHint:'República',      city:SP, lat:-23.5480, lng:-46.6370 },
  { key:'c2', region:'Centro', label:'Centro 2', sublabel:'Consolação · Santa Cecília · Higienópolis', queryHint:'Consolação',   city:SP, lat:-23.5450, lng:-46.6560 },
  { key:'c3', region:'Centro', label:'Centro 3', sublabel:'Liberdade · Aclimação · Bixiga',           queryHint:'Liberdade',      city:SP, lat:-23.5630, lng:-46.6360 },
  { key:'c4', region:'Centro', label:'Centro 4', sublabel:'Bom Retiro · Brás · Pari',                 queryHint:'Bom Retiro',     city:SP, lat:-23.5340, lng:-46.6280 },

  // ── Jardins / Centro-Oeste ───────────────────────────────────────────────
  { key:'j1', region:'Jardins / Centro-Oeste', label:'Jardins 1', sublabel:'Jardins · Cerqueira César',             queryHint:'Jardins',         city:SP, lat:-23.5625, lng:-46.6630 },
  { key:'j2', region:'Jardins / Centro-Oeste', label:'Jardins 2', sublabel:'Pacaembu · Sumaré · Perdizes Sul',      queryHint:'Pacaembu',        city:SP, lat:-23.5430, lng:-46.6700 },
  { key:'j3', region:'Jardins / Centro-Oeste', label:'Jardins 3', sublabel:'Paraíso · Vila Buarque · Vila Mariana Norte', queryHint:'Paraíso',  city:SP, lat:-23.5760, lng:-46.6450 },
  { key:'j4', region:'Jardins / Centro-Oeste', label:'Jardins 4', sublabel:'Itaim Norte · Vila Nova Conceição',     queryHint:'Itaim Bibi',      city:SP, lat:-23.5910, lng:-46.6670 },

  // ── Zona Oeste ───────────────────────────────────────────────────────────
  { key:'zo1', region:'Zona Oeste', label:'Zona Oeste 1', sublabel:'Barra Funda · Água Branca',                  queryHint:'Barra Funda',       city:SP, lat:-23.5245, lng:-46.6685 },
  { key:'zo2', region:'Zona Oeste', label:'Zona Oeste 2', sublabel:'Perdizes · Pompéia · Lapa',                  queryHint:'Perdizes',          city:SP, lat:-23.5295, lng:-46.6860 },
  { key:'zo3', region:'Zona Oeste', label:'Zona Oeste 3', sublabel:'Pinheiros · Vila Madalena',                  queryHint:'Pinheiros',         city:SP, lat:-23.5590, lng:-46.6890 },
  { key:'zo4', region:'Zona Oeste', label:'Zona Oeste 4', sublabel:'Alto de Pinheiros · Alto da Lapa · Vila Leopoldina', queryHint:'Alto de Pinheiros', city:SP, lat:-23.5270, lng:-46.7260 },
  { key:'zo5', region:'Zona Oeste', label:'Zona Oeste 5', sublabel:'Itaim Bibi · Brooklin Novo',                 queryHint:'Itaim Bibi',        city:SP, lat:-23.5940, lng:-46.6800 },
  { key:'zo6', region:'Zona Oeste', label:'Zona Oeste 6', sublabel:'Morumbi · Butantã · Vila Sônia',             queryHint:'Morumbi',           city:SP, lat:-23.6040, lng:-46.7250 },
  { key:'zo7', region:'Zona Oeste', label:'Zona Oeste 7', sublabel:'Pirituba · Jaraguá · Perus',                 queryHint:'Pirituba',          city:SP, lat:-23.4790, lng:-46.7350 },
  { key:'zo8', region:'Zona Oeste', label:'Zona Oeste 8', sublabel:'Freguesia do Ó · Brasilândia · Limão',       queryHint:'Freguesia do Ó',    city:SP, lat:-23.5010, lng:-46.6930 },

  // ── Zona Norte ───────────────────────────────────────────────────────────
  { key:'zn1', region:'Zona Norte', label:'Zona Norte 1', sublabel:'Santana · Mandaqui · Lauzane Paulista',      queryHint:'Santana',           city:SP, lat:-23.4960, lng:-46.6270 },
  { key:'zn2', region:'Zona Norte', label:'Zona Norte 2', sublabel:'Tucuruvi · Parada Inglesa · Vila Guilherme', queryHint:'Tucuruvi',          city:SP, lat:-23.4870, lng:-46.6120 },
  { key:'zn3', region:'Zona Norte', label:'Zona Norte 3', sublabel:'Casa Verde · Cachoeirinha · Vila Medeiros',  queryHint:'Casa Verde',        city:SP, lat:-23.4980, lng:-46.6480 },
  { key:'zn4', region:'Zona Norte', label:'Zona Norte 4', sublabel:'Cantareira · Tremembé · Jaçanã',             queryHint:'Tremembé',          city:SP, lat:-23.4620, lng:-46.6220 },

  // ── Zona Sul ─────────────────────────────────────────────────────────────
  { key:'zs1', region:'Zona Sul', label:'Zona Sul 1', sublabel:'Vila Mariana · Saúde · Chácara Klabin',          queryHint:'Vila Mariana',      city:SP, lat:-23.5930, lng:-46.6290 },
  { key:'zs2', region:'Zona Sul', label:'Zona Sul 2', sublabel:'Moema · Indianópolis · Planalto Paulista',       queryHint:'Moema',             city:SP, lat:-23.6010, lng:-46.6560 },
  { key:'zs3', region:'Zona Sul', label:'Zona Sul 3', sublabel:'Brooklin · Campo Belo · Granja Julieta',         queryHint:'Brooklin',          city:SP, lat:-23.6230, lng:-46.6890 },
  { key:'zs4', region:'Zona Sul', label:'Zona Sul 4', sublabel:'Santo Amaro · Cidade Ademar · Jabaquara',        queryHint:'Santo Amaro',       city:SP, lat:-23.6510, lng:-46.7000 },
  { key:'zs5', region:'Zona Sul', label:'Zona Sul 5', sublabel:'Ipiranga · Vila Prudente Sul · Saúde',           queryHint:'Ipiranga',          city:SP, lat:-23.5960, lng:-46.6100 },
  { key:'zs6', region:'Zona Sul', label:'Zona Sul 6', sublabel:'Interlagos · Cidade Dutra · Grajaú',             queryHint:'Interlagos',        city:SP, lat:-23.6800, lng:-46.7200 },

  // ── Zona Leste ───────────────────────────────────────────────────────────
  { key:'zl1', region:'Zona Leste', label:'Zona Leste 1', sublabel:'Tatuapé · Anália Franco · Carrão',           queryHint:'Tatuapé',           city:SP, lat:-23.5415, lng:-46.5720 },
  { key:'zl2', region:'Zona Leste', label:'Zona Leste 2', sublabel:'Mooca · Belenzinho · Brás',                  queryHint:'Mooca',             city:SP, lat:-23.5490, lng:-46.6010 },
  { key:'zl3', region:'Zona Leste', label:'Zona Leste 3', sublabel:'Penha · Parque São Jorge · Vila Formosa',    queryHint:'Penha',             city:SP, lat:-23.5220, lng:-46.5390 },
  { key:'zl4', region:'Zona Leste', label:'Zona Leste 4', sublabel:'Água Rasa · Aricanduva · Vila Matilde',      queryHint:'Aricanduva',        city:SP, lat:-23.5520, lng:-46.5320 },
  { key:'zl5', region:'Zona Leste', label:'Zona Leste 5', sublabel:'Vila Prudente · São Lucas · Sapopemba',      queryHint:'Vila Prudente',     city:SP, lat:-23.5890, lng:-46.5680 },
  { key:'zl6', region:'Zona Leste', label:'Zona Leste 6', sublabel:'Itaquera · Guaianases · São Mateus',         queryHint:'Itaquera',          city:SP, lat:-23.5430, lng:-46.4550 },

  // ── Grande SP — Norte ────────────────────────────────────────────────────
  { key:'gs1', region:'Grande SP — Norte', label:'Guarulhos 1', sublabel:'Centro · Gopouva · São João',          queryHint:'Guarulhos',   city:'Guarulhos',            lat:-23.4560, lng:-46.5330 },
  { key:'gs2', region:'Grande SP — Norte', label:'Guarulhos 2', sublabel:'Macedo · Bonsucesso · Cumbica',        queryHint:'Guarulhos',   city:'Guarulhos',            lat:-23.4200, lng:-46.4700 },
  { key:'gs3', region:'Grande SP — Norte', label:'Franco da Rocha · Caieiras', sublabel:'Franco da Rocha · Caieiras · Franco do Rocha', queryHint:'Franco da Rocha', city:'Franco da Rocha', lat:-23.3280, lng:-46.7280 },

  // ── Grande SP — ABC ──────────────────────────────────────────────────────
  { key:'abc1', region:'Grande SP — ABC', label:'Santo André',             sublabel:'Centro · Campestre · Jardim',   queryHint:'Santo André',          city:'Santo André',            lat:-23.6624, lng:-46.5382 },
  { key:'abc2', region:'Grande SP — ABC', label:'São Bernardo do Campo',   sublabel:'Centro · Rudge Ramos',          queryHint:'São Bernardo do Campo', city:'São Bernardo do Campo',  lat:-23.6914, lng:-46.5646 },
  { key:'abc3', region:'Grande SP — ABC', label:'São Caetano do Sul',      sublabel:'Centro · Santa Paula · Olímpico', queryHint:'São Caetano do Sul',  city:'São Caetano do Sul',     lat:-23.6231, lng:-46.5742 },
  { key:'abc4', region:'Grande SP — ABC', label:'Diadema · Mauá',          sublabel:'Diadema · Mauá · Ribeirão Pires', queryHint:'Diadema',             city:'Diadema',                lat:-23.6920, lng:-46.6200 },

  // ── Grande SP — Oeste ────────────────────────────────────────────────────
  { key:'gso1', region:'Grande SP — Oeste', label:'Osasco 1',   sublabel:'Centro · Km 18 · Baronesa',          queryHint:'Osasco',           city:'Osasco',             lat:-23.5324, lng:-46.7919 },
  { key:'gso2', region:'Grande SP — Oeste', label:'Barueri · Alphaville', sublabel:'Barueri · Alphaville · Tambore', queryHint:'Alphaville',  city:'Barueri',            lat:-23.5040, lng:-46.8520 },
  { key:'gso3', region:'Grande SP — Oeste', label:'Carapicuíba · Cotia', sublabel:'Carapicuíba · Cotia · Granja Viana', queryHint:'Carapicuíba', city:'Carapicuíba',     lat:-23.5260, lng:-46.8420 },
  { key:'gso4', region:'Grande SP — Oeste', label:'Santana de Parnaíba', sublabel:'Santana de Parnaíba · Pirapora', queryHint:'Santana de Parnaíba', city:'Santana de Parnaíba', lat:-23.4437, lng:-46.9186 },
  { key:'gso5', region:'Grande SP — Oeste', label:'Embu · Taboão',       sublabel:'Embu das Artes · Taboão da Serra', queryHint:'Embu das Artes', city:'Embu das Artes',  lat:-23.6494, lng:-46.8519 },

  // ── Litoral ──────────────────────────────────────────────────────────────
  { key:'lit1', region:'Litoral Paulista', label:'Santos · Orla',         sublabel:'Santos · Gonzaga · Boqueirão',   queryHint:'Santos',           city:'Santos',         lat:-23.9608, lng:-46.3336 },
  { key:'lit2', region:'Litoral Paulista', label:'Guarujá · São Vicente', sublabel:'Guarujá · São Vicente · Praia Grande', queryHint:'Guarujá',    city:'Guarujá',        lat:-23.9850, lng:-46.3300 },
  { key:'lit3', region:'Litoral Paulista', label:'Bertioga',               sublabel:'Bertioga · Riviera',            queryHint:'Bertioga',          city:'Bertioga',       lat:-23.8553, lng:-46.1386 },
  { key:'lit4', region:'Litoral Paulista', label:'Litoral Norte 1',        sublabel:'Ubatuba · Prumirim',            queryHint:'Ubatuba',           city:'Ubatuba',        lat:-23.4337, lng:-45.0838 },
  { key:'lit5', region:'Litoral Paulista', label:'Litoral Norte 2',        sublabel:'Caraguatatuba · São Sebastião · Ilhabela', queryHint:'Caraguatatuba', city:'Caraguatatuba', lat:-23.6208, lng:-45.4126 },
  { key:'lit6', region:'Litoral Paulista', label:'Litoral Sul',            sublabel:'Itanhaém · Peruíbe · Mongaguá', queryHint:'Itanhaém',          city:'Itanhaém',       lat:-24.1844, lng:-46.7851 },
]

// Helper: retorna regiões únicas para agrupar no Select
export const MICRO_REGION_GROUPS: string[] = Array.from(
  new Set(MICRO_REGIONS.map(r => r.region))
)

// ── Tipos já inerentemente alcoólicos (passam o filtro automaticamente) ───

const ALCOHOL_AUTO_PASS_TYPES = new Set([
  'bares e pubs',
  'cocktail bars e speakeasies',
  'baladas e casas noturnas',
  'empórios, adegas e lojas de bebidas',
  'distribuidoras de bebidas',
  'cervejarias e brewpubs',
])

const ALCOHOL_KEYWORDS = [
  'bebida','alcoól','destilado','spirits','whisky','whiskey','rum','vodka',
  'gin','tequila','cachaça','cachaca','vinho','cerveja','chopp','draft',
  'cocktail','coquetel','drinks','open bar','sommelier','adega','pub',
  'bar','draft beer','craft beer','artesanal','espumante','prosecco',
]

export function passesAlcoholFilter(typeLabel: string, name: string, editorialSummary?: string): boolean {
  const t = typeLabel.toLowerCase()
  // Tipos inerentemente alcoólicos passam direto
  if (ALCOHOL_AUTO_PASS_TYPES.has(t)) return true

  // Para restaurantes/hotéis/outros: verificar nome e descrição
  const haystack = `${name} ${editorialSummary ?? ''}`.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
  return ALCOHOL_KEYWORDS.some(kw =>
    haystack.includes(kw.normalize('NFD').replace(/[̀-ͯ]/g, ''))
  )
}

export type RoutePlace = {
  place_id:      string
  name:          string
  type_label:    string
  address:       string
  neighborhood:  string
  phone:         string
  instagram:     string
  horario_texto: string
  opening_hours: any
  lat:           number | null
  lng:           number | null
  // adicionados pela rota
  ordem?:           number
  distancia_m?:     number | null
  janela?:          string
  horario_chegada?: string
  duracao_estimada?: string
  motivo_manual?:   string
}

// ── Janelas ───────────────────────────────────────────────────────────────

const WINDOWS = {
  manha:   { start: 8 * 60,  end: 11 * 60, label: 'Manhã (8h-11h)'              },
  tarde:   { start: 14 * 60, end: 17 * 60, label: 'Tarde (14h-17h)'             },
  noturna: { start: 20 * 60, end: 23 * 60, label: 'Noturna (a partir das 20h)'  },
}

const TRAVEL_BUFFER = 15 // minutos entre paradas

const NIGHT_KEYWORDS = ['bares', 'pub', 'cocktail', 'speakeasy', 'balada', 'noturna', 'nightclub']

// ── Duração por tipo ──────────────────────────────────────────────────────

export function getDuration(typeLabel = ''): number {
  const t = typeLabel.toLowerCase()
  if (t.includes('cocktail') || t.includes('speakeasy')) return 120
  if (t.includes('empório') || t.includes('emporio') ||
      t.includes('adega')   || t.includes('distribuidora') ||
      t.includes('loja de bebidas'))                        return 30
  return 30
}

// ── Janela por tipo + horário ─────────────────────────────────────────────

export function getVisitWindow(typeLabel = '', openingHours: any): 'manha' | 'tarde' | 'noturna' | 'sem_horario' {
  const t = typeLabel.toLowerCase()
  if (NIGHT_KEYWORDS.some(kw => t.includes(kw))) return 'noturna'
  if (!openingHours?.periods?.length) return 'sem_horario'
  const h = getWeekdayHours(openingHours)
  if (!h) return 'sem_horario'
  return h.openMin < 12 * 60 ? 'manha' : 'tarde'
}

function hhmmToMin(str: string): number {
  const s = String(str).padStart(4, '0')
  return parseInt(s.slice(0, 2)) * 60 + parseInt(s.slice(2, 4))
}

export function getWeekdayHours(openingHours: any): { openMin: number; closeMin: number | null } | null {
  if (!openingHours?.periods?.length) return null
  const p =
    openingHours.periods.find((x: any) => x.open?.day === 2) ||
    openingHours.periods.find((x: any) => x.open?.day >= 1 && x.open?.day <= 5) ||
    openingHours.periods[0]
  if (!p?.open?.time) return null
  const openMin  = hhmmToMin(p.open.time)
  const closeRaw = p.close?.time ? hhmmToMin(p.close.time) : null
  const closeMin = closeRaw !== null && closeRaw < openMin ? closeRaw + 24 * 60 : closeRaw
  return { openMin, closeMin }
}

export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60) % 24
  const m = min % 60
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`
}

// ── Distância Haversine ───────────────────────────────────────────────────

export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R  = 6_371_000
  const φ1 = (a.lat * Math.PI) / 180
  const φ2 = (b.lat * Math.PI) / 180
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180
  const x  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

// ── Nearest-neighbor a partir da Freguesia do Ó ───────────────────────────

export function optimizeRoute(places: RoutePlace[]): RoutePlace[] {
  const withCoords    = places.filter(p => p.lat != null && p.lng != null)
  const withoutCoords = places.filter(p => p.lat == null || p.lng == null)

  const unvisited = [...withCoords]
  const route: RoutePlace[] = []
  let current: { lat: number; lng: number } = ORIGEM

  while (unvisited.length > 0) {
    let nearestIdx = 0
    let nearestDist = distanceM(current, unvisited[0] as any)

    for (let i = 1; i < unvisited.length; i++) {
      const d = distanceM(current, unvisited[i] as any)
      if (d < nearestDist) { nearestDist = d; nearestIdx = i }
    }

    const chosen = unvisited.splice(nearestIdx, 1)[0]
    route.push({ ...chosen, ordem: route.length + 1, distancia_m: Math.round(nearestDist) })
    current = chosen as any
  }

  for (const p of withoutCoords) {
    route.push({ ...p, ordem: route.length + 1, distancia_m: null })
  }

  return route
}

// ── Montar agenda ─────────────────────────────────────────────────────────

// Janela forçada para lugares sem horário: decide pelo tipo
function forceWindow(typeLabel: string): 'manha' | 'tarde' | 'noturna' {
  const t = typeLabel.toLowerCase()
  if (NIGHT_KEYWORDS.some(kw => t.includes(kw))) return 'noturna'
  return 'tarde'
}

export function buildSchedule(
  orderedPlaces: RoutePlace[],
  selectedWindows: string[] = ['manha','tarde','noturna'],
  forceInclude: Set<string> = new Set()
): {
  scheduled: RoutePlace[]
  manual: RoutePlace[]
} {
  const groups: Record<string, RoutePlace[]> = { manha: [], tarde: [], noturna: [], sem_horario: [] }

  for (const p of orderedPlaces) {
    const forced = forceInclude.has(p.place_id)
    const w = forced && getVisitWindow(p.type_label, p.opening_hours) === 'sem_horario'
      ? forceWindow(p.type_label)
      : getVisitWindow(p.type_label, p.opening_hours)
    ;(groups[w] as any[]).push({ ...p, _forced: forced })
  }

  const scheduled: RoutePlace[] = []
  const manual:    RoutePlace[] = []

  for (const [key, cfg] of Object.entries(WINDOWS)) {
    const windowPlaces = groups[key] as any[]
    const forcedHere   = windowPlaces.filter(p => p._forced)
    const normalHere   = windowPlaces.filter(p => !p._forced)

    if (!selectedWindows.includes(key)) {
      // Normais → manual; forçados continuam sendo processados na janela mesmo assim
      for (const p of normalHere) manual.push({ ...p, motivo_manual: 'Janela não selecionada' })
      if (forcedHere.length === 0) continue
      // Só processa forçados nesta janela
      groups[key] = forcedHere as RoutePlace[]
    }

    let current = cfg.start

    for (const place of groups[key]) {
      const duration = getDuration(place.type_label)
      const hours    = getWeekdayHours(place.opening_hours)
      const forced   = (place as any)._forced === true

      let arrival = current
      if (hours && arrival < hours.openMin) arrival = hours.openMin

      if (!forced) {
        if (hours?.closeMin && arrival + duration > hours.closeMin) {
          manual.push({ ...place, motivo_manual: 'Visita ultrapassaria o horário de encerramento' })
          continue
        }
        if (arrival + duration > cfg.end) {
          manual.push({ ...place, motivo_manual: 'Não cabe na janela de visita' })
          continue
        }
      }

      scheduled.push({
        ...place,
        janela:           cfg.label,
        horario_chegada:  minutesToTime(arrival),
        duracao_estimada: duration >= 60 ? `${duration / 60}h` : `${duration} min`,
      })

      current = arrival + duration + TRAVEL_BUFFER
    }
  }

  // sem_horario não forçados → manual
  for (const p of groups.sem_horario as any[]) {
    if (!p._forced) manual.push({ ...p, motivo_manual: 'Horário não encontrado' })
  }

  return { scheduled, manual }
}

// ── Links Google Maps ─────────────────────────────────────────────────────

const MAX_STOPS = 9

export function buildMapsLinks(scheduled: RoutePlace[]): { janela: string; parte: string; count: number; url: string }[] {
  const byWindow: Record<string, RoutePlace[]> = {}

  for (const p of scheduled) {
    const j = p.janela ?? 'Sem janela'
    if (!byWindow[j]) byWindow[j] = []
    byWindow[j].push(p)
  }

  const links: { janela: string; parte: string; count: number; url: string }[] = []

  for (const [janela, places] of Object.entries(byWindow)) {
    for (let i = 0; i < places.length; i += MAX_STOPS) {
      const chunk = places.slice(i, i + MAX_STOPS)
      const stops = chunk.map(p =>
        p.lat != null && p.lng != null
          ? `${p.lat},${p.lng}`
          : encodeURIComponent(p.address || p.name)
      )
      const origem = `${ORIGEM.lat},${ORIGEM.lng}`
      const url    = `https://www.google.com/maps/dir/${origem}/${stops.join('/')}`
      links.push({
        janela,
        parte:  places.length > MAX_STOPS ? `Parte ${Math.floor(i / MAX_STOPS) + 1}` : '',
        count:  chunk.length,
        url,
      })
    }
  }

  return links
}

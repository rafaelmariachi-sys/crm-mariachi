'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button }   from '@/components/ui/button'
import { Badge }    from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import {
  Route, Loader2, Download, ExternalLink, MapPin,
  Phone, Instagram, Clock, ChevronDown, ChevronUp,
  CheckSquare, Square, Navigation,
  CheckCircle2, PlusCircle, Map,
} from 'lucide-react'
import { SEARCH_TYPES } from '@/lib/prospect-types'
import { ORIGEM } from '@/lib/route-types'
import type { RoutePlace } from '@/lib/route-types'
import { cn } from '@/lib/utils'

// ── CSV Export ────────────────────────────────────────────────────────────

function exportCSV(scheduled: RoutePlace[], manual: RoutePlace[]) {
  const headSched  = ['Ordem','Janela','Chegada','Duração','Nome','Tipo','Endereço','Bairro','Telefone','Instagram','Horário Funcionamento']
  const rowsSched  = scheduled.map(p => [p.ordem, p.janela, p.horario_chegada, p.duracao_estimada, p.name, p.type_label, p.address, p.neighborhood, p.phone, p.instagram, p.horario_texto])
  const headManual = ['Nome','Tipo','Endereço','Bairro','Telefone','Instagram','Horário Funcionamento','Motivo']
  const rowsManual = manual.map(p => [p.name, p.type_label, p.address, p.neighborhood, p.phone, p.instagram, p.horario_texto, p.motivo_manual])
  const fmt = (r: any[]) => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')
  const csv = ['=== ROTA AGENDADA ===', fmt(headSched), ...rowsSched.map(fmt), '', '=== DECISÃO MANUAL ===', fmt(headManual), ...rowsManual.map(fmt)].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `rota-${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── MapPicker ─────────────────────────────────────────────────────────────

interface MapArea { lat: number; lng: number; radiusKm: number }

let _mapsLoading = false
let _mapsLoaded  = false

function MapPicker({ mapsKey, onChange }: {
  mapsKey: string
  onChange: (area: MapArea | null) => void
}) {
  const mapDivRef    = useRef<HTMLDivElement>(null)
  const instanceRef  = useRef<{ map: any; marker: any; circle: any } | null>(null)
  const [mapReady,   setMapReady]   = useState(false)
  const [mapError,   setMapError]   = useState('')
  const [radiusKm,   setRadiusKm]   = useState(3)
  const [center,  setCenter]  = useState<{ lat: number; lng: number } | null>(null)
  const radiusRef   = useRef(radiusKm)
  const centerRef   = useRef(center)
  const onChangeRef = useRef(onChange)

  // Keep refs in sync with latest values
  useEffect(() => { radiusRef.current   = radiusKm  }, [radiusKm])
  useEffect(() => { centerRef.current   = center    }, [center])
  useEffect(() => { onChangeRef.current = onChange  }, [onChange])

  // Load the Maps JS API
  useEffect(() => {
    if (!mapsKey) {
      setMapError('Chave da API do Google Maps não configurada.')
      return
    }
    if (_mapsLoaded) { setMapReady(true); return }
    if (_mapsLoading) {
      const iv = setInterval(() => {
        if ((window as any).google?.maps) { _mapsLoaded = true; _mapsLoading = false; clearInterval(iv); setMapReady(true) }
      }, 100)
      return () => clearInterval(iv)
    }
    _mapsLoading = true
    const s = document.createElement('script')
    s.src   = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}&language=pt-BR`
    s.async = true
    s.defer = true
    s.onload  = () => { _mapsLoaded = true; _mapsLoading = false; setMapReady(true) }
    s.onerror = () => setMapError('Não foi possível carregar o Google Maps. Verifique se a Maps JavaScript API está ativada no Google Cloud Console.')
    document.head.appendChild(s)
  }, [mapsKey])

  // Initialize map once API is ready
  useEffect(() => {
    if (!mapReady || !mapDivRef.current || instanceRef.current) return
    const g = (window as any).google.maps

    const map = new g.Map(mapDivRef.current, {
      center:              { lat: ORIGEM.lat, lng: ORIGEM.lng },
      zoom:                13,
      mapTypeControl:      false,
      streetViewControl:   false,
      fullscreenControl:   false,
      zoomControlOptions:  { position: g.ControlPosition.RIGHT_BOTTOM },
    })

    const marker = new g.Marker({ map, visible: false, draggable: true, title: 'Centro da busca' })
    const circle = new g.Circle({
      map,
      fillColor:     '#6366f1',
      fillOpacity:   0.15,
      strokeColor:   '#6366f1',
      strokeWeight:  2,
      visible:       false,
    })

    instanceRef.current = { map, marker, circle }

    function applyCenter(lat: number, lng: number) {
      marker.setPosition({ lat, lng })
      marker.setVisible(true)
      circle.setCenter({ lat, lng })
      circle.setRadius(radiusRef.current * 1000)
      circle.setVisible(true)
      map.fitBounds(circle.getBounds())
      setCenter({ lat, lng })
      onChangeRef.current({ lat, lng, radiusKm: radiusRef.current })
    }

    map.addListener('click', (e: any) => applyCenter(e.latLng.lat(), e.latLng.lng()))
    marker.addListener('dragend', (e: any) => applyCenter(e.latLng.lat(), e.latLng.lng()))
  }, [mapReady])

  if (mapError) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg border border-red-500/30 bg-red-500/5 text-sm text-red-400">
        <Map className="h-5 w-5 shrink-0" />
        {mapError}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div ref={mapDivRef} className="w-full h-[340px] rounded-lg border border-border overflow-hidden bg-muted" />
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-muted">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Raio:</span>
        <input
          type="range" min={1} max={20} step={1} value={radiusKm}
          onChange={e => {
            const r = Number(e.target.value)
            setRadiusKm(r)
            if (instanceRef.current?.circle) {
              instanceRef.current.circle.setRadius(r * 1000)
              if (centerRef.current) {
                instanceRef.current.map.fitBounds(instanceRef.current.circle.getBounds())
                onChangeRef.current({ ...centerRef.current, radiusKm: r })
              }
            }
          }}
          className="flex-1 accent-primary cursor-pointer"
        />
        <span className="text-sm font-semibold w-16 text-right">{radiusKm} km</span>
      </div>

      {center ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MapPin className="h-3 w-3 text-primary" />
          Centro definido · Raio: {radiusKm} km · Clique no mapa para mover
        </p>
      ) : (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MapPin className="h-3 w-3" />
          Clique no mapa para definir o centro de busca
        </p>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────

export default function RotasClient({ mapsKey }: { mapsKey: string }) {
  const { toast } = useToast()

  // Configuração
  const [startTime,  setStartTime]  = useState('09:00')
  const [minVenues,  setMinVenues]  = useState(3)
  const [maxVenues,  setMaxVenues]  = useState(10)
  const [mapArea,    setMapArea]    = useState<MapArea | null>(null)
  const [types,      setTypes]      = useState<string[]>(
    SEARCH_TYPES.filter(t => t.defaultChecked).map(t => t.query)
  )
  const [panelOpen,  setPanelOpen]  = useState(true)

  // Progresso
  const [running,   setRunning]   = useState(false)
  const [progress,  setProgress]  = useState({ done: 0, total: 0, current: '', collected: 0 })

  // Resultados
  const [scheduled,    setScheduled]    = useState<RoutePlace[]>([])
  const [manual,       setManual]       = useState<RoutePlace[]>([])
  const [mapsLinks,    setMapsLinks]    = useState<{ janela: string; parte: string; count: number; url: string }[]>([])
  const [allCollected, setAllCollected] = useState<RoutePlace[]>([])

  // Visitas confirmadas
  const [visitedIds,      setVisitedIds]      = useState<Set<string>>(new Set())
  const [confirmingVisit, setConfirmingVisit] = useState<string | null>(null)

  // Seleção manual
  const [selectedManual, setSelectedManual] = useState<Set<string>>(new Set())
  const [forceInclude,   setForceInclude]   = useState<Set<string>>(new Set())
  const [addingToRoute,  setAddingToRoute]  = useState(false)

  const loadVisits = useCallback(async () => {
    try {
      const res  = await fetch('/api/admin/rotas/visits')
      const data = await res.json()
      setVisitedIds(new Set(data.ids ?? []))
    } catch { /* silencioso */ }
  }, [])

  useEffect(() => { loadVisits() }, [loadVisits])

  function toggleType(query: string) {
    setTypes(prev => prev.includes(query) ? prev.filter(t => t !== query) : [...prev, query])
  }

  function toggleManualSelect(placeId: string) {
    setSelectedManual(prev => {
      const next = new Set(prev)
      next.has(placeId) ? next.delete(placeId) : next.add(placeId)
      return next
    })
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  async function confirmVisit(p: RoutePlace) {
    setConfirmingVisit(p.place_id)
    try {
      await fetch('/api/admin/rotas/visits', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ place_id: p.place_id, place_name: p.name, address: p.address, region_key: '' }),
      })
      setVisitedIds(prev => new Set(Array.from(prev).concat(p.place_id)))
      toast({ title: `"${p.name}" marcado como visitado` })
    } catch {
      toast({ title: 'Erro ao confirmar visita', variant: 'destructive' })
    }
    setConfirmingVisit(null)
  }

  async function unvisit(placeId: string) {
    await fetch(`/api/admin/rotas/visits?place_id=${placeId}`, { method: 'DELETE' })
    setVisitedIds(prev => { const n = new Set(prev); n.delete(placeId); return n })
  }

  async function addManualToRoute() {
    if (selectedManual.size === 0) return
    setAddingToRoute(true)

    const newForce = new Set(Array.from(forceInclude).concat(Array.from(selectedManual)))
    setForceInclude(newForce)
    setSelectedManual(new Set())

    try {
      const res  = await fetch('/api/admin/rotas/plan', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          places:       allCollected.filter(p => !visitedIds.has(p.place_id)),
          forceInclude: Array.from(newForce),
          startTime,
          maxVenues,
        }),
      })
      const data = await res.json()
      setScheduled(data.scheduled ?? [])
      setManual(data.manual ?? [])
      setMapsLinks(data.mapsLinks ?? [])
      toast({ title: `${selectedManual.size} lugar(es) adicionado(s) à rota` })
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar rota', description: err.message, variant: 'destructive' })
    }
    setAddingToRoute(false)
  }

  // ── Buscar e planejar ────────────────────────────────────────────────────
  async function startPlanning() {
    if (!mapArea) {
      toast({ title: 'Defina o centro de busca no mapa', variant: 'destructive' })
      return
    }
    if (types.length === 0) {
      toast({ title: 'Selecione pelo menos um tipo', variant: 'destructive' })
      return
    }
    if (minVenues > maxVenues) {
      toast({ title: 'O mínimo não pode ser maior que o máximo', variant: 'destructive' })
      return
    }

    setRunning(true)
    setScheduled([]); setManual([]); setMapsLinks([]); setAllCollected([])
    setSelectedManual(new Set()); setForceInclude(new Set())
    setProgress({ done: 0, total: types.length, current: 'Iniciando…', collected: 0 })

    const allPlaces: RoutePlace[] = []
    const seenIds = new Set<string>()
    const radiusM = Math.round(mapArea.radiusKm * 1000)

    for (let i = 0; i < types.length; i++) {
      const typeQuery = types[i]
      const st        = SEARCH_TYPES.find(t => t.query === typeQuery)!

      setProgress(p => ({ ...p, done: i, current: st.label }))

      try {
        const res  = await fetch('/api/admin/rotas/search', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            query:     typeQuery,
            typeLabel: st.label,
            lat:       mapArea.lat,
            lng:       mapArea.lng,
            radius:    radiusM,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')

        for (const p of (data.places ?? [])) {
          if (seenIds.has(p.place_id)) continue
          // Post-filter por distância real
          if (p.lat != null && p.lng != null) {
            const dlat = (p.lat - mapArea.lat) * Math.PI / 180
            const dlng = (p.lng - mapArea.lng) * Math.PI / 180
            const a = Math.sin(dlat/2)**2 + Math.cos(mapArea.lat*Math.PI/180) * Math.cos(p.lat*Math.PI/180) * Math.sin(dlng/2)**2
            const dist = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
            if (dist > radiusM * 1.15) continue // 15% de tolerância
          }
          seenIds.add(p.place_id)
          allPlaces.push(p)
        }
        setProgress(p => ({ ...p, collected: allPlaces.length }))
      } catch (err: any) {
        toast({ title: `Erro em "${st.label}"`, description: err.message, variant: 'destructive' })
        if (err.message?.includes('inválida')) break
      }
    }

    setProgress(p => ({ ...p, done: types.length, current: 'Montando rota…' }))
    setAllCollected(allPlaces)

    if (allPlaces.length === 0) {
      toast({ title: 'Nenhum estabelecimento encontrado na área selecionada', variant: 'destructive' })
      setRunning(false)
      return
    }

    const unvisited     = allPlaces.filter(p => !visitedIds.has(p.place_id))
    const skippedVisited = allPlaces.length - unvisited.length
    if (skippedVisited > 0) toast({ title: `${skippedVisited} lugar(es) já visitado(s) removido(s)` })

    try {
      const res  = await fetch('/api/admin/rotas/plan', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ places: unvisited, startTime, maxVenues }),
      })
      const data = await res.json()
      setScheduled(data.scheduled ?? [])
      setManual(data.manual ?? [])
      setMapsLinks(data.mapsLinks ?? [])
      setPanelOpen(false)

      const got = data.scheduled?.length ?? 0
      if (got < minVenues) {
        toast({
          title:       `Apenas ${got} visita(s) agendadas`,
          description: `O mínimo definido é ${minVenues}. Tente ampliar o raio ou os tipos de busca.`,
          variant:     'destructive',
        })
      } else {
        toast({ title: `Rota pronta — ${got} visitas agendadas` })
      }
    } catch (err: any) {
      toast({ title: 'Erro ao montar rota', description: err.message, variant: 'destructive' })
    }

    setRunning(false)
  }

  const hasResults = scheduled.length > 0 || manual.length > 0
  const canStart   = !!mapArea && types.length > 0 && !running

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Planejador de Rotas</h1>
          <p className="text-muted-foreground text-sm">
            Partida: <span className="font-medium">{ORIGEM.label}</span>
            {hasResults && ` · ${scheduled.length} agendadas · ${manual.length} manual`}
          </p>
        </div>
        {hasResults && (
          <Button variant="outline" size="sm" onClick={() => exportCSV(scheduled, manual)}>
            <Download className="h-4 w-4 mr-2" />Exportar CSV
          </Button>
        )}
      </div>

      {/* Painel de configuração */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-5 space-y-5">
          <button className="w-full flex items-center justify-between" onClick={() => setPanelOpen(v => !v)}>
            <span className="font-semibold text-sm">Configurar busca</span>
            {panelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {panelOpen && (
            <>
              {/* Horário + Quantidade */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Que horas vai começar?
                  </Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    disabled={running}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Mínimo de locais
                  </Label>
                  <Input
                    type="number"
                    min={1} max={maxVenues}
                    value={minVenues}
                    onChange={e => setMinVenues(Math.max(1, Number(e.target.value)))}
                    disabled={running}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Máximo de locais
                  </Label>
                  <Input
                    type="number"
                    min={minVenues} max={50}
                    value={maxVenues}
                    onChange={e => setMaxVenues(Math.max(minVenues, Number(e.target.value)))}
                    disabled={running}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Mapa */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Área de busca — clique no mapa para definir o centro
                </p>
                <MapPicker mapsKey={mapsKey} onChange={setMapArea} />
              </div>

              {/* Tipos */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipos de estabelecimento</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SEARCH_TYPES.map(t => {
                    const checked = types.includes(t.query)
                    return (
                      <button
                        key={t.query}
                        onClick={() => toggleType(t.query)}
                        disabled={running}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors text-left',
                          checked ? 'bg-primary/10 border-primary/40 text-primary' : 'border-border text-muted-foreground hover:bg-accent'
                        )}
                      >
                        {checked ? <CheckSquare className="h-4 w-4 shrink-0" /> : <Square className="h-4 w-4 shrink-0" />}
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Progresso */}
              {running && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate max-w-[70%]">{progress.current}</span>
                    <span>{progress.done}/{progress.total} · <span className="text-primary font-medium">{progress.collected} encontrados</span></span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={startPlanning} disabled={!canStart}>
                  {running
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Planejando…</>
                    : <><Route className="h-4 w-4 mr-2" />Planejar Rota</>}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Links Maps — somente esses vão para o Google Maps */}
      {mapsLinks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Abrir rota no Google Maps
          </p>
          <div className="flex flex-wrap gap-2">
            {mapsLinks.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm hover:bg-primary/20 transition-colors">
                <Navigation className="h-4 w-4" />
                {link.parte ? `${link.janela} — ${link.parte}` : link.janela}
                <span className="text-xs opacity-70">({link.count} paradas)</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Tabela agendada */}
      {scheduled.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Rota Agendada — {scheduled.length} visitas
          </p>
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {['#','Janela','Chegada','Duração','Nome','Tipo','Contato','Horário',''].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {scheduled.map(p => (
                    <tr key={p.place_id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.ordem}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><JanelaBadge janela={p.janela ?? ''} /></td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-sm">{p.horario_chegada}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{p.duracao_estimada}</td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.neighborhood}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-xs">{p.type_label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {p.phone && (
                            <a href={`tel:${p.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                              <Phone className="h-3 w-3" />{p.phone}
                            </a>
                          )}
                          {p.instagram && (
                            <a href={`https://instagram.com/${p.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-pink-400">
                              <Instagram className="h-3 w-3" />{p.instagram}
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="text-xs text-muted-foreground truncate" title={p.horario_texto}>
                          <Clock className="h-3 w-3 inline mr-1" />{p.horario_texto?.split('|')[0]?.trim()}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {visitedIds.has(p.place_id) ? (
                          <button
                            onClick={() => unvisit(p.place_id)}
                            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-zinc-400 transition-colors"
                            title="Clique para desfazer"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Visitado
                          </button>
                        ) : (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 text-xs gap-1 text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10"
                            onClick={() => confirmVisit(p)}
                            disabled={confirmingVisit === p.place_id}
                          >
                            {confirmingVisit === p.place_id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <CheckCircle2 className="h-3 w-3" />}
                            Confirmar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tabela manual */}
      {manual.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Decisão Manual — {manual.length}
              {selectedManual.size > 0 && (
                <span className="text-primary ml-2">
                  ({selectedManual.size} selecionado{selectedManual.size > 1 ? 's' : ''})
                </span>
              )}
            </p>
            {selectedManual.size > 0 && (
              <Button
                size="sm" variant="outline"
                className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
                onClick={addManualToRoute}
                disabled={addingToRoute}
              >
                {addingToRoute
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <PlusCircle className="h-3 w-3" />}
                Adicionar à Rota ({selectedManual.size})
              </Button>
            )}
          </div>
          <div className="rounded-lg border border-amber-500/20 overflow-hidden bg-amber-500/5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-amber-500/10 border-b border-amber-500/20">
                    {['','Nome','Tipo','Contato','Motivo'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-500/10">
                  {manual.map(p => (
                    <tr
                      key={p.place_id}
                      className={cn('hover:bg-amber-500/10 transition-colors cursor-pointer', selectedManual.has(p.place_id) && 'bg-primary/5')}
                      onClick={() => toggleManualSelect(p.place_id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center">
                          {selectedManual.has(p.place_id)
                            ? <CheckSquare className="h-4 w-4 text-primary" />
                            : <Square      className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.neighborhood}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-xs">{p.type_label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {p.phone && (
                          <a href={`tel:${p.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                            <Phone className="h-3 w-3" />{p.phone}
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-amber-400">{p.motivo_manual}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {!hasResults && !running && (
        <div className="text-center py-20 text-muted-foreground">
          <Route className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="font-medium">Nenhuma rota planejada</p>
          <p className="text-sm mt-1">Defina o horário, o número de locais e clique no mapa para escolher a área de busca.</p>
        </div>
      )}
    </div>
  )
}

function JanelaBadge({ janela }: { janela: string }) {
  const j = janela.toLowerCase()
  const cls =
    j.includes('manhã')   ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' :
    j.includes('tarde')   ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
    j.includes('noturno') ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' :
    'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
  return <Badge variant="outline" className={cn('text-xs whitespace-nowrap', cls)}>{janela}</Badge>
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button }   from '@/components/ui/button'
import { Badge }    from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import {
  Route, Loader2, Download, ExternalLink, MapPin,
  Phone, Instagram, Clock, ChevronDown, ChevronUp,
  CheckSquare, Square, Navigation, Sun, Sunset, Moon,
  CheckCircle2, PlusCircle, XCircle,
} from 'lucide-react'
import { SEARCH_TYPES } from '@/lib/prospect-types'
import { MICRO_REGIONS, MICRO_REGION_GROUPS, ORIGEM } from '@/lib/route-types'
import type { RoutePlace } from '@/lib/route-types'
import { cn } from '@/lib/utils'

// ── CSV Export ────────────────────────────────────────────────────────────

function exportCSV(scheduled: RoutePlace[], manual: RoutePlace[], neighborhood: string) {
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
  a.download = `rota-${neighborhood.replace(/\s+/g,'-')}-${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Janelas disponíveis ───────────────────────────────────────────────────

const WINDOW_OPTIONS = [
  { key: 'manha',   label: 'Manhã (8h-11h)',          Icon: Sun    },
  { key: 'tarde',   label: 'Tarde (14h-17h)',          Icon: Sunset },
  { key: 'noturna', label: 'Noturna (a partir das 20h)', Icon: Moon   },
]

// ── Componente ────────────────────────────────────────────────────────────

export default function RotasPage() {
  const { toast } = useToast()

  // configuração
  const [regionKey, setRegionKey] = useState('')
  const [types, setTypes] = useState<string[]>(
    SEARCH_TYPES.filter(t => t.defaultChecked).map(t => t.query)
  )
  const [selectedWindows, setSelectedWindows] = useState<string[]>(['manha','tarde','noturna'])
  const [panelOpen, setPanelOpen] = useState(true)

  // progresso
  const [running, setRunning]   = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0, current: '', collected: 0 })

  // resultados
  const [scheduled,       setScheduled]       = useState<RoutePlace[]>([])
  const [manual,          setManual]          = useState<RoutePlace[]>([])
  const [mapsLinks,       setMapsLinks]       = useState<{ janela: string; parte: string; count: number; url: string }[]>([])
  const [allCollected,    setAllCollected]    = useState<RoutePlace[]>([])

  // visitas já confirmadas
  const [visitedIds,      setVisitedIds]      = useState<Set<string>>(new Set())
  const [confirmingVisit, setConfirmingVisit] = useState<string | null>(null)

  // seleção para inserção manual
  const [selectedManual,  setSelectedManual]  = useState<Set<string>>(new Set())
  const [forceInclude,    setForceInclude]    = useState<Set<string>>(new Set())
  const [addingToRoute,   setAddingToRoute]   = useState(false)

  // ── Carregar visitas confirmadas ──────────────────────────────────────
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

  function toggleWindow(key: string) {
    setSelectedWindows(prev => prev.includes(key) ? prev.filter(w => w !== key) : [...prev, key])
  }

  function toggleManualSelect(placeId: string) {
    setSelectedManual(prev => {
      const next = new Set(prev)
      next.has(placeId) ? next.delete(placeId) : next.add(placeId)
      return next
    })
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  const selectedRegion = MICRO_REGIONS.find(r => r.key === regionKey)

  // ── Confirmar visita ──────────────────────────────────────────────────
  async function confirmVisit(p: RoutePlace) {
    setConfirmingVisit(p.place_id)
    try {
      await fetch('/api/admin/rotas/visits', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          place_id:   p.place_id,
          place_name: p.name,
          address:    p.address,
          region_key: regionKey,
        }),
      })
      setVisitedIds(prev => new Set(Array.from(prev).concat(p.place_id)))
      toast({ title: `"${p.name}" marcado como visitado` })
    } catch {
      toast({ title: 'Erro ao confirmar visita', variant: 'destructive' })
    }
    setConfirmingVisit(null)
  }

  // ── Desfazer visita ────────────────────────────────────────────────────
  async function unvisit(placeId: string) {
    await fetch(`/api/admin/rotas/visits?place_id=${placeId}`, { method: 'DELETE' })
    setVisitedIds(prev => { const n = new Set(prev); n.delete(placeId); return n })
  }

  // ── Adicionar selecionados do manual à rota ───────────────────────────
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
          places:          allCollected.filter(p => !visitedIds.has(p.place_id)),
          selectedWindows,
          forceInclude:    Array.from(newForce),
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

  // ── Iniciar planejamento ───────────────────────────────────────────────
  async function startPlanning() {
    if (!selectedRegion) {
      toast({ title: 'Selecione a região', variant: 'destructive' })
      return
    }
    if (types.length === 0) {
      toast({ title: 'Selecione pelo menos um tipo', variant: 'destructive' })
      return
    }
    if (selectedWindows.length === 0) {
      toast({ title: 'Selecione pelo menos uma janela de visita', variant: 'destructive' })
      return
    }

    setRunning(true)
    setScheduled([]); setManual([]); setMapsLinks([]); setAllCollected([])
    setSelectedManual(new Set()); setForceInclude(new Set())
    setProgress({ done: 0, total: types.length, current: 'Iniciando…', collected: 0 })

    const allPlaces: RoutePlace[] = []
    const seenIds  = new Set<string>()
    const loc      = { lat: selectedRegion.lat, lng: selectedRegion.lng }
    const locLabel = `${selectedRegion.queryHint}, ${selectedRegion.city}`

    for (let i = 0; i < types.length; i++) {
      const typeQuery = types[i]
      const st        = SEARCH_TYPES.find(t => t.query === typeQuery)!

      setProgress(p => ({ ...p, done: i, current: st.label }))

      try {
        const res  = await fetch('/api/admin/rotas/search', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ query: `${typeQuery} em ${locLabel}`, typeLabel: st.label, ...loc }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')

        for (const p of (data.places ?? [])) {
          if (!seenIds.has(p.place_id)) { seenIds.add(p.place_id); allPlaces.push(p) }
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
      toast({ title: 'Nenhum estabelecimento encontrado com foco em bebidas', variant: 'destructive' })
      setRunning(false)
      return
    }

    // Filtrar lugares já visitados
    const unvisitedPlaces = allPlaces.filter(p => !visitedIds.has(p.place_id))
    const skippedVisited  = allPlaces.length - unvisitedPlaces.length
    if (skippedVisited > 0) {
      toast({ title: `${skippedVisited} lugar(es) já visitado(s) removido(s) da rota` })
    }

    try {
      const res  = await fetch('/api/admin/rotas/plan', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ places: unvisitedPlaces, selectedWindows }),
      })
      const data = await res.json()
      setScheduled(data.scheduled ?? [])
      setManual(data.manual ?? [])
      setMapsLinks(data.mapsLinks ?? [])
      setPanelOpen(false)
      toast({ title: `Rota pronta — ${data.scheduled?.length ?? 0} visitas agendadas` })
    } catch (err: any) {
      toast({ title: 'Erro ao montar rota', description: err.message, variant: 'destructive' })
    }

    setRunning(false)
  }

  const hasResults = scheduled.length > 0 || manual.length > 0

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Planejador de Rotas</h1>
          <p className="text-muted-foreground text-sm">
            Partida: <span className="font-medium">{ORIGEM.label}</span>
            {selectedRegion && <> · <span className="font-medium">{selectedRegion.label} — {selectedRegion.sublabel}</span></>}
            {hasResults && ` · ${scheduled.length} agendadas · ${manual.length} manual`}
          </p>
        </div>
        {hasResults && (
          <Button variant="outline" size="sm" onClick={() => exportCSV(scheduled, manual, selectedRegion?.label ?? 'rota')}>
            <Download className="h-4 w-4 mr-2" />Exportar CSV
          </Button>
        )}
      </div>

      {/* Painel */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-5 space-y-5">
          <button className="w-full flex items-center justify-between" onClick={() => setPanelOpen(v => !v)}>
            <span className="font-semibold text-sm">Configurar busca</span>
            {panelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {panelOpen && (
            <>
              {/* Bairro */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bairro ou região</p>
                <Select value={regionKey} onValueChange={setRegionKey} disabled={running}>
                  <SelectTrigger>
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Selecione a microrregião…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {MICRO_REGION_GROUPS.map(group => (
                      <SelectGroup key={group}>
                        <SelectLabel className="text-xs font-bold text-muted-foreground px-2 py-1.5">{group}</SelectLabel>
                        {MICRO_REGIONS.filter(r => r.region === group).map(r => (
                          <SelectItem key={r.key} value={r.key}>
                            <span className="font-medium">{r.label}</span>
                            <span className="text-muted-foreground ml-2 text-xs">{r.sublabel}</span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Janelas */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Janelas de visita</p>
                <div className="flex flex-wrap gap-2">
                  {WINDOW_OPTIONS.map(({ key, label, Icon }) => {
                    const active = selectedWindows.includes(key)
                    return (
                      <button
                        key={key}
                        onClick={() => toggleWindow(key)}
                        disabled={running}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors',
                          active ? 'bg-primary/10 border-primary/40 text-primary' : 'border-border text-muted-foreground hover:bg-accent'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {label}
                      </button>
                    )
                  })}
                </div>
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
                <Button onClick={startPlanning} disabled={running || !regionKey || types.length === 0 || selectedWindows.length === 0}>
                  {running
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Planejando…</>
                    : <><Route className="h-4 w-4 mr-2" />Planejar Rota</>}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Links Maps */}
      {mapsLinks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Abrir no Google Maps</p>
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
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rota Agendada — {scheduled.length} visitas</p>
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
                      {/* Ação: confirmar visita */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {visitedIds.has(p.place_id) ? (
                          <button
                            onClick={() => unvisit(p.place_id)}
                            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-zinc-400 transition-colors"
                            title="Clique para desfazer"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Visitado
                          </button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
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
              {selectedManual.size > 0 && <span className="text-primary ml-2">({selectedManual.size} selecionado{selectedManual.size > 1 ? 's' : ''})</span>}
            </p>
            {selectedManual.size > 0 && (
              <Button
                size="sm"
                variant="outline"
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
                    <tr key={p.place_id} className={cn('hover:bg-amber-500/10 transition-colors cursor-pointer', selectedManual.has(p.place_id) && 'bg-primary/5')} onClick={() => toggleManualSelect(p.place_id)}>
                      {/* Checkbox */}
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

      {/* Vazio */}
      {!hasResults && !running && (
        <div className="text-center py-20 text-muted-foreground">
          <Route className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="font-medium">Nenhuma rota planejada</p>
          <p className="text-sm mt-1">Selecione o bairro, as janelas e os tipos, depois clique em Planejar Rota.</p>
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
    j.includes('noturna') ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' :
    'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
  return <Badge variant="outline" className={cn('text-xs whitespace-nowrap', cls)}>{janela}</Badge>
}

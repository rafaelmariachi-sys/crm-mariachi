'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { MapPin, Package, Search, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, ChevronsDownUp, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_PRIORITY: Record<string, number> = {
  positivado: 4, em_negociacao: 3, retorno_pendente: 2,
  recusado: 1, perdido: 1, inativo: 1,
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  positivado:       { label: 'Positivado',       cls: 'bg-emerald-500/15 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-500/30' },
  em_negociacao:    { label: 'Em negociação',    cls: 'bg-amber-500/15 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-500/30' },
  retorno_pendente: { label: 'Retorno pendente', cls: 'bg-blue-500/15 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-500/30' },
  recusado:         { label: 'Recusado',          cls: 'bg-red-500/15 text-red-600 border-red-200 dark:text-red-400 dark:border-red-500/30' },
  perdido:          { label: 'Perdido',           cls: 'bg-red-500/15 text-red-600 border-red-200 dark:text-red-400 dark:border-red-500/30' },
  inativo:          { label: 'Inativo',           cls: 'bg-zinc-500/15 text-zinc-600 border-zinc-200 dark:text-zinc-400 dark:border-zinc-500/30' },
}

function StatusChip({ status }: { status: string | null }) {
  if (!status)
    return <span className="text-xs px-2 py-0.5 rounded-full border bg-zinc-500/10 text-zinc-500 border-zinc-200 dark:border-zinc-700 whitespace-nowrap">Não apresentado</span>
  const c = STATUS_CONFIG[status] || { label: status, cls: '' }
  return <span className={cn('text-xs px-2 py-0.5 rounded-full border whitespace-nowrap', c.cls)}>{c.label}</span>
}

// ── Multi-select de marcas (máx 3) ──────────────────────────────────────────
const BRAND_COLORS = [
  'bg-violet-500/15 text-violet-700 border-violet-300 dark:text-violet-300 dark:border-violet-500/40',
  'bg-sky-500/15 text-sky-700 border-sky-300 dark:text-sky-300 dark:border-sky-500/40',
  'bg-rose-500/15 text-rose-700 border-rose-300 dark:text-rose-300 dark:border-rose-500/40',
]

function BrandMultiSelect({
  brands, selected, onChange,
}: {
  brands: any[]; selected: string[]; onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  function toggle(id: string) {
    if (selected.includes(id)) onChange(selected.filter((s) => s !== id))
    else if (selected.length < 3) onChange([...selected, id])
  }

  const label =
    selected.length === 0
      ? 'Todas as marcas'
      : selected.length === 1
      ? brands.find((b) => b.id === selected[0])?.name || '1 marca'
      : `${selected.length} marcas`

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 h-10 px-3 rounded-md border bg-card text-sm hover:bg-muted transition-colors min-w-[160px]"
      >
        <span className="flex-1 text-left truncate">{label}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-56 border rounded-lg bg-card shadow-lg py-1 max-h-72 overflow-y-auto">
          <p className="px-3 py-1.5 text-xs text-muted-foreground border-b mb-1">
            Selecione até 3 marcas
          </p>
          {brands.map((b, idx) => {
            const isSelected = selected.includes(b.id)
            const selIdx = selected.indexOf(b.id)
            const disabled = !isSelected && selected.length >= 3
            return (
              <button
                key={b.id}
                onClick={() => !disabled && toggle(b.id)}
                disabled={disabled}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
                  disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted',
                  isSelected && 'bg-muted/50'
                )}
              >
                <span
                  className={cn(
                    'h-4 w-4 rounded border shrink-0 flex items-center justify-center text-[10px] font-bold',
                    isSelected ? BRAND_COLORS[selIdx] : 'border-border'
                  )}
                >
                  {isSelected ? selIdx + 1 : ''}
                </span>
                {b.name}
              </button>
            )
          })}
          {selected.length > 0 && (
            <div className="border-t mt-1 pt-1">
              <button
                onClick={() => onChange([])}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-3 w-3" /> Limpar seleção
              </button>
            </div>
          )}
        </div>
      )}

      {/* Chips das marcas selecionadas */}
      {selected.length > 0 && (
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {selected.map((id, idx) => {
            const b = brands.find((b) => b.id === id)
            if (!b) return null
            return (
              <span
                key={id}
                className={cn('text-xs px-2 py-0.5 rounded-full border flex items-center gap-1', BRAND_COLORS[idx])}
              >
                <span className="font-bold">{idx + 1}</span> {b.name}
                <button onClick={() => toggle(id)} className="hover:opacity-70 ml-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Página principal ────────────────────────────────────────────────────────
export default function MapeamentoPage() {
  const [brands, setBrands] = useState<any[]>([])
  const [venues, setVenues] = useState<any[]>([])
  const [coverage, setCoverage] = useState<Map<string, Map<string, string>>>(new Map())
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'marca' | 'venue'>('marca')
  const [filterBrands, setFilterBrands] = useState<string[]>([])
  const [searchVenue, setSearchVenue] = useState('')
  const [onlyGaps, setOnlyGaps] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: brandsData }, { data: visitsData }, { data: posData }, { data: venuesData }] =
        await Promise.all([
          supabase.from('brands').select('id, name').order('name'),
          supabase.from('visits').select('venue_id'),
          supabase.from('positivations').select('brand_id, status, venue_id, visit_id, visits(venue_id)'),
          supabase.from('venues').select('id, name, neighborhood, city').order('name'),
        ])

      const visitedIds = new Set((visitsData || []).map((v: any) => v.venue_id))
      const visitedVenues = (venuesData || []).filter((v: any) => visitedIds.has(v.id))

      const cov = new Map<string, Map<string, string>>()
      ;(posData || []).forEach((p: any) => {
        const venueId = p.venue_id || p.visits?.venue_id
        if (!venueId) return
        if (!cov.has(venueId)) cov.set(venueId, new Map())
        const brandMap = cov.get(venueId)!
        const current = brandMap.get(p.brand_id)
        if (!current || (STATUS_PRIORITY[p.status] || 0) > (STATUS_PRIORITY[current] || 0)) {
          brandMap.set(p.brand_id, p.status)
        }
      })

      setBrands(brandsData || [])
      setVenues(visitedVenues)
      setCoverage(cov)
      setLoading(false)
    }
    load()
  }, [])

  // Marcas a considerar: selecionadas ou todas
  const activeBrands = filterBrands.length > 0 ? brands.filter((b) => filterBrands.includes(b.id)) : brands

  const stats = useMemo(() => {
    let gaps = 0, negociacao = 0, positivados = 0, outros = 0
    activeBrands.forEach((brand) => {
      venues.forEach((venue) => {
        const s = coverage.get(venue.id)?.get(brand.id) || null
        if (!s) gaps++
        else if (s === 'positivado') positivados++
        else if (s === 'em_negociacao' || s === 'retorno_pendente') negociacao++
        else outros++
      })
    })
    return { gaps, negociacao, positivados, outros }
  }, [activeBrands, venues, coverage])

  const filteredVenues = useMemo(() => {
    const q = searchVenue.toLowerCase()
    if (!q) return venues
    return venues.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.city || '').toLowerCase().includes(q) ||
        (v.neighborhood || '').toLowerCase().includes(q)
    )
  }, [venues, searchVenue])

  const sectionIds = view === 'marca'
    ? activeBrands.map((b) => b.id)
    : filteredVenues.map((v) => v.id)

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const allExpanded = sectionIds.length > 0 && sectionIds.every((id) => expanded.has(id))
  function expandAll() { setExpanded(new Set(sectionIds)) }
  function collapseAll() { setExpanded(new Set()) }

  if (loading)
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}
      </div>
    )

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Mapeamento de Cobertura</h1>
        <p className="text-muted-foreground text-sm">
          {venues.length} estabelecimentos visitados × {brands.length} marcas
          {filterBrands.length > 0 && ` (filtrando ${activeBrands.length} marca${activeBrands.length > 1 ? 's' : ''})`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Não apresentado', value: stats.gaps,        cls: 'text-zinc-500' },
          { label: 'Em negociação',   value: stats.negociacao,  cls: 'text-amber-600 dark:text-amber-400' },
          { label: 'Positivado',      value: stats.positivados, cls: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Recusado/perdido',value: stats.outros,      cls: 'text-red-500' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className={cn('text-2xl font-bold', s.cls)}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-start">
        {/* View toggle */}
        <div className="flex rounded-lg border overflow-hidden shrink-0 self-start">
          <button
            onClick={() => { setView('marca'); setExpanded(new Set()) }}
            className={cn('px-4 py-2 text-sm font-medium transition-colors', view === 'marca' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}
          >
            Por marca
          </button>
          <button
            onClick={() => { setView('venue'); setExpanded(new Set()) }}
            className={cn('px-4 py-2 text-sm font-medium transition-colors', view === 'venue' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}
          >
            Por venue
          </button>
        </div>

        {/* Multi-select de marcas */}
        <BrandMultiSelect brands={brands} selected={filterBrands} onChange={(v) => { setFilterBrands(v); setExpanded(new Set()) }} />

        {/* Venue search */}
        <div className="relative flex-1 min-w-[160px] self-start">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Buscar estabelecimento..." value={searchVenue} onChange={(e) => setSearchVenue(e.target.value)} className="pl-9 h-10" />
        </div>

        {/* Only gaps */}
        <Button variant={onlyGaps ? 'default' : 'outline'} size="sm" onClick={() => setOnlyGaps((g) => !g)} className="shrink-0 self-start">
          <AlertCircle className="h-4 w-4 mr-1.5" />
          Só gaps
        </Button>

        {/* Expand/collapse all */}
        <Button variant="ghost" size="sm" onClick={allExpanded ? collapseAll : expandAll} className="shrink-0 text-muted-foreground self-start">
          {allExpanded
            ? <><ChevronsDownUp className="h-4 w-4 mr-1.5" />Fechar tudo</>
            : <><ChevronsUpDown className="h-4 w-4 mr-1.5" />Expandir tudo</>}
        </Button>
      </div>

      {/* ── VIEW: POR MARCA ── */}
      {view === 'marca' && (
        <div className="space-y-3">
          {activeBrands.map((brand, brandIdx) => {
            const colorIdx = filterBrands.length > 0 ? filterBrands.indexOf(brand.id) : -1
            const rows = filteredVenues.map((venue) => ({
              venue,
              status: coverage.get(venue.id)?.get(brand.id) || null,
            }))
            const gapCount = rows.filter((r) => !r.status).length
            const posCount = rows.filter((r) => r.status === 'positivado').length
            const negCount = rows.filter((r) => r.status === 'em_negociacao' || r.status === 'retorno_pendente').length
            const displayRows = onlyGaps ? rows.filter((r) => !r.status) : rows

            if (onlyGaps && gapCount === 0) return null

            const isOpen = expanded.has(brand.id)

            return (
              <Card key={brand.id}>
                <CardContent className="p-0">
                  <button
                    onClick={() => toggleExpand(brand.id)}
                    className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors rounded-xl"
                  >
                    {colorIdx >= 0 && (
                      <span className={cn('h-5 w-5 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0', BRAND_COLORS[colorIdx])}>
                        {colorIdx + 1}
                      </span>
                    )}
                    <Package className={cn('h-4 w-4 text-muted-foreground shrink-0', colorIdx >= 0 && 'hidden')} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{brand.name}</p>
                      <div className="flex gap-3 mt-0.5 text-xs flex-wrap">
                        {gapCount > 0 && <span className="text-zinc-500">{gapCount} sem cobertura</span>}
                        {negCount > 0  && <span className="text-amber-600 dark:text-amber-400">{negCount} em negociação</span>}
                        {posCount > 0  && <span className="text-emerald-600 dark:text-emerald-400">{posCount} positivado</span>}
                        {gapCount === 0 && rows.length > 0 && <span className="text-emerald-600 dark:text-emerald-400">Cobertura total!</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {gapCount > 0
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 border border-zinc-200 dark:border-zinc-700">{gapCount} gap{gapCount !== 1 ? 's' : ''}</span>
                        : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t px-4 pb-4 pt-3 space-y-1">
                      {displayRows.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">Todos os estabelecimentos já cobertos!</p>
                      ) : (
                        displayRows.map(({ venue, status }) => (
                          <div key={venue.id} className="flex items-center gap-3 py-1 px-2 rounded-md hover:bg-muted/30">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm">{venue.name}</span>
                              {(venue.neighborhood || venue.city) && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  {[venue.neighborhood, venue.city].filter(Boolean).join(' · ')}
                                </span>
                              )}
                            </div>
                            <StatusChip status={status} />
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── VIEW: POR VENUE ── */}
      {view === 'venue' && (
        <div className="space-y-3">
          {filteredVenues.map((venue) => {
            const rows = activeBrands.map((brand, idx) => ({
              brand,
              colorIdx: filterBrands.length > 0 ? filterBrands.indexOf(brand.id) : -1,
              status: coverage.get(venue.id)?.get(brand.id) || null,
            }))
            const gapCount = rows.filter((r) => !r.status).length
            const posCount = rows.filter((r) => r.status === 'positivado').length
            const negCount = rows.filter((r) => r.status === 'em_negociacao' || r.status === 'retorno_pendente').length
            const displayRows = onlyGaps ? rows.filter((r) => !r.status) : rows

            if (onlyGaps && gapCount === 0) return null

            const isOpen = expanded.has(venue.id)

            return (
              <Card key={venue.id}>
                <CardContent className="p-0">
                  <button
                    onClick={() => toggleExpand(venue.id)}
                    className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors rounded-xl"
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{venue.name}</p>
                      {(venue.neighborhood || venue.city) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[venue.neighborhood, venue.city].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <div className="flex gap-3 mt-0.5 text-xs flex-wrap">
                        {gapCount > 0 && <span className="text-zinc-500">{gapCount} marca{gapCount !== 1 ? 's' : ''} sem cobertura</span>}
                        {negCount > 0  && <span className="text-amber-600 dark:text-amber-400">{negCount} em negociação</span>}
                        {posCount > 0  && <span className="text-emerald-600 dark:text-emerald-400">{posCount} positivado</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {gapCount > 0
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 border border-zinc-200 dark:border-zinc-700">{gapCount} gap{gapCount !== 1 ? 's' : ''}</span>
                        : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t px-4 pb-4 pt-3 space-y-1">
                      {displayRows.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">Todas as marcas cobertas!</p>
                      ) : (
                        displayRows.map(({ brand, colorIdx, status }) => (
                          <div key={brand.id} className="flex items-center gap-3 py-1 px-2 rounded-md hover:bg-muted/30">
                            {colorIdx >= 0 ? (
                              <span className={cn('h-4 w-4 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0', BRAND_COLORS[colorIdx])}>
                                {colorIdx + 1}
                              </span>
                            ) : (
                              <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                            <span className="flex-1 text-sm">{brand.name}</span>
                            <StatusChip status={status} />
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {filteredVenues.length === 0 && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum estabelecimento visitado encontrado</p>
          <p className="text-sm mt-1">Registre visitas para aparecerem aqui</p>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search, Download, Target, RefreshCw, Loader2, ExternalLink,
  Instagram, Phone, Globe, Star, ChevronDown, ChevronUp,
  ArrowRightLeft, Trash2, CheckSquare, Square,
} from 'lucide-react'
import {
  Prospect, ProspectStatus,
  PROSPECT_STATUS_LABELS, PROSPECT_STATUS_COLORS,
  TERRITORIES, SEARCH_TYPES,
  CUISINE_MAP,
} from '@/lib/prospect-types'
import { cn } from '@/lib/utils'

// ── Helpers ──────────────────────────────────────────────────────────────────

function exportCSV(data: Prospect[]) {
  const headers = [
    'Nome','Tipo','Endereço','Bairro','Cidade','Telefone','Site',
    'Instagram (Google)','Nota','Avaliações','Status','Território','Data Extração',
  ]
  const rows = data.map(p => [
    p.name, p.type, p.address, p.neighborhood, p.city,
    p.phone, p.website, p.instagram_google,
    p.rating, p.review_count, PROSPECT_STATUS_LABELS[p.status],
    p.territory,
    new Date(p.extracted_at).toLocaleDateString('pt-BR'),
  ])
  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `prospeccao-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ProspeccaoPage() {
  const supabase       = createClient()
  const { toast }      = useToast()

  // dados
  const [prospects, setProspects]   = useState<Prospect[]>([])
  const [loading, setLoading]       = useState(true)

  // filtros
  const [search, setSearch]         = useState('')
  const [filterType, setFilterType]       = useState('all')
  const [filterStatus, setFilterStatus]   = useState('all')
  const [filterCity, setFilterCity]       = useState('all')
  const [filterCuisine, setFilterCuisine] = useState('all')

  // painel de extração
  const [panelOpen, setPanelOpen]   = useState(false)
  const [territory, setTerritory]   = useState('')
  const [types, setTypes]           = useState<string[]>(
    SEARCH_TYPES.filter(t => t.defaultChecked).map(t => t.query)
  )
  const [replaceMode, setReplaceMode] = useState(false)

  // progresso de extração
  const [extracting, setExtracting] = useState(false)
  const [progress, setProgress]     = useState({ done: 0, total: 0, current: '', added: 0 })

  // ações por linha
  const [converting, setConverting] = useState<string | null>(null)
  const [deleting, setDeleting]     = useState<string | null>(null)

  // ── Carregar prospects ──────────────────────────────────────────────────
  const loadProspects = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('prospects')
      .select('*')
      .order('extracted_at', { ascending: false })
    if (error) toast({ title: 'Erro ao carregar prospecção', variant: 'destructive' })
    else setProspects(data as Prospect[] ?? [])
    setLoading(false)
  }, []) // eslint-disable-line

  useEffect(() => { loadProspects() }, [loadProspects])

  // ── Filtros derivados ───────────────────────────────────────────────────
  const allTypes  = Array.from(new Set(prospects.map(p => p.type).filter(Boolean))) as string[]
  const allCities = Array.from(new Set(prospects.map(p => p.city).filter(Boolean))) as string[]

  const filtered = prospects.filter(p => {
    const q = search.toLowerCase()
    const matchSearch =
      (p.name ?? '').toLowerCase().includes(q) ||
      (p.neighborhood ?? '').toLowerCase().includes(q) ||
      (p.city ?? '').toLowerCase().includes(q) ||
      (p.phone ?? '').includes(q) ||
      (p.website ?? '').toLowerCase().includes(q)
    const matchType    = filterType    === 'all' || p.type    === filterType
    const matchStatus  = filterStatus  === 'all' || p.status  === filterStatus
    const matchCity    = filterCity    === 'all' || p.city    === filterCity
    const matchCuisine = filterCuisine === 'all'
      || (filterCuisine === '__none__' ? !p.cuisine : p.cuisine === filterCuisine)
    return matchSearch && matchType && matchStatus && matchCity && matchCuisine
  })

  // ── Extração ────────────────────────────────────────────────────────────
  function buildQueries(): { query: string; territory: string; typeLabel: string; neighborhood: string; city: string; lat: number; lng: number }[] {
    const t = TERRITORIES.find(t => t.label === territory)
    if (!t) return []
    const out: { query: string; territory: string; typeLabel: string; neighborhood: string; city: string; lat: number; lng: number }[] = []
    for (const { neighborhood, city, lat, lng } of t.searches) {
      for (const typeQuery of types) {
        const loc   = neighborhood ? `${neighborhood}, ${city}` : city
        const label = SEARCH_TYPES.find(s => s.query === typeQuery)?.label ?? typeQuery
        out.push({ query: `${typeQuery} em ${loc}`, territory: loc, typeLabel: label, neighborhood, city, lat, lng })
      }
    }
    return out
  }

  async function startExtraction() {
    const queries = buildQueries()
    if (queries.length === 0) {
      toast({ title: 'Selecione território e pelo menos um tipo', variant: 'destructive' })
      return
    }

    setExtracting(true)
    setProgress({ done: 0, total: queries.length, current: 'Preparando…', added: 0 })
    let totalAdded = 0

    // Se modo "Atualizar", apaga os registros anteriores do território selecionado
    if (replaceMode) {
      const territories = Array.from(new Set(queries.map(q => q.territory)))
      await supabase.from('prospects').delete().in('territory', territories)
    }

    for (let i = 0; i < queries.length; i++) {
      const q = queries[i]
      setProgress(p => ({ ...p, done: i, current: q.territory }))

      try {
        const res  = await fetch('/api/admin/prospeccao/search', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(q),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
        totalAdded += data.added ?? 0
        setProgress(p => ({ ...p, added: totalAdded }))
      } catch (err: any) {
        toast({ title: `Erro em "${q.territory}"`, description: err.message, variant: 'destructive' })
        if (err.message?.includes('API Key')) break // chave inválida — parar tudo
      }
    }

    setProgress(p => ({ ...p, done: queries.length }))
    setExtracting(false)
    toast({ title: `Extração concluída — ${totalAdded} novos estabelecimentos` })
    await loadProspects()
  }

  // ── Converter para Casa ─────────────────────────────────────────────────
  async function convertToVenue(p: Prospect) {
    setConverting(p.id)
    const { error } = await supabase.from('venues').insert({
      name:         p.name,
      address:      p.address   ?? p.neighborhood ?? '',
      neighborhood: p.neighborhood ?? '',
      city:         p.city       ?? '',
      type:         mapVenueType(p.type),
      contact_name: p.names_identified ?? null,
      phone:        p.phone     ?? null,
    })
    if (error) {
      toast({ title: 'Erro ao converter', description: error.message, variant: 'destructive' })
    } else {
      await supabase.from('prospects').update({ status: 'convertido' }).eq('id', p.id)
      toast({ title: `"${p.name}" adicionado às Casas!` })
      await loadProspects()
    }
    setConverting(null)
  }

  function mapVenueType(type: string | null): string {
    if (!type) return 'Bar'
    const t = type.toLowerCase()
    if (t.includes('restaurante'))        return 'Restaurante'
    if (t.includes('hotel'))              return 'Hotel'
    if (t.includes('balada') || t.includes('noturna')) return 'Balada'
    if (t.includes('empório') || t.includes('adega') || t.includes('loja')) return 'Empório'
    return 'Bar'
  }

  // ── Atualizar status ────────────────────────────────────────────────────
  async function updateStatus(id: string, status: ProspectStatus) {
    const { error } = await supabase.from('prospects').update({ status }).eq('id', id)
    if (error) toast({ title: 'Erro ao atualizar status', variant: 'destructive' })
    else setProspects(prev => prev.map(p => p.id === id ? { ...p, status } : p))
  }

  // ── Atualizar culinária ─────────────────────────────────────────────────
  async function updateCuisine(id: string, cuisine: string | null) {
    const { error } = await supabase.from('prospects').update({ cuisine }).eq('id', id)
    if (error) toast({ title: 'Erro ao atualizar culinária', variant: 'destructive' })
    else setProspects(prev => prev.map(p => p.id === id ? { ...p, cuisine } : p))
  }

  // ── Deletar ─────────────────────────────────────────────────────────────
  async function deleteProspect(p: Prospect) {
    if (!confirm(`Excluir "${p.name}"?`)) return
    setDeleting(p.id)
    const { error } = await supabase.from('prospects').delete().eq('id', p.id)
    if (error) toast({ title: 'Erro ao excluir', variant: 'destructive' })
    else {
      toast({ title: 'Excluído' })
      setProspects(prev => prev.filter(x => x.id !== p.id))
    }
    setDeleting(null)
  }

  // ── Toggle tipo na seleção ──────────────────────────────────────────────
  function toggleType(query: string) {
    setTypes(prev =>
      prev.includes(query) ? prev.filter(t => t !== query) : [...prev, query]
    )
  }

  // ── Progresso % ─────────────────────────────────────────────────────────
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* ── Cabeçalho ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Prospecção</h1>
          <p className="text-muted-foreground text-sm">
            {prospects.length} estabelecimentos extraídos
            {filtered.length !== prospects.length && ` · ${filtered.length} filtrados`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button size="sm" onClick={() => setPanelOpen(v => !v)}>
            <Target className="h-4 w-4 mr-2" />
            Nova Extração
            {panelOpen ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>

      {/* ── Painel de extração ── */}
      {panelOpen && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5 space-y-5">

            {/* Território */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Território</p>
              <Select value={territory} onValueChange={setTerritory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a região a prospectar…" />
                </SelectTrigger>
                <SelectContent>
                  {TERRITORIES.map(t => (
                    <SelectItem key={t.label} value={t.label}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {territory && (
                <p className="text-xs text-muted-foreground">
                  {TERRITORIES.find(t => t.label === territory)?.searches.length} localidades ×{' '}
                  {types.length} tipos = até{' '}
                  <span className="font-semibold">
                    {((TERRITORIES.find(t => t.label === territory)?.searches.length ?? 0) * types.length * 60).toLocaleString('pt-BR')}
                  </span>{' '}
                  resultados potenciais
                </p>
              )}
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
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors text-left',
                        checked
                          ? 'bg-primary/10 border-primary/40 text-primary'
                          : 'border-border text-muted-foreground hover:bg-accent'
                      )}
                    >
                      {checked
                        ? <CheckSquare className="h-4 w-4 shrink-0" />
                        : <Square className="h-4 w-4 shrink-0" />}
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Progresso */}
            {extracting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate max-w-[70%]">{progress.current || 'Iniciando…'}</span>
                  <span>{progress.done}/{progress.total} buscas · <span className="text-primary font-medium">{progress.added} novos</span></span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Modo de re-extração */}
            <div
              onClick={() => !extracting && setReplaceMode(v => !v)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors',
                replaceMode
                  ? 'border-amber-500/40 bg-amber-500/10'
                  : 'border-border hover:bg-accent'
              )}
            >
              {replaceMode
                ? <CheckSquare className="h-4 w-4 text-amber-400 shrink-0" />
                : <Square className="h-4 w-4 text-muted-foreground shrink-0" />}
              <div>
                <p className={cn('text-sm font-medium', replaceMode ? 'text-amber-400' : '')}>
                  Atualizar resultados existentes
                </p>
                <p className="text-xs text-muted-foreground">
                  Apaga os dados anteriores deste território e refaz a busca do zero
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPanelOpen(false)} disabled={extracting}>
                Fechar
              </Button>
              <Button onClick={startExtraction} disabled={extracting || !territory || types.length === 0}>
                {extracting
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Extraindo…</>
                  : <><Target className="h-4 w-4 mr-2" />Iniciar Extração</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Filtros ── */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, bairro, cidade, site…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={v => { setFilterType(v); if (v !== 'all' && v !== 'Restaurantes') setFilterCuisine('all') }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {allTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCity} onValueChange={setFilterCity}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Cidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as cidades</SelectItem>
            {allCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {(filterType === 'all' || filterType === 'Restaurantes') && (
          <Select value={filterCuisine} onValueChange={setFilterCuisine}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Culinária" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as culinárias</SelectItem>
              <SelectItem value="__none__">Não identificada</SelectItem>
              {CUISINE_MAP.map(c => (
                <SelectItem key={c.label} value={c.label}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {(Object.entries(PROSPECT_STATUS_LABELS) as [ProspectStatus, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={loadProspects} title="Atualizar">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Conteúdo ── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="font-medium">Nenhum prospecto encontrado</p>
          <p className="text-sm mt-1">
            {prospects.length === 0
              ? 'Clique em "Nova Extração" para começar a prospectar.'
              : 'Tente ajustar os filtros.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Culinária</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Bairro · Cidade</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Contato</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Nota</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors group">

                    {/* Nome */}
                    <td className="px-4 py-3 max-w-[220px]">
                      <p className="font-medium truncate">{p.name}</p>
                      {p.address && (
                        <p className="text-xs text-muted-foreground truncate">{p.address}</p>
                      )}
                    </td>

                    {/* Tipo */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="outline" className="text-xs">{p.type ?? '—'}</Badge>
                    </td>

                    {/* Culinária — só para Restaurantes */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.type === 'Restaurantes' ? (
                        <Select
                          value={p.cuisine ?? '__none__'}
                          onValueChange={v => updateCuisine(p.id, v === '__none__' ? null : v)}
                        >
                          <SelectTrigger className="h-7 w-36 text-xs border-0 p-0 shadow-none focus:ring-0">
                            <SelectValue>
                              {p.cuisine
                                ? <Badge variant="secondary" className="text-xs font-normal">{p.cuisine}</Badge>
                                : <span className="text-muted-foreground text-xs">—</span>}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">
                              <span className="text-muted-foreground">— Nenhuma —</span>
                            </SelectItem>
                            {CUISINE_MAP.map(c => (
                              <SelectItem key={c.label} value={c.label}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    {/* Bairro · Cidade */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm">{p.neighborhood ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{p.city ?? ''}</p>
                    </td>

                    {/* Contato */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {p.phone && (
                          <a href={`tel:${p.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                            <Phone className="h-3 w-3" />{p.phone}
                          </a>
                        )}
                        {p.website && (
                          <a href={p.website} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                            <Globe className="h-3 w-3" />
                            <span className="truncate max-w-[140px]">{p.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          </a>
                        )}
                        {p.instagram_google && (
                          <a href={`https://instagram.com/${p.instagram_google.replace('@','')}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-pink-400">
                            <Instagram className="h-3 w-3" />{p.instagram_google}
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Nota */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-sm font-medium">{p.rating}</span>
                          {p.review_count && (
                            <span className="text-xs text-muted-foreground">({p.review_count.toLocaleString('pt-BR')})</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Select
                        value={p.status}
                        onValueChange={v => updateStatus(p.id, v as ProspectStatus)}
                      >
                        <SelectTrigger className="h-7 w-36 text-xs border-0 p-0 shadow-none focus:ring-0">
                          <Badge variant="outline" className={cn('text-xs cursor-pointer', PROSPECT_STATUS_COLORS[p.status])}>
                            {PROSPECT_STATUS_LABELS[p.status]}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.entries(PROSPECT_STATUS_LABELS) as [ProspectStatus, string][]).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              <Badge variant="outline" className={cn('text-xs', PROSPECT_STATUS_COLORS[k])}>
                                {v}
                              </Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 justify-end opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        {p.status !== 'convertido' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                            onClick={() => convertToVenue(p)}
                            disabled={converting === p.id}
                            title="Converter para Casa no CRM"
                          >
                            {converting === p.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <ArrowRightLeft className="h-3 w-3" />}
                            Casa
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteProspect(p)}
                          disabled={deleting === p.id}
                        >
                          {deleting === p.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Trash2 className="h-3 w-3" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

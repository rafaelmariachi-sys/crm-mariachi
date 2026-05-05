import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { POSITIVATION_STATUS_LABELS, POSITIVATION_STATUS_COLORS, PositivationStatus } from '@/lib/types'
import { MapPin, Plus, Package } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { StatusTabs } from '@/components/brand/status-tabs'
import { ViewTabs } from '@/components/brand/view-tabs'
import { cn } from '@/lib/utils'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

const STATUS_COLORS: Record<string, string> = {
  positivado: 'bg-emerald-500/15 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-500/30',
  em_negociacao: 'bg-amber-500/15 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-500/30',
  perdido: 'bg-red-500/15 text-red-700 border-red-200 dark:text-red-400 dark:border-red-500/30',
  inativo: 'bg-zinc-500/15 text-zinc-600 border-zinc-200 dark:text-zinc-400 dark:border-zinc-500/30',
}

export default async function PositivationsPage({
  searchParams,
}: {
  searchParams: { status?: string; view?: string }
}) {
  const supabase = createClient()

  const selectedStatus = searchParams.status || 'all'
  const selectedView = searchParams.view || 'casa'

  let query = supabase
    .from('positivations')
    .select('id, status, product_name, notes, positivated_at, created_at, brand_id, brands(name), venue_id, venues(id, name, neighborhood, city), visit_id, visits(venue_id, venues(id, name, neighborhood, city))')
    .order('positivated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (selectedStatus === 'perdido') {
    query = query.in('status', ['perdido', 'inativo'])
  } else if (selectedStatus !== 'all') {
    query = query.eq('status', selectedStatus as PositivationStatus)
  }

  const { data: positivations } = await query

  // Summary counts (always from all statuses)
  const { data: allForCount } = await supabase.from('positivations').select('status')
  const statusCounts: Record<string, number> = { positivado: 0, em_negociacao: 0, perdido: 0, inativo: 0 }
  ;(allForCount || []).forEach((p: any) => { if (p.status in statusCounts) statusCounts[p.status]++ })

  function getVenue(p: any) {
    return p.venues || p.visits?.venues || null
  }

  function getDateStr(p: any) {
    const d = p.positivated_at || p.created_at
    if (!d) return '—'
    return format(new Date(d.includes('T') ? d : d + 'T12:00:00'), 'dd/MM/yy', { locale: ptBR })
  }

  // ── VIEW: Por casa ──────────────────────────────────────────────────
  const venueMap = new Map<string, { venue: any; items: any[] }>()
  ;(positivations || []).forEach((p: any) => {
    const venue = getVenue(p)
    const venueId = venue?.id || (p.visit_id ? `visit-${p.visit_id}` : 'sem-venue')
    const venueName = venue?.name || (p.visit_id ? '(via visita)' : 'Sem estabelecimento')
    if (!venueMap.has(venueId)) {
      venueMap.set(venueId, {
        venue: { ...(venue || {}), id: venueId, name: venueName },
        items: [],
      })
    }
    venueMap.get(venueId)!.items.push(p)
  })
  const groups = Array.from(venueMap.values())

  // ── VIEW: Por produto ───────────────────────────────────────────────
  const productMap = new Map<
    string,
    {
      productName: string
      brand: string
      statusSummary: Record<string, number>
      venues: { venue: any; status: string; notes: string | null; dateStr: string }[]
    }
  >()
  ;(positivations || []).forEach((p: any) => {
    const venue = getVenue(p)
    const key = `${p.brand_id}__${p.product_name || 'Sem SKU'}`
    if (!productMap.has(key)) {
      productMap.set(key, {
        productName: p.product_name || 'Sem SKU',
        brand: p.brands?.name || '',
        statusSummary: {},
        venues: [],
      })
    }
    const entry = productMap.get(key)!
    entry.statusSummary[p.status] = (entry.statusSummary[p.status] || 0) + 1
    entry.venues.push({
      venue: venue ? { ...venue } : { name: p.visit_id ? '(via visita)' : 'Sem estabelecimento' },
      status: p.status,
      notes: p.notes,
      dateStr: getDateStr(p),
    })
  })
  const products = Array.from(productMap.values()).sort((a, b) =>
    a.productName.localeCompare(b.productName, 'pt-BR')
  )

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Positivações</h1>
          <p className="text-muted-foreground text-sm">Registro independente de produtos positivados</p>
        </div>
        <Link href="/admin/positivations/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" /> Nova Positivação
          </Button>
        </Link>
      </div>

      {/* Summary por status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.keys(statusCounts) as PositivationStatus[]).map((status) => (
          <Card key={status}>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{statusCounts[status]}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{POSITIVATION_STATUS_LABELS[status]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Suspense><ViewTabs /></Suspense>
      <Suspense><StatusTabs /></Suspense>

      {/* ── VISTA: POR CASA ── */}
      {selectedView === 'casa' && (
        groups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma positivação encontrada</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {groups.map(({ venue, items }) => (
              <Card key={venue.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">{venue.name}</p>
                      {(venue.neighborhood || venue.city) && (
                        <p className="text-xs text-muted-foreground">
                          {[venue.neighborhood, venue.city].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground">{items.length} SKU{items.length !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="space-y-2">
                    {items.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-3 py-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{p.product_name || '—'}</span>
                            {p.brands?.name && (
                              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {p.brands.name}
                              </span>
                            )}
                          </div>
                          {p.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.notes}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={cn('text-xs border', STATUS_COLORS[p.status])} variant="outline">
                            {POSITIVATION_STATUS_LABELS[p.status as PositivationStatus] || p.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{getDateStr(p)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* ── VISTA: POR PRODUTO ── */}
      {selectedView === 'produto' && (
        products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum produto encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {products.map((product, idx) => (
              <Card key={idx}>
                <CardContent className="p-4 space-y-3">
                  {/* Header do produto */}
                  <div className="flex items-start justify-between gap-3 pb-2 border-b">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        {product.productName}
                      </p>
                      {product.brand && (
                        <p className="text-xs text-muted-foreground mt-0.5 ml-6">{product.brand}</p>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-wrap justify-end shrink-0">
                      {Object.entries(product.statusSummary).map(([status, count]) => (
                        <span
                          key={status}
                          className={cn('text-xs px-2 py-0.5 rounded-full border whitespace-nowrap', STATUS_COLORS[status])}
                        >
                          {count} {POSITIVATION_STATUS_LABELS[status as PositivationStatus] || status}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Lista de casas */}
                  <div className="space-y-2">
                    {product.venues
                      .sort((a, b) => (a.venue.name || '').localeCompare(b.venue.name || '', 'pt-BR'))
                      .map((entry, i) => (
                        <div key={i} className="flex items-start gap-3 py-0.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm">{entry.venue.name || '—'}</span>
                            {(entry.venue.neighborhood || entry.venue.city) && (
                              <span className="text-xs text-muted-foreground ml-1.5">
                                {[entry.venue.neighborhood, entry.venue.city].filter(Boolean).join(' · ')}
                              </span>
                            )}
                            {entry.notes && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={cn('text-xs border', STATUS_COLORS[entry.status])} variant="outline">
                              {POSITIVATION_STATUS_LABELS[entry.status as PositivationStatus] || entry.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{entry.dateStr}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  )
}

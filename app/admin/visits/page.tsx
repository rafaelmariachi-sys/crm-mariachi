'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { CalendarCheck, Plus, MapPin, Flame, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

const FILTERS = [
  { label: 'Todas', value: 'all' },
  { label: '🔥 Recentes', value: 'recent' },
  { label: 'Este mês', value: 'month' },
]

export default function VisitsPage() {
  const [visits, setVisits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('visits')
        .select(`
          id, visited_at, notes,
          venues(name, city, type, neighborhood),
          positivations(id, status, brands(name)),
          followups(id, status, brands(name))
        `)
        .order('visited_at', { ascending: false })

      // Date range filter takes priority over quick filters
      if (dateFrom || dateTo) {
        if (dateFrom) query = query.gte('visited_at', dateFrom)
        if (dateTo) query = query.lte('visited_at', dateTo)
      } else if (filter === 'recent') {
        const d = new Date()
        d.setDate(d.getDate() - 45)
        query = query.gte('visited_at', d.toISOString().split('T')[0])
      } else if (filter === 'month') {
        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        query = query.gte('visited_at', start)
      }

      const { data } = await query
      setVisits(data || [])
      setLoading(false)
    }
    load()
  }, [filter, dateFrom, dateTo])

  function clearDates() {
    setDateFrom('')
    setDateTo('')
  }

  const hasDateFilter = dateFrom || dateTo

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Visitas</h1>
          <p className="text-muted-foreground text-sm">{visits.length} visitas</p>
        </div>
        <Link href="/admin/visits/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova visita
          </Button>
        </Link>
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); clearDates() }}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium border transition-colors',
              !hasDateFilter && filter === f.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Filtro por intervalo de datas */}
      <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg border border-border bg-muted/30">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">De</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-medium">Até</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {hasDateFilter && (
          <button
            onClick={clearDates}
            className="flex items-center gap-1 h-9 px-3 rounded-md text-sm text-muted-foreground hover:text-foreground border border-border hover:border-primary/50 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </button>
        )}
        {hasDateFilter && (
          <span className="text-xs text-primary font-medium self-end pb-2">
            Filtrando por data personalizada
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : visits.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Nenhuma visita encontrada</p>
          {!hasDateFilter && (
            <Link href="/admin/visits/new">
              <Button className="mt-4">Registrar visita</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visits.map((visit: any) => {
            const brands = new Set([
              ...(visit.positivations?.map((p: any) => p.brands?.name) || []),
              ...(visit.followups?.map((f: any) => f.brands?.name) || []),
            ])

            const visitDate = new Date(visit.visited_at)
            const cutoff = new Date()
            cutoff.setDate(cutoff.getDate() - 45)
            const isRecent = visitDate >= cutoff

            return (
              <Link key={visit.id} href={`/admin/visits/${visit.id}`}>
                <Card className={cn(
                  'hover:border-primary/40 transition-colors cursor-pointer',
                  isRecent && 'border-primary/30 bg-primary/5'
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isRecent && (
                            <Flame className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                          <p className="font-semibold">{visit.venues?.name}</p>
                          <Badge variant="outline" className="text-xs">{visit.venues?.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3 inline mr-1" />
                          {visit.venues?.neighborhood} · {visit.venues?.city}
                        </p>
                        {visit.notes && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{visit.notes}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Array.from(brands).filter(Boolean).map((brand: any, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">{brand}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn('text-sm font-medium', isRecent && 'text-primary')}>
                          {formatDate(visit.visited_at)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {visit.positivations?.length ?? 0} posit. · {visit.followups?.length ?? 0} follow-up
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

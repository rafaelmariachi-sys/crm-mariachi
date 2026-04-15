import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { POSITIVATION_STATUS_LABELS, PositivationStatus } from '@/lib/types'
import { MapPin, Plus, Package } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

const STATUS_COLORS: Record<PositivationStatus, string> = {
  positivado: 'bg-emerald-500/15 text-emerald-700 border-emerald-200',
  em_negociacao: 'bg-amber-500/15 text-amber-700 border-amber-200',
  perdido: 'bg-red-500/15 text-red-700 border-red-200',
  inativo: 'bg-gray-500/15 text-gray-600 border-gray-200',
}

export default async function PositivationsPage() {
  const supabase = createClient()

  const { data: positivations } = await supabase
    .from('positivations')
    .select('id, status, product_name, notes, positivated_at, created_at, brand_id, brands(name), venue_id, venues(name, neighborhood, city), visit_id')
    .order('positivated_at', { ascending: false })
    .order('created_at', { ascending: false })

  // Group by venue for a cleaner view
  const grouped: Record<string, { venue: any; items: any[] }> = {}
  ;(positivations || []).forEach((p: any) => {
    const venueId = p.venue_id || 'sem-venue'
    const venueName = p.venues?.name || (p.visit_id ? '(via visita)' : 'Sem estabelecimento')
    if (!grouped[venueId]) grouped[venueId] = { venue: { ...p.venues, id: venueId, name: venueName }, items: [] }
    grouped[venueId].items.push(p)
  })

  const groups = Object.values(grouped)

  return (
    <div className="p-6 space-y-6">
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

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.entries(POSITIVATION_STATUS_LABELS) as [PositivationStatus, string][]).map(([status, label]) => {
          const count = (positivations || []).filter((p: any) => p.status === status).length
          return (
            <Card key={status}>
              <CardContent className="p-4">
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* List */}
      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma positivação registrada</p>
            <p className="text-sm mt-1">Clique em "Nova Positivação" para começar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map(({ venue, items }) => (
            <Card key={venue.id}>
              <CardContent className="p-4 space-y-3">
                {/* Venue header */}
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

                {/* Items */}
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
                        <Badge className={`text-xs border ${STATUS_COLORS[p.status as PositivationStatus]}`} variant="outline">
                          {POSITIVATION_STATUS_LABELS[p.status as PositivationStatus]}
                        </Badge>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {p.positivated_at
                            ? format(new Date(p.positivated_at + 'T12:00:00'), 'dd/MM/yy', { locale: ptBR })
                            : format(new Date(p.created_at), 'dd/MM/yy', { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

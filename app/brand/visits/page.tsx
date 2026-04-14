import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { POSITIVATION_STATUS_LABELS, POSITIVATION_STATUS_COLORS, FOLLOWUP_STATUS_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CalendarCheck, MapPin } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function BrandVisitsPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: brandUsers } = await supabase
    .from('brand_users')
    .select('brand_id')
    .eq('user_id', user!.id)

  const brandIds = (brandUsers || []).map((bu: any) => bu.brand_id)

  // Get all visits with positivations or followups for this brand
  const { data: positivations } = await supabase
    .from('positivations')
    .select(`
      id, product_name, status, notes,
      visits(
        id, visited_at, notes,
        venues(name, address, neighborhood, city, type)
      )
    `)
    .in('brand_id', brandIds)
    .order('created_at', { ascending: false })

  const { data: followups } = await supabase
    .from('followups')
    .select(`visit_id, content, due_date, status`)
    .in('brand_id', brandIds)

  // Group by visit
  const visitMap = new Map<string, {
    visit: any
    positivations: any[]
    followups: any[]
  }>()

  positivations?.forEach((p: any) => {
    if (!p.visits) return
    const visitId = p.visits.id
    if (!visitMap.has(visitId)) {
      visitMap.set(visitId, { visit: p.visits, positivations: [], followups: [] })
    }
    visitMap.get(visitId)!.positivations.push(p)
  })

  followups?.forEach((f: any) => {
    if (visitMap.has(f.visit_id)) {
      visitMap.get(f.visit_id)!.followups.push(f)
    }
  })

  const visits = Array.from(visitMap.values()).sort(
    (a, b) => new Date(b.visit.visited_at).getTime() - new Date(a.visit.visited_at).getTime()
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Visitas</h1>
        <p className="text-muted-foreground text-sm">{visits.length} visitas com sua marca</p>
      </div>

      {visits.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Nenhuma visita registrada para sua marca</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visits.map(({ visit, positivations: pos, followups: fols }) => (
            <Card key={visit.id}>
              <CardContent className="p-5 space-y-4">
                {/* Visit header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{visit.venues?.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {visit.venues?.neighborhood} · {visit.venues?.city}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatDate(visit.visited_at)}</p>
                    <Badge variant="outline" className="text-xs mt-1">{visit.venues?.type}</Badge>
                  </div>
                </div>

                {visit.notes && (
                  <p className="text-sm text-muted-foreground border-l-2 border-border pl-3">{visit.notes}</p>
                )}

                {/* Positivations */}
                {pos.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Positivações</p>
                    <div className="space-y-2">
                      {pos.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/40">
                          <div>
                            <p className="text-sm font-medium">{p.product_name}</p>
                            {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                          </div>
                          <span className={cn('text-xs px-2 py-1 rounded-full border whitespace-nowrap', POSITIVATION_STATUS_COLORS[p.status])}>
                            {POSITIVATION_STATUS_LABELS[p.status]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Followups */}
                {fols.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Follow-ups</p>
                    <div className="space-y-2">
                      {fols.map((f: any, i: number) => (
                        <div key={i} className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-muted/40">
                          <div className="flex-1">
                            <p className="text-sm">{f.content}</p>
                            {f.due_date && <p className="text-xs text-muted-foreground mt-0.5">Retorno: {formatDate(f.due_date)}</p>}
                          </div>
                          <Badge variant="outline" className="text-xs whitespace-nowrap">{FOLLOWUP_STATUS_LABELS[f.status as keyof typeof FOLLOWUP_STATUS_LABELS]}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

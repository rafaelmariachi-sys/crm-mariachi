import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { POSITIVATION_STATUS_LABELS, POSITIVATION_STATUS_COLORS, FOLLOWUP_STATUS_LABELS, PositivationStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CalendarCheck, MapPin } from 'lucide-react'
import { BrandTabs } from '@/components/brand/brand-tabs'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

export default async function BrandVisitsPage({ searchParams }: { searchParams: { brand?: string } }) {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: brandUsers } = await supabase
    .from('brand_users')
    .select('brand_id, brands(id, name)')
    .eq('user_id', user!.id)

  const allBrands = (brandUsers || []).map((bu: any) => ({ id: bu.brands.id, name: bu.brands.name }))
  const selectedBrand = searchParams.brand
  const brandIds = selectedBrand ? [selectedBrand] : allBrands.map((b) => b.id)

  // Busca TODAS as visitas (admin bypassa RLS)
  let allVisits: any[] = []
  let adminClientFailed = false
  try {
    const { data, error } = await admin
      .from('visits')
      .select('id, visited_at, notes, venues(id, name, address, neighborhood, city, type)')
      .order('visited_at', { ascending: false })
    if (error) {
      console.error('[brand/visits] visits fetch error:', error.message)
      adminClientFailed = true
    } else {
      allVisits = data ?? []
    }
  } catch (e) {
    console.error('[brand/visits] admin client falhou:', e)
    adminClientFailed = true
  }

  // Positivações da marca com visit_id
  const { data: positivations } = await supabase
    .from('positivations')
    .select('id, product_name, status, notes, visit_id')
    .in('brand_id', brandIds)
    .not('visit_id', 'is', null)

  // Follow-ups da marca com visit_id
  const { data: followups } = await supabase
    .from('followups')
    .select('id, visit_id, content, due_date, status')
    .or(`brand_id.in.(${brandIds.join(',')}),brand_id.is.null`)
    .not('visit_id', 'is', null)

  // Constrói mapa partindo de TODAS as visitas
  const visitMap = new Map<string, { visit: any; positivations: any[]; followups: any[] }>()

  ;(allVisits || []).forEach((v: any) => {
    visitMap.set(v.id, { visit: v, positivations: [], followups: [] })
  })

  // Sobrepõe positivações da marca
  ;(positivations || []).forEach((p: any) => {
    if (p.visit_id && visitMap.has(p.visit_id)) {
      visitMap.get(p.visit_id)!.positivations.push(p)
    }
  })

  // Sobrepõe follow-ups da marca
  ;(followups || []).forEach((f: any) => {
    if (f.visit_id && visitMap.has(f.visit_id)) {
      visitMap.get(f.visit_id)!.followups.push(f)
    }
  })

  const visits = Array.from(visitMap.values())

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Visitas</h1>
        <p className="text-muted-foreground text-sm">{visits.length} visitas</p>
      </div>

      <Suspense><BrandTabs brands={allBrands} /></Suspense>

      {adminClientFailed && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-600 dark:text-amber-400">
          ⚠️ Exibindo apenas visitas vinculadas à marca — a chave de serviço (SUPABASE_SERVICE_ROLE_KEY) pode estar
          incorreta no Vercel. Verifique se o valor é a <strong>service role key</strong> (não a anon key).
        </div>
      )}

      {visits.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Nenhuma visita registrada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visits.map(({ visit, positivations: pos, followups: fols }) => (
            <Card key={visit.id}>
              <CardContent className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{visit.venues?.name}</p>
                    {(visit.venues?.neighborhood || visit.venues?.city) && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {[visit.venues?.neighborhood, visit.venues?.city].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">{formatDate(visit.visited_at)}</p>
                    {visit.venues?.type && (
                      <Badge variant="outline" className="text-xs mt-1">{visit.venues.type}</Badge>
                    )}
                  </div>
                </div>

                {/* Observações da visita */}
                {visit.notes && (
                  <p className="text-sm text-muted-foreground border-l-2 border-border pl-3">{visit.notes}</p>
                )}

                {/* Positivações da marca nesta visita */}
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
                          <span className={cn(
                            'text-xs px-2 py-1 rounded-full border whitespace-nowrap',
                            POSITIVATION_STATUS_COLORS[p.status as PositivationStatus]
                          )}>
                            {POSITIVATION_STATUS_LABELS[p.status as PositivationStatus]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-ups da marca nesta visita */}
                {fols.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Follow-ups</p>
                    <div className="space-y-2">
                      {fols.map((f: any) => (
                        <div key={f.id} className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-muted/40">
                          <div className="flex-1">
                            <p className="text-sm">{f.content}</p>
                            {f.due_date && (
                              <p className="text-xs text-muted-foreground mt-0.5">Retorno: {formatDate(f.due_date)}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            {FOLLOWUP_STATUS_LABELS[f.status as keyof typeof FOLLOWUP_STATUS_LABELS]}
                          </Badge>
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

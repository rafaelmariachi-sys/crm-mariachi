import { createClient } from '@/lib/supabase/server'
import { StatsCard } from '@/components/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getCurrentMonthRange, formatDate, getDueDateLabel } from '@/lib/utils'
import { CalendarCheck, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { POSITIVATION_STATUS_LABELS, POSITIVATION_STATUS_COLORS, FOLLOWUP_STATUS_COLORS, PositivationStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function BrandDashboard() {
  const supabase = createClient()
  const { start, end } = getCurrentMonthRange()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: brandUsers } = await supabase
    .from('brand_users')
    .select('brand_id, brands(name)')
    .eq('user_id', user!.id)

  const brandIds = (brandUsers || []).map((bu: any) => bu.brand_id)
  const brandNames = (brandUsers || []).map((bu: any) => bu.brands?.name).filter(Boolean).join(' & ')

  const [
    { data: positivationsThisMonth },
    { data: allPositivations },
    { data: openFollowups },
    { data: recentVisits },
  ] = await Promise.all([
    supabase
      .from('positivations')
      .select('id, status, visits(visited_at, venue_id)')
      .in('brand_id', brandIds)
      .gte('visits.visited_at', start)
      .lte('visits.visited_at', end),

    supabase
      .from('positivations')
      .select('status')
      .in('brand_id', brandIds),

    supabase
      .from('followups')
      .select('id, content, due_date, status, visits(venues(name))')
      .in('brand_id', brandIds)
      .eq('status', 'aberto')
      .order('due_date', { ascending: true })
      .limit(5),

    supabase
      .from('positivations')
      .select('visit_id, visits(id, visited_at, venues(name, city, type))')
      .in('brand_id', brandIds)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const uniqueVenuesThisMonth = new Set(
    (positivationsThisMonth || [])
      .filter((p: any) => p.visits?.venue_id)
      .map((p: any) => p.visits?.venue_id)
  ).size

  const statusCounts: Record<string, number> = {}
  ;(allPositivations || []).forEach((p: any) => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{brandNames}</h1>
        <p className="text-muted-foreground text-sm">Dashboard — visão geral das suas marcas</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard title="Visitas este mês" value={uniqueVenuesThisMonth} icon={CalendarCheck} />
        <StatsCard title="Positivações totais" value={allPositivations?.length ?? 0} icon={CheckCircle} />
        <StatsCard title="Follow-ups abertos" value={openFollowups?.length ?? 0} icon={Clock} iconClassName="bg-amber-500/10" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              Follow-ups abertos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!openFollowups || openFollowups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum follow-up aberto.</p>
            ) : (
              <div className="space-y-3">
                {openFollowups.map((f: any) => {
                  const { label, urgent } = getDueDateLabel(f.due_date)
                  return (
                    <div key={f.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/40">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.content}</p>
                        <p className="text-xs text-muted-foreground">{f.visits?.venues?.name}</p>
                      </div>
                      <span className={cn('text-xs whitespace-nowrap', urgent ? 'text-red-400' : 'text-muted-foreground')}>
                        {label}
                      </span>
                    </div>
                  )
                })}
                <Link href="/brand/followups" className="text-xs text-primary hover:underline block text-right">
                  Ver todos →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Positivações por status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(Object.keys(POSITIVATION_STATUS_LABELS) as PositivationStatus[]).map((status) => (
                <div key={status} className={cn('flex items-center justify-between p-2.5 rounded-lg border', POSITIVATION_STATUS_COLORS[status])}>
                  <span className="text-xs font-medium">{POSITIVATION_STATUS_LABELS[status]}</span>
                  <span className="text-lg font-bold">{statusCounts[status] ?? 0}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { StatsCard } from '@/components/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getCurrentMonthRange, formatDate, getDueDateLabel } from '@/lib/utils'
import { CalendarCheck, CheckCircle, AlertCircle, Clock, TrendingUp } from 'lucide-react'
import { POSITIVATION_STATUS_LABELS, POSITIVATION_STATUS_COLORS, PositivationStatus } from '@/lib/types'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = createClient()
  const { start, end } = getCurrentMonthRange()

  // Fetch all stats in parallel
  const [
    { count: visitsThisMonth },
    { data: positivationsByStatus },
    { data: overdueFollowups },
    { data: recentVisits },
  ] = await Promise.all([
    supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .gte('visited_at', start)
      .lte('visited_at', end),

    supabase
      .from('positivations')
      .select('status'),

    supabase
      .from('followups')
      .select('id, content, due_date, status, brands(name), visits(venues(name))')
      .eq('status', 'aberto')
      .not('due_date', 'is', null)
      .lte('due_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('due_date', { ascending: true })
      .limit(10),

    supabase
      .from('visits')
      .select('id, visited_at, notes, venues(name, city, type)')
      .order('visited_at', { ascending: false })
      .limit(5),
  ])

  // Count positivations by status
  const statusCounts: Record<string, number> = {
    positivado: 0,
    em_negociacao: 0,
    recusado: 0,
    retorno_pendente: 0,
  }
  positivationsByStatus?.forEach((p: { status: string }) => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
  })

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral do mês atual</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard
          title="Visitas no mês"
          value={visitsThisMonth ?? 0}
          icon={CalendarCheck}
        />
        <StatsCard
          title="Positivados"
          value={statusCounts.positivado}
          icon={CheckCircle}
          iconClassName="bg-emerald-500/10"
        />
        <StatsCard
          title="Em negociação"
          value={statusCounts.em_negociacao}
          icon={TrendingUp}
          iconClassName="bg-amber-500/10"
        />
        <StatsCard
          title="Retorno pendente"
          value={statusCounts.retorno_pendente}
          icon={Clock}
          iconClassName="bg-blue-500/10"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Overdue / upcoming follow-ups */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              Follow-ups urgentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!overdueFollowups || overdueFollowups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum follow-up pendente.</p>
            ) : (
              <div className="space-y-3">
                {overdueFollowups.map((f: any) => {
                  const { label, urgent } = getDueDateLabel(f.due_date)
                  return (
                    <div key={f.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/40">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.content}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(f.brands as any)?.name} · {(f.visits as any)?.venues?.name}
                        </p>
                      </div>
                      <span className={cn('text-xs font-medium whitespace-nowrap', urgent ? 'text-red-400' : 'text-muted-foreground')}>
                        {label}
                      </span>
                    </div>
                  )
                })}
                <Link href="/admin/followups" className="text-xs text-primary hover:underline block text-right">
                  Ver todos →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent visits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" />
              Últimas visitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!recentVisits || recentVisits.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma visita registrada.</p>
            ) : (
              <div className="space-y-3">
                {recentVisits.map((v: any) => (
                  <Link
                    key={v.id}
                    href={`/admin/visits/${v.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{v.venues?.name}</p>
                      <p className="text-xs text-muted-foreground">{v.venues?.city} · {v.venues?.type}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(v.visited_at)}</span>
                  </Link>
                ))}
                <Link href="/admin/visits" className="text-xs text-primary hover:underline block text-right">
                  Ver todas →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Positivation status overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Positivações por status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(Object.keys(statusCounts) as PositivationStatus[]).map((status) => (
              <div key={status} className={cn('p-4 rounded-lg border', POSITIVATION_STATUS_COLORS[status])}>
                <p className="text-2xl font-bold">{statusCounts[status]}</p>
                <p className="text-xs mt-1">{POSITIVATION_STATUS_LABELS[status]}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

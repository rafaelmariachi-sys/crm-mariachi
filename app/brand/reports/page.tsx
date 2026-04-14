import { createClient } from '@/lib/supabase/server'
import { getCurrentMonthRange } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from '@/components/stats-card'
import { MapPin, TrendingUp } from 'lucide-react'
import { POSITIVATION_STATUS_LABELS, PositivationStatus } from '@/lib/types'
import { BrandCharts } from './charts'

export const dynamic = 'force-dynamic'

export default async function BrandReportsPage() {
  const supabase = createClient()
  const { start, end } = getCurrentMonthRange()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: brandUsers } = await supabase
    .from('brand_users')
    .select('brand_id')
    .eq('user_id', user!.id)

  const brandIds = (brandUsers || []).map((bu: any) => bu.brand_id)

  // All positivations with visit date
  const { data: positivations } = await supabase
    .from('positivations')
    .select('id, status, created_at, visits(visited_at, venue_id)')
    .in('brand_id', brandIds)

  // Unique venues this month
  const { data: thisMonthPos } = await supabase
    .from('positivations')
    .select('visits(visited_at, venue_id)')
    .in('brand_id', brandIds)
    .gte('visits.visited_at', start)
    .lte('visits.visited_at', end)

  const uniqueVenues = new Set((thisMonthPos || []).map((p: any) => p.visits?.venue_id).filter(Boolean)).size

  // Positivations by month (last 6 months)
  const monthlyData: Record<string, number> = {}
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyData[key] = 0
  }

  positivations?.forEach((p: any) => {
    if (!p.visits?.visited_at) return
    const d = new Date(p.visits.visited_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key in monthlyData) monthlyData[key]++
  })

  const barData = Object.entries(monthlyData).map(([month, count]) => {
    const [year, m] = month.split('-')
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return { month: months[parseInt(m) - 1], count }
  })

  // Positivations by status
  const statusCounts: Record<string, number> = {}
  positivations?.forEach((p: any) => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1
  })

  const pieData = Object.entries(statusCounts).map(([status, value]) => ({
    name: POSITIVATION_STATUS_LABELS[status as PositivationStatus] || status,
    value,
  }))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground text-sm">Visão analítica da sua marca</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatsCard title="Casas visitadas este mês" value={uniqueVenues} icon={MapPin} />
        <StatsCard title="Total de positivações" value={positivations?.length ?? 0} icon={TrendingUp} />
      </div>

      <BrandCharts barData={barData} pieData={pieData} />
    </div>
  )
}

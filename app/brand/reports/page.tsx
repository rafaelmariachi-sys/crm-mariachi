import { createClient } from '@/lib/supabase/server'
import { getCurrentMonthRange } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from '@/components/stats-card'
import { MapPin, TrendingUp } from 'lucide-react'
import { POSITIVATION_STATUS_LABELS, PositivationStatus } from '@/lib/types'
import { BrandCharts } from './charts'
import { BrandTabs } from '@/components/brand/brand-tabs'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

export default async function BrandReportsPage({ searchParams }: { searchParams: { brand?: string } }) {
  const supabase = createClient()
  const { start, end } = getCurrentMonthRange()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: brandUsers } = await supabase.from('brand_users').select('brand_id, brands(id, name)').eq('user_id', user!.id)

  const allBrands = (brandUsers || []).map((bu: any) => ({ id: bu.brands.id, name: bu.brands.name }))
  const selectedBrand = searchParams.brand
  const brandIds = selectedBrand ? [selectedBrand] : allBrands.map((b) => b.id)

  const { data: positivations } = await supabase
    .from('positivations')
    .select('id, status, product_name, brand_id, brands(name), created_at, positivated_at, venue_id, visits(visited_at, venue_id)')
    .in('brand_id', brandIds)

  // Helper: get the effective date and venue_id for a positivation
  function getPosDate(p: any): string | null {
    return p.positivated_at || p.visits?.visited_at || null
  }
  function getPosVenueId(p: any): string | null {
    return p.venue_id || p.visits?.venue_id || null
  }

  // Unique venues this month (both direct and via visit)
  const uniqueVenues = new Set(
    (positivations || [])
      .filter((p: any) => { const d = getPosDate(p); return d && d >= start && d <= end })
      .map((p: any) => getPosVenueId(p))
      .filter(Boolean)
  ).size

  const monthlyData: Record<string, number> = {}
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyData[key] = 0
  }
  positivations?.forEach((p: any) => {
    const dateStr = getPosDate(p)
    if (!dateStr) return
    const d = new Date(dateStr)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key in monthlyData) monthlyData[key]++
  })

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const barData = Object.entries(monthlyData).map(([month, count]) => {
    const [, m] = month.split('-')
    return { month: months[parseInt(m) - 1], count }
  })

  const statusCounts: Record<string, number> = {}
  positivations?.forEach((p: any) => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1 })
  const pieData = Object.entries(statusCounts).map(([status, value]) => ({
    name: POSITIVATION_STATUS_LABELS[status as PositivationStatus] || status, value,
  }))

  // SKU breakdown por marca
  const skuByBrand: Record<string, { brandName: string; data: { sku: string; count: number }[] }> = {}
  positivations?.forEach((p: any) => {
    const brandId = p.brand_id
    const brandName = (p as any).brands?.name || brandId
    const sku = p.product_name || 'Sem SKU'
    if (!skuByBrand[brandId]) skuByBrand[brandId] = { brandName, data: [] }
    const existing = skuByBrand[brandId].data.find((d) => d.sku === sku)
    if (existing) existing.count++
    else skuByBrand[brandId].data.push({ sku, count: 1 })
  })
  const skuCharts = Object.values(skuByBrand)
    .filter((b) => b.data.length > 0)
    .map((b) => ({ ...b, data: b.data.sort((a, c) => c.count - a.count) }))

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground text-sm">Visão analítica</p>
      </div>

      <Suspense><BrandTabs brands={allBrands} /></Suspense>

      <div className="grid grid-cols-2 gap-4">
        <StatsCard title="Casas visitadas este mês" value={uniqueVenues} icon={MapPin} />
        <StatsCard title="Total de positivações" value={positivations?.length ?? 0} icon={TrendingUp} />
      </div>

      <BrandCharts barData={barData} pieData={pieData} skuCharts={skuCharts} />
    </div>
  )
}

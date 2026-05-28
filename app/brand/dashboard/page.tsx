import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StatsCard } from '@/components/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentMonthRange, getDueDateLabel } from '@/lib/utils'
import { CalendarCheck, CheckCircle, Clock, AlertCircle, TrendingUp, XCircle } from 'lucide-react'
import { POSITIVATION_STATUS_LABELS, POSITIVATION_STATUS_COLORS, PositivationStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { BrandTabs } from '@/components/brand/brand-tabs'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

export default async function BrandDashboard({ searchParams }: { searchParams: { brand?: string } }) {
  const supabase = createClient()
  const admin = createAdminClient()
  const { start, end } = getCurrentMonthRange()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: brandUsers } = await supabase
    .from('brand_users')
    .select('brand_id, brands(id, name)')
    .eq('user_id', user!.id)

  const allBrands = (brandUsers || []).map((bu: any) => ({ id: bu.brands.id, name: bu.brands.name }))
  const selectedBrand = searchParams.brand
  const brandIds = selectedBrand ? [selectedBrand] : allBrands.map((b) => b.id)
  const brandLabel = selectedBrand ? allBrands.find((b) => b.id === selectedBrand)?.name : allBrands.map((b) => b.name).join(' & ')

  const brandOr = `brand_id.in.(${brandIds.join(',')}),brand_id.is.null`

  // Conta TODAS as visitas do mês via admin (bypassa RLS)
  let visitsThisMonth = 0
  let adminClientFailed = false
  try {
    const { count, error } = await admin
      .from('visits')
      .select('id', { count: 'exact', head: true })
      .gte('visited_at', start + 'T00:00:00')
      .lte('visited_at', end + 'T23:59:59')
    if (error) {
      console.error('[brand/dashboard] visits count error:', error.message)
      adminClientFailed = true
    } else {
      visitsThisMonth = count ?? 0
    }
  } catch (e) {
    console.error('[brand/dashboard] admin client falhou:', e)
    adminClientFailed = true
  }

  const [
    { data: allPositivations },
    { data: openFollowups },
  ] = await Promise.all([
    // Todas as positivações da marca para quebrar por status
    supabase.from('positivations').select('status').in('brand_id', brandIds),
    // Follow-ups abertos da marca
    supabase
      .from('followups')
      .select('id, content, due_date, status, visits(venues(name))')
      .or(brandOr)
      .eq('status', 'aberto')
      .order('due_date', { ascending: true })
      .limit(5),
  ])

  // Contagem por status
  const statusCounts: Record<string, number> = { positivado: 0, em_negociacao: 0, perdido: 0, inativo: 0 }
  ;(allPositivations || []).forEach((p: any) => {
    if (p.status in statusCounts) statusCounts[p.status]++
  })

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{brandLabel}</h1>
        <p className="text-muted-foreground text-sm">Dashboard — visão geral</p>
      </div>

      <Suspense><BrandTabs brands={allBrands} /></Suspense>

      {adminClientFailed && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-600 dark:text-amber-400">
          ⚠️ Não foi possível carregar todas as visitas — a chave de serviço (SUPABASE_SERVICE_ROLE_KEY) pode estar
          incorreta no Vercel. Verifique se o valor corresponde exatamente à <strong>service role key</strong> do projeto
          Supabase (não à anon key).
        </div>
      )}

      {/* Linha 1: visitas + follow-ups */}
      <div className="grid grid-cols-2 gap-3">
        <StatsCard title="Visitas este mês" value={visitsThisMonth ?? 0} icon={CalendarCheck} />
        <StatsCard title="Follow-ups abertos" value={openFollowups?.length ?? 0} icon={Clock} iconClassName="bg-amber-500/10" />
      </div>

      {/* Linha 2: positivações por status */}
      <div className="grid grid-cols-3 gap-3">
        <StatsCard title="Positivados" value={statusCounts.positivado} icon={CheckCircle} iconClassName="bg-emerald-500/10" />
        <StatsCard title="Em negociação" value={statusCounts.em_negociacao} icon={TrendingUp} iconClassName="bg-amber-500/10" />
        <StatsCard title="Perdidos" value={statusCounts.perdido + statusCounts.inativo} icon={XCircle} iconClassName="bg-red-500/10" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400" />Follow-ups abertos
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
                      <span className={cn('text-xs whitespace-nowrap', urgent ? 'text-red-400' : 'text-muted-foreground')}>{label}</span>
                    </div>
                  )
                })}
                <Link href={`/brand/followups${selectedBrand ? `?brand=${selectedBrand}` : ''}`} className="text-xs text-primary hover:underline block text-right">Ver todos →</Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Positivações por status</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(Object.keys(POSITIVATION_STATUS_LABELS) as PositivationStatus[]).map((status) => (
                <div key={status} className={cn('flex items-center justify-between p-2.5 rounded-lg border', POSITIVATION_STATUS_COLORS[status])}>
                  <span className="text-xs font-medium">{POSITIVATION_STATUS_LABELS[status]}</span>
                  <span className="text-lg font-bold">{statusCounts[status as keyof typeof statusCounts] ?? 0}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

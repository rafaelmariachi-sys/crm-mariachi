import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { FOLLOWUP_STATUS_LABELS, FOLLOWUP_STATUS_COLORS, FollowupStatus } from '@/lib/types'
import { formatDate, getDueDateLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { MessageSquare } from 'lucide-react'
import { BrandTabs } from '@/components/brand/brand-tabs'

export const dynamic = 'force-dynamic'

export default async function BrandFollowupsPage({ searchParams }: { searchParams: { brand?: string } }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: brandUsers } = await supabase.from('brand_users').select('brand_id, brands(id, name)').eq('user_id', user!.id)

  const allBrands = (brandUsers || []).map((bu: any) => ({ id: bu.brands.id, name: bu.brands.name }))
  const selectedBrand = searchParams.brand
  const brandIds = selectedBrand ? [selectedBrand] : allBrands.map((b) => b.id)

  const { data: followups } = await supabase
    .from('followups')
    .select('*, visits(venues(name, city))')
    .in('brand_id', brandIds)
    .order('due_date', { ascending: true, nullsFirst: false })

  const groupedByStatus: Record<string, any[]> = { aberto: [], concluido: [], cancelado: [] }
  followups?.forEach((f: any) => { groupedByStatus[f.status]?.push(f) })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Follow-ups</h1>
        <p className="text-muted-foreground text-sm">{followups?.length ?? 0} registros</p>
      </div>

      <BrandTabs brands={allBrands} />

      {!followups || followups.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum follow-up registrado</p>
        </div>
      ) : (
        <div className="space-y-8">
          {(Object.entries(groupedByStatus) as [FollowupStatus, any[]][]).map(([status, items]) => {
            if (items.length === 0) return null
            return (
              <div key={status}>
                <div className={cn('inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border mb-3', FOLLOWUP_STATUS_COLORS[status])}>
                  {FOLLOWUP_STATUS_LABELS[status]} ({items.length})
                </div>
                <div className="space-y-3">
                  {items.map((f: any) => {
                    const { label, urgent } = getDueDateLabel(f.due_date)
                    return (
                      <Card key={f.id} className={cn(status === 'aberto' && urgent && 'border-red-500/30')}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{f.content}</p>
                              <p className="text-xs text-muted-foreground mt-1">{f.visits?.venues?.name} · {f.visits?.venues?.city}</p>
                            </div>
                            {f.due_date && (
                              <span className={cn('text-xs whitespace-nowrap', status === 'aberto' && urgent ? 'text-red-400' : 'text-muted-foreground')}>{label}</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

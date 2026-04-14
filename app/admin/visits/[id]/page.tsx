import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, MapPin, CalendarCheck, Package, MessageSquare } from 'lucide-react'
import { POSITIVATION_STATUS_LABELS, POSITIVATION_STATUS_COLORS, FOLLOWUP_STATUS_LABELS, FOLLOWUP_STATUS_COLORS } from '@/lib/types'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function VisitDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: visit } = await supabase
    .from('visits')
    .select(`
      id, visited_at, notes,
      venues(name, address, neighborhood, city, type),
      positivations(id, product_name, status, notes, brands(name)),
      followups(id, content, due_date, status, brands(name))
    `)
    .eq('id', params.id)
    .single()

  if (!visit) notFound()

  const v = visit as any

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/visits">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{v.venues?.name}</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-1">
            <CalendarCheck className="h-3 w-3" />
            {formatDate(v.visited_at)}
          </p>
        </div>
      </div>

      {/* Venue info */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" />Estabelecimento</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          <p className="font-medium">{v.venues?.name}</p>
          <p className="text-sm text-muted-foreground">{v.venues?.address}</p>
          <p className="text-sm text-muted-foreground">{v.venues?.neighborhood} · {v.venues?.city}</p>
          <Badge variant="outline" className="mt-2">{v.venues?.type}</Badge>
        </CardContent>
      </Card>

      {/* Notes */}
      {v.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notas gerais</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{v.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Positivations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Positivações ({v.positivations?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!v.positivations || v.positivations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma positivação nesta visita</p>
          ) : (
            <div className="space-y-3">
              {v.positivations.map((p: any) => (
                <div key={p.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/40">
                  <div>
                    <p className="text-sm font-medium">{p.product_name}</p>
                    <p className="text-xs text-muted-foreground">{p.brands?.name}</p>
                    {p.notes && <p className="text-xs text-muted-foreground mt-1">{p.notes}</p>}
                  </div>
                  <span className={cn('text-xs px-2 py-1 rounded-full border whitespace-nowrap', POSITIVATION_STATUS_COLORS[p.status as keyof typeof POSITIVATION_STATUS_COLORS])}>
                    {POSITIVATION_STATUS_LABELS[p.status as keyof typeof POSITIVATION_STATUS_LABELS]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Follow-ups */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Follow-ups ({v.followups?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!v.followups || v.followups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum follow-up nesta visita</p>
          ) : (
            <div className="space-y-3">
              {v.followups.map((f: any) => (
                <div key={f.id} className="p-3 rounded-lg bg-muted/40 space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium flex-1">{f.content}</p>
                    <span className={cn('text-xs px-2 py-1 rounded-full border whitespace-nowrap', FOLLOWUP_STATUS_COLORS[f.status as keyof typeof FOLLOWUP_STATUS_COLORS])}>
                      {FOLLOWUP_STATUS_LABELS[f.status as keyof typeof FOLLOWUP_STATUS_LABELS]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{f.brands?.name}</span>
                    {f.due_date && <span>· Retorno: {formatDate(f.due_date)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

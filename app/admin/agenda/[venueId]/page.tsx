import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  MapPin, Phone, Mail, User, ArrowLeft, MessageSquare,
  Clock, CheckCircle2, AlertCircle, Building2, Package,
} from 'lucide-react'
import Link from 'next/link'
import { getDueDateLabel, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const FOLLOWUP_STATUS_COLORS: Record<string, string> = {
  aberto: 'bg-amber-500/15 text-amber-700 border-amber-200',
  concluido: 'bg-emerald-500/15 text-emerald-700 border-emerald-200',
  cancelado: 'bg-gray-500/15 text-gray-500 border-gray-200',
}
const FOLLOWUP_STATUS_LABELS: Record<string, string> = {
  aberto: 'Aberto',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

const POSITIVATION_STATUS_COLORS: Record<string, string> = {
  positivado: 'bg-emerald-500/15 text-emerald-700 border-emerald-200',
  em_negociacao: 'bg-amber-500/15 text-amber-700 border-amber-200',
  perdido: 'bg-red-500/15 text-red-600 border-red-200',
  inativo: 'bg-gray-500/15 text-gray-500 border-gray-200',
}
const POSITIVATION_STATUS_LABELS: Record<string, string> = {
  positivado: 'Positivado',
  em_negociacao: 'Em negociação',
  perdido: 'Perdido',
  inativo: 'Inativo',
}

export default async function AgendaVenuePage({ params }: { params: { venueId: string } }) {
  const supabase = createClient()

  // Fetch venue details
  const { data: venue } = await supabase
    .from('venues')
    .select('*')
    .eq('id', params.venueId)
    .single()

  if (!venue) notFound()

  // Fetch all follow-ups for this venue (via visits)
  const { data: followups } = await supabase
    .from('followups')
    .select('id, content, due_date, status, created_at, brands(name), visits!inner(venue_id, visited_at)')
    .eq('visits.venue_id', params.venueId)
    .order('status', { ascending: true })   // aberto primeiro
    .order('due_date', { ascending: true })

  // Fetch positivations for this venue (direct or via visits)
  const { data: positivationsDirect } = await supabase
    .from('positivations')
    .select('id, product_name, status, created_at, positivated_at, brands(name)')
    .eq('venue_id', params.venueId)
    .order('positivated_at', { ascending: false })

  const { data: positivationsViaVisit } = await supabase
    .from('positivations')
    .select('id, product_name, status, created_at, brands(name), visits!inner(venue_id, visited_at)')
    .eq('visits.venue_id', params.venueId)
    .order('created_at', { ascending: false })

  // Merge and deduplicate positivations
  const posIds = new Set<string>()
  const positivations: any[] = []
  for (const p of [...(positivationsDirect || []), ...(positivationsViaVisit || [])]) {
    if (!posIds.has(p.id)) {
      posIds.add(p.id)
      positivations.push(p)
    }
  }

  const openFollowups = (followups || []).filter((f: any) => f.status === 'aberto')
  const closedFollowups = (followups || []).filter((f: any) => f.status !== 'aberto')

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Link href="/admin/agenda">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold leading-tight">{venue.name}</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {[venue.neighborhood, venue.city].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {/* Venue info */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {venue.type && <Badge variant="outline">{venue.type}</Badge>}
            {openFollowups.length > 0 && (
              <Badge className="bg-amber-500/15 text-amber-700 border-amber-200 border" variant="outline">
                {openFollowups.length} follow-up{openFollowups.length !== 1 ? 's' : ''} aberto{openFollowups.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {venue.address && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{venue.address}{venue.neighborhood ? `, ${venue.neighborhood}` : ''}</span>
              </div>
            )}
            {venue.contact_name && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4 shrink-0" />
                <span>{venue.contact_name}</span>
              </div>
            )}
            {venue.phone && (
              <a href={`tel:${venue.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                <Phone className="h-4 w-4 shrink-0" />
                <span>{venue.phone}</span>
              </a>
            )}
            {venue.email && (
              <a href={`mailto:${venue.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{venue.email}</span>
              </a>
            )}
            {venue.cnpj && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4 shrink-0" />
                <span>{venue.cnpj}</span>
              </div>
            )}
            {(venue.delivery_day || venue.delivery_hours) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>{[venue.delivery_day, venue.delivery_hours].filter(Boolean).join(' – ')}</span>
              </div>
            )}
          </div>

          {venue.notes && (
            <p className="text-sm text-muted-foreground border-t pt-3">{venue.notes}</p>
          )}
        </CardContent>
      </Card>

      {/* Open follow-ups */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            Follow-ups abertos
            {openFollowups.length > 0 && (
              <Badge className="ml-auto bg-amber-500/15 text-amber-700 border-amber-200 border text-xs" variant="outline">
                {openFollowups.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {openFollowups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">Nenhum follow-up aberto</p>
          ) : (
            <div className="space-y-3">
              {openFollowups.map((f: any) => {
                const { label, urgent } = getDueDateLabel(f.due_date)
                return (
                  <div key={f.id} className={cn(
                    'p-3 rounded-lg border space-y-1.5',
                    urgent ? 'border-red-200 bg-red-500/5' : 'border-amber-200 bg-amber-500/5'
                  )}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium flex-1">{f.content}</p>
                      {f.due_date && (
                        <span className={cn('text-xs font-medium whitespace-nowrap shrink-0', urgent ? 'text-red-500' : 'text-amber-600')}>
                          {label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(f.brands as any)?.name && (
                        <Badge variant="secondary" className="text-xs">{(f.brands as any).name}</Badge>
                      )}
                      {f.due_date && (
                        <span className="text-xs text-muted-foreground">
                          Retorno: {formatDate(f.due_date)}
                        </span>
                      )}
                      {f.visits?.visited_at && (
                        <span className="text-xs text-muted-foreground">
                          Visita: {formatDate(f.visits.visited_at)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Positivations */}
      {positivations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Positivações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {positivations.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-1.5 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.product_name || '—'}</p>
                    {(p.brands as any)?.name && (
                      <p className="text-xs text-muted-foreground">{(p.brands as any).name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      className={cn('text-xs border', POSITIVATION_STATUS_COLORS[p.status as string] || '')}
                      variant="outline"
                    >
                      {POSITIVATION_STATUS_LABELS[p.status as string] || p.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(p.positivated_at || p.visits?.visited_at || p.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Closed follow-ups */}
      {closedFollowups.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              Histórico de follow-ups
              <Badge variant="outline" className="ml-auto text-xs">{closedFollowups.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {closedFollowups.map((f: any) => (
                <div key={f.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground line-through truncate">{f.content}</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {(f.brands as any)?.name && (
                        <span className="text-xs text-muted-foreground">{(f.brands as any).name}</span>
                      )}
                    </div>
                  </div>
                  <Badge
                    className={cn('text-xs border shrink-0', FOLLOWUP_STATUS_COLORS[f.status] || '')}
                    variant="outline"
                  >
                    {FOLLOWUP_STATUS_LABELS[f.status] || f.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action */}
      <div className="flex gap-3 pb-6">
        <Link href={`/admin/followups`} className="flex-1">
          <Button variant="outline" className="w-full">
            <MessageSquare className="h-4 w-4 mr-2" /> Ver todos os follow-ups
          </Button>
        </Link>
      </div>
    </div>
  )
}

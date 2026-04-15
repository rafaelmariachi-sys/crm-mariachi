import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarRange, MapPin } from 'lucide-react'

export const dynamic = 'force-dynamic'

function getScheduleDays(startDate: Date, endDate: Date): Date[] {
  const days: Date[] = []
  const d = new Date(startDate)
  while (d <= endDate) {
    const dow = d.getDay()
    if (dow >= 1 && dow <= 4) days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function formatDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function dayName(d: Date) {
  return ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][d.getDay()]
}

function dayShort(d: Date) {
  return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.getDay()]
}

export default async function AgendaPage() {
  const supabase = createClient()

  // Busca bares em negociação ou com follow-up aberto
  const [{ data: negociacao }, { data: followupsAbertos }] = await Promise.all([
    supabase
      .from('positivations')
      .select('visits(venues(id, name, neighborhood, city))')
      .eq('status', 'negociacao'),
    supabase
      .from('followups')
      .select('visits(venues(id, name, neighborhood, city))')
      .eq('status', 'aberto'),
  ])

  // Deduplica por venue id, ordem alfabética
  const venueMap = new Map<string, { name: string; neighborhood: string; city: string }>()

  const addVenue = (v: any) => {
    if (!v?.id) return
    if (!venueMap.has(v.id)) venueMap.set(v.id, { name: v.name, neighborhood: v.neighborhood || '', city: v.city || '' })
  }

  negociacao?.forEach((p: any) => addVenue(p.visits?.venues))
  followupsAbertos?.forEach((f: any) => addVenue(f.visits?.venues))

  const venues = Array.from(venueMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  // Gera dias úteis (seg-qui) de hoje até 31/05
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endMay = new Date(today.getFullYear(), 4, 31) // maio = mês 4

  const scheduleDays = getScheduleDays(today, endMay)

  // Distribui 8 bares por dia
  const BARS_PER_DAY = 8
  const schedule: { date: Date; venues: typeof venues }[] = []
  let idx = 0
  for (const day of scheduleDays) {
    if (idx >= venues.length) break
    schedule.push({ date: day, venues: venues.slice(idx, idx + BARS_PER_DAY) })
    idx += BARS_PER_DAY
  }

  const remaining = venues.length - idx

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Agenda de Retornos</h1>
        <p className="text-muted-foreground text-sm">
          {venues.length} casas · {schedule.length} dias · 8 visitas/dia · Seg a Qui
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{venues.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Casas a visitar</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{schedule.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Dias de agenda</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{schedule.length > 0 ? formatDate(schedule[schedule.length - 1].date) : '—'}</p>
          <p className="text-xs text-muted-foreground mt-1">Último dia</p>
        </div>
      </div>

      {remaining > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          ⚠️ {remaining} casas não cabem até 31/05 com 8 visitas/dia de seg a qui.
        </div>
      )}

      {/* Cronograma */}
      <div className="space-y-4">
        {schedule.map(({ date, venues: dayVenues }) => (
          <Card key={date.toISOString()}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CalendarRange className="h-4 w-4 text-primary" />
                  {formatDate(date)}
                  <span className="text-muted-foreground font-normal">— {dayName(date)}</span>
                </CardTitle>
                <Badge variant="outline" className="text-xs">{dayVenues.length} casas</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {dayVenues.map((v, i) => (
                  <div key={v.name + i} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40">
                    <span className="text-xs text-muted-foreground w-4 shrink-0 mt-0.5">{String(i + 1)}.</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">{v.name}</p>
                      {(v.neighborhood || v.city) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-2.5 w-2.5" />
                          {[v.neighborhood, v.city].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

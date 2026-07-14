'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageSquare, Loader2, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Followup, FollowupStatus, FOLLOWUP_STATUS_LABELS, FOLLOWUP_STATUS_COLORS, Brand } from '@/lib/types'
import { formatDate, getDueDateLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function FollowupsPage() {
  const [followups, setFollowups] = useState<Followup[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [filterBrand, setFilterBrand] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [venueSearch, setVenueSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const [{ data: f }, { data: b }, { data: { user } }] = await Promise.all([
      supabase
        .from('followups')
        .select('*, brands(name), visits(venue_id, venues(name, city))')
        .order('due_date', { ascending: true, nullsFirst: false }),
      supabase.from('brands').select('*').order('name'),
      supabase.auth.getUser(),
    ])
    setFollowups((f as any[]) || [])
    setBrands(b || [])
    setCurrentUserId(user?.id || null)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function updateStatus(id: string, status: FollowupStatus) {
    const followup = followups.find((f) => f.id === id)
    if (!followup || (followup as any).created_by !== currentUserId) {
      toast({ title: 'Sem permissão', description: 'Você não pode editar registros de outro colaborador.', variant: 'destructive' })
      return
    }
    setUpdatingId(id)
    const { error } = await supabase.from('followups').update({ status }).eq('id', id)
    if (error) toast({ title: 'Erro ao atualizar status', variant: 'destructive' })
    else { toast({ title: 'Status atualizado!' }); load() }
    setUpdatingId(null)
  }

  const venueQ = venueSearch.toLowerCase().trim()
  const filtered = followups.filter((f) => {
    const matchBrand = filterBrand === 'all' || (f as any).brands?.name === filterBrand
    const matchStatus = filterStatus === 'all' || f.status === filterStatus
    const matchVenue = !venueQ || (
      ((f as any).visits?.venues?.name || '').toLowerCase().includes(venueQ) ||
      ((f as any).visits?.venues?.city || '').toLowerCase().includes(venueQ)
    )
    return matchBrand && matchStatus && matchVenue
  })

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Follow-ups</h1>
        <p className="text-muted-foreground text-sm">{filtered.length} registros</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterBrand} onValueChange={setFilterBrand}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Marca" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as marcas</SelectItem>
            {brands.map((b) => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {(Object.entries(FOLLOWUP_STATUS_LABELS) as [FollowupStatus, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar estabelecimento..."
            value={venueSearch}
            onChange={(e) => setVenueSearch(e.target.value)}
            className="pl-9 pr-9 h-10"
          />
          {venueSearch && (
            <button
              onClick={() => setVenueSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum follow-up encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((f: any) => {
            const { label, urgent } = getDueDateLabel(f.due_date)
            return (
              <Card key={f.id} className={cn('', f.status === 'aberto' && urgent && 'border-red-500/30')}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{f.content}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>{f.brands?.name}</span>
                        <span>·</span>
                        <Link href={`/admin/visits/${f.visit_id}`} className="hover:text-primary transition-colors">
                          {f.visits?.venues?.name}, {f.visits?.venues?.city}
                        </Link>
                        {f.due_date && (
                          <>
                            <span>·</span>
                            <span className={cn(urgent && f.status === 'aberto' ? 'text-red-400' : '')}>{label}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Select
                        value={f.status}
                        onValueChange={(v) => updateStatus(f.id, v as FollowupStatus)}
                        disabled={updatingId === f.id || f.created_by !== currentUserId}
                      >
                        <SelectTrigger className={cn('h-8 text-xs border', FOLLOWUP_STATUS_COLORS[f.status as FollowupStatus])}>
                          {updatingId === f.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.entries(FOLLOWUP_STATUS_LABELS) as [FollowupStatus, string][]).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

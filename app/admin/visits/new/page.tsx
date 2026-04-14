'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Plus, X, Loader2, ArrowLeft } from 'lucide-react'
import { POSITIVATION_STATUS_LABELS, FOLLOWUP_STATUS_LABELS, Brand, Venue, PositivationStatus, FollowupStatus } from '@/lib/types'
import Link from 'next/link'
import { format } from 'date-fns'

type PositivationForm = { brand_id: string; product_name: string; status: PositivationStatus; notes: string }
type FollowupForm = { brand_id: string; content: string; due_date: string; status: FollowupStatus }

export default function NewVisitPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [brands, setBrands] = useState<Brand[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [saving, setSaving] = useState(false)
  const [venueSearch, setVenueSearch] = useState('')

  const [venueId, setVenueId] = useState('')
  const [visitedAt, setVisitedAt] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')

  const [positivations, setPositivations] = useState<PositivationForm[]>([])
  const [followups, setFollowups] = useState<FollowupForm[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('brands').select('*').order('name'),
      supabase.from('venues').select('*').order('name'),
    ]).then(([{ data: b }, { data: v }]) => {
      setBrands(b || [])
      setVenues(v || [])
    })
  }, [])

  function addPositivation() {
    setPositivations([...positivations, { brand_id: '', product_name: '', status: 'positivado', notes: '' }])
  }

  function removePositivation(i: number) {
    setPositivations(positivations.filter((_, idx) => idx !== i))
  }

  function updatePositivation(i: number, field: keyof PositivationForm, value: string) {
    const updated = [...positivations]
    updated[i] = { ...updated[i], [field]: value }
    setPositivations(updated)
  }

  function addFollowup() {
    setFollowups([...followups, { brand_id: '', content: '', due_date: '', status: 'aberto' }])
  }

  function removeFollowup(i: number) {
    setFollowups(followups.filter((_, idx) => idx !== i))
  }

  function updateFollowup(i: number, field: keyof FollowupForm, value: string) {
    const updated = [...followups]
    updated[i] = { ...updated[i], [field]: value }
    setFollowups(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!venueId || !visitedAt) {
      toast({ title: 'Selecione a casa e a data', variant: 'destructive' })
      return
    }

    for (const p of positivations) {
      if (!p.brand_id || !p.product_name) {
        toast({ title: 'Preencha todas as positivações', variant: 'destructive' })
        return
      }
    }

    for (const f of followups) {
      if (!f.brand_id || !f.content) {
        toast({ title: 'Preencha todos os follow-ups', variant: 'destructive' })
        return
      }
    }

    setSaving(true)

    // Create visit
    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .insert({ venue_id: venueId, visited_at: visitedAt, notes })
      .select()
      .single()

    if (visitError) {
      toast({ title: 'Erro ao criar visita', description: visitError.message, variant: 'destructive' })
      setSaving(false)
      return
    }

    // Create positivations
    if (positivations.length > 0) {
      const { error } = await supabase.from('positivations').insert(
        positivations.map((p) => ({ ...p, visit_id: visit.id }))
      )
      if (error) toast({ title: 'Erro nas positivações', description: error.message, variant: 'destructive' })
    }

    // Create followups
    if (followups.length > 0) {
      const { error } = await supabase.from('followups').insert(
        followups.map((f) => ({ ...f, visit_id: visit.id, due_date: f.due_date || null }))
      )
      if (error) toast({ title: 'Erro nos follow-ups', description: error.message, variant: 'destructive' })
    }

    toast({ title: 'Visita registrada com sucesso!' })
    router.push(`/admin/visits/${visit.id}`)
  }

  const filteredVenues = venues.filter((v) =>
    v.name.toLowerCase().includes(venueSearch.toLowerCase()) ||
    v.city.toLowerCase().includes(venueSearch.toLowerCase())
  )

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/visits">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nova visita</h1>
          <p className="text-muted-foreground text-sm">Registre uma visita a um estabelecimento</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Visit base */}
        <Card>
          <CardHeader><CardTitle className="text-base">Informações da visita</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Buscar casa *</Label>
              <Input
                placeholder="Digite para buscar..."
                value={venueSearch}
                onChange={(e) => setVenueSearch(e.target.value)}
              />
              {venueSearch && !venueId && (
                <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  {filteredVenues.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">Nenhuma casa encontrada</p>
                  ) : (
                    filteredVenues.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => { setVenueId(v.id); setVenueSearch(`${v.name} – ${v.city}`) }}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-b-0"
                      >
                        <span className="font-medium">{v.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{v.neighborhood} · {v.city}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
              {venueId && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setVenueId(''); setVenueSearch('') }}>
                  <X className="h-3 w-3 mr-1" /> Limpar seleção
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label>Data da visita *</Label>
              <Input type="date" value={visitedAt} onChange={(e) => setVisitedAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notas gerais</Label>
              <Textarea placeholder="Observações gerais sobre a visita..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>

        {/* Positivations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Positivações ({positivations.length})</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addPositivation}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {positivations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">Nenhuma positivação adicionada</p>
            )}
            {positivations.map((p, i) => (
              <div key={i} className="p-4 border rounded-lg space-y-3 relative">
                <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2 h-7 w-7" onClick={() => removePositivation(i)}>
                  <X className="h-3 w-3" />
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Marca *</Label>
                    <Select value={p.brand_id} onValueChange={(v) => updatePositivation(i, 'brand_id', v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status *</Label>
                    <Select value={p.status} onValueChange={(v) => updatePositivation(i, 'status', v as PositivationStatus)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.entries(POSITIVATION_STATUS_LABELS) as [PositivationStatus, string][]).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Produto *</Label>
                  <Input placeholder="Ex: Johnnie Walker Red" value={p.product_name} onChange={(e) => updatePositivation(i, 'product_name', e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notas</Label>
                  <Input placeholder="Observações..." value={p.notes} onChange={(e) => updatePositivation(i, 'notes', e.target.value)} className="h-9" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Follow-ups */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Follow-ups ({followups.length})</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addFollowup}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {followups.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">Nenhum follow-up adicionado</p>
            )}
            {followups.map((f, i) => (
              <div key={i} className="p-4 border rounded-lg space-y-3 relative">
                <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2 h-7 w-7" onClick={() => removeFollowup(i)}>
                  <X className="h-3 w-3" />
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Marca *</Label>
                    <Select value={f.brand_id} onValueChange={(v) => updateFollowup(i, 'brand_id', v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data de retorno</Label>
                    <Input type="date" value={f.due_date} onChange={(e) => updateFollowup(i, 'due_date', e.target.value)} className="h-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Conteúdo / compromisso *</Label>
                  <Textarea placeholder="Descreva o combinado..." value={f.content} onChange={(e) => updateFollowup(i, 'content', e.target.value)} rows={2} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/admin/visits"><Button variant="outline" type="button">Cancelar</Button></Link>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar visita
          </Button>
        </div>
      </form>
    </div>
  )
}

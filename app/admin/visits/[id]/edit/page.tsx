'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Plus, X, Loader2, ArrowLeft, Trash2 } from 'lucide-react'
import { POSITIVATION_STATUS_LABELS, FOLLOWUP_STATUS_LABELS, Brand, PositivationStatus, FollowupStatus } from '@/lib/types'
import Link from 'next/link'

type PositivationForm = { id?: string; brand_id: string; product_name: string; status: PositivationStatus; notes: string; _delete?: boolean }
type FollowupForm = { id?: string; brand_id: string; content: string; due_date: string; status: FollowupStatus; _delete?: boolean }

export default function EditVisitPage() {
  const router = useRouter()
  const params = useParams()
  const visitId = params.id as string
  const { toast } = useToast()
  const supabase = createClient()

  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [venueName, setVenueName] = useState('')
  const [visitedAt, setVisitedAt] = useState('')
  const [notes, setNotes] = useState('')
  const [positivations, setPositivations] = useState<PositivationForm[]>([])
  const [followups, setFollowups] = useState<FollowupForm[]>([])

  useEffect(() => {
    async function load() {
      const [{ data: b }, { data: visit }] = await Promise.all([
        supabase.from('brands').select('*').order('name'),
        supabase.from('visits').select(`
          id, visited_at, notes,
          venues(name),
          positivations(id, brand_id, product_name, status, notes),
          followups(id, brand_id, content, due_date, status)
        `).eq('id', visitId).single(),
      ])

      setBrands(b || [])
      if (visit) {
        const v = visit as any
        setVenueName(v.venues?.name || '')
        setVisitedAt(v.visited_at || '')
        setNotes(v.notes || '')
        setPositivations((v.positivations || []).map((p: any) => ({
          id: p.id, brand_id: p.brand_id, product_name: p.product_name,
          status: p.status, notes: p.notes || '',
        })))
        setFollowups((v.followups || []).map((f: any) => ({
          id: f.id, brand_id: f.brand_id, content: f.content,
          due_date: f.due_date || '', status: f.status,
        })))
      }
      setLoading(false)
    }
    load()
  }, [visitId])

  function addPositivation() {
    setPositivations([...positivations, { brand_id: '', product_name: '', status: 'positivado', notes: '' }])
  }
  function removePositivation(i: number) {
    const updated = [...positivations]
    if (updated[i].id) {
      updated[i] = { ...updated[i], _delete: true }
      setPositivations(updated)
    } else {
      setPositivations(positivations.filter((_, idx) => idx !== i))
    }
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
    const updated = [...followups]
    if (updated[i].id) {
      updated[i] = { ...updated[i], _delete: true }
      setFollowups(updated)
    } else {
      setFollowups(followups.filter((_, idx) => idx !== i))
    }
  }
  function updateFollowup(i: number, field: keyof FollowupForm, value: string) {
    const updated = [...followups]
    updated[i] = { ...updated[i], [field]: value }
    setFollowups(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    // Update visit
    const { error: visitError } = await supabase
      .from('visits')
      .update({ visited_at: visitedAt, notes })
      .eq('id', visitId)

    if (visitError) {
      toast({ title: 'Erro ao salvar visita', variant: 'destructive' })
      setSaving(false)
      return
    }

    // Handle positivations
    const toDeletePos = positivations.filter((p) => p._delete && p.id).map((p) => p.id!)
    const toUpdatePos = positivations.filter((p) => p.id && !p._delete)
    const toInsertPos = positivations.filter((p) => !p.id && !p._delete)

    if (toDeletePos.length > 0) await supabase.from('positivations').delete().in('id', toDeletePos)
    for (const p of toUpdatePos) {
      await supabase.from('positivations').update({
        brand_id: p.brand_id, product_name: p.product_name, status: p.status, notes: p.notes
      }).eq('id', p.id!)
    }
    if (toInsertPos.length > 0) {
      await supabase.from('positivations').insert(
        toInsertPos.map((p) => ({ brand_id: p.brand_id, product_name: p.product_name, status: p.status, notes: p.notes, visit_id: visitId }))
      )
    }

    // Handle followups
    const toDeleteFol = followups.filter((f) => f._delete && f.id).map((f) => f.id!)
    const toUpdateFol = followups.filter((f) => f.id && !f._delete)
    const toInsertFol = followups.filter((f) => !f.id && !f._delete)

    if (toDeleteFol.length > 0) await supabase.from('followups').delete().in('id', toDeleteFol)
    for (const f of toUpdateFol) {
      await supabase.from('followups').update({
        brand_id: f.brand_id, content: f.content, due_date: f.due_date || null, status: f.status
      }).eq('id', f.id!)
    }
    if (toInsertFol.length > 0) {
      await supabase.from('followups').insert(
        toInsertFol.map((f) => ({ brand_id: f.brand_id, content: f.content, due_date: f.due_date || null, status: f.status, visit_id: visitId }))
      )
    }

    toast({ title: 'Visita atualizada!' })
    router.push(`/admin/visits/${visitId}`)
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  const activePositivations = positivations.filter((p) => !p._delete)
  const activeFollowups = followups.filter((f) => !f._delete)

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/admin/visits/${visitId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Editar visita</h1>
          <p className="text-muted-foreground text-sm">{venueName}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Visit info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Informações da visita</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/40 text-sm">
              <span className="text-muted-foreground">Estabelecimento: </span>
              <span className="font-medium">{venueName}</span>
            </div>
            <div className="space-y-2">
              <Label>Data da visita</Label>
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
              <CardTitle className="text-base">Positivações ({activePositivations.length})</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addPositivation}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {activePositivations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">Nenhuma positivação nesta visita</p>
            )}
            {positivations.map((p, i) => p._delete ? null : (
              <div key={i} className="p-4 border rounded-lg space-y-3 relative">
                <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2 h-7 w-7 text-destructive hover:text-destructive" onClick={() => removePositivation(i)}>
                  <Trash2 className="h-3 w-3" />
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
                    <Label className="text-xs">Status</Label>
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
                  <Label className="text-xs">Produto</Label>
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
              <CardTitle className="text-base">Follow-ups ({activeFollowups.length})</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addFollowup}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeFollowups.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">Nenhum follow-up nesta visita</p>
            )}
            {followups.map((f, i) => f._delete ? null : (
              <div key={i} className="p-4 border rounded-lg space-y-3 relative">
                <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2 h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeFollowup(i)}>
                  <Trash2 className="h-3 w-3" />
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
                    <Label className="text-xs">Status</Label>
                    <Select value={f.status} onValueChange={(v) => updateFollowup(i, 'status', v as FollowupStatus)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.entries(FOLLOWUP_STATUS_LABELS) as [FollowupStatus, string][]).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data de retorno</Label>
                  <Input type="date" value={f.due_date} onChange={(e) => updateFollowup(i, 'due_date', e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Conteúdo / compromisso</Label>
                  <Textarea placeholder="Descreva o combinado..." value={f.content} onChange={(e) => updateFollowup(i, 'content', e.target.value)} rows={2} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end pb-6">
          <Link href={`/admin/visits/${visitId}`}>
            <Button variant="outline" type="button">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar alterações
          </Button>
        </div>
      </form>
    </div>
  )
}

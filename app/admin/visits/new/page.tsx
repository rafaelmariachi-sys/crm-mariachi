'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Plus, X, Loader2, ArrowLeft, MapPin } from 'lucide-react'
import { POSITIVATION_STATUS_LABELS, FOLLOWUP_STATUS_LABELS, Brand, Venue, PositivationStatus, FollowupStatus, VENUE_TYPES } from '@/lib/types'
import Link from 'next/link'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

type PositivationForm = { brand_id: string; product_name: string; status: PositivationStatus; notes: string }
type FollowupForm = { brand_id: string; content: string; due_date: string; status: FollowupStatus }

const emptyNewVenue = { type: '', address: '', neighborhood: '', city: '', phone: '', contact_name: '' }

export default function NewVisitPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [brands, setBrands] = useState<Brand[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [brandSkus, setBrandSkus] = useState<Record<string, { id: string; name: string }[]>>({})
  const [saving, setSaving] = useState(false)
  const [venueSearch, setVenueSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const [venueId, setVenueId] = useState('')
  const [visitedAt, setVisitedAt] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')

  // Inline new venue form
  const [showNewVenueForm, setShowNewVenueForm] = useState(false)
  const [newVenueForm, setNewVenueForm] = useState(emptyNewVenue)
  const [savingVenue, setSavingVenue] = useState(false)

  const [positivations, setPositivations] = useState<PositivationForm[]>([])
  const [followups, setFollowups] = useState<FollowupForm[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('brands').select('*').order('name'),
      supabase.from('venues').select('*').order('name'),
      supabase.from('brand_skus').select('*').eq('active', true).order('display_order'),
    ]).then(([{ data: b }, { data: v }, { data: s }]) => {
      setBrands(b || [])
      setVenues(v || [])
      const skuMap: Record<string, { id: string; name: string }[]> = {}
      ;(s || []).forEach((sku: any) => {
        if (!skuMap[sku.brand_id]) skuMap[sku.brand_id] = []
        skuMap[sku.brand_id].push({ id: sku.id, name: sku.name })
      })
      setBrandSkus(skuMap)
    })
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredVenues = venues.filter((v) =>
    v.name.toLowerCase().includes(venueSearch.toLowerCase()) ||
    (v.city || '').toLowerCase().includes(venueSearch.toLowerCase())
  )

  function selectVenue(v: Venue) {
    setVenueId(v.id)
    setVenueSearch(v.name + (v.city ? ` – ${v.city}` : ''))
    setShowDropdown(false)
    setShowNewVenueForm(false)
  }

  function clearVenue() {
    setVenueId('')
    setVenueSearch('')
    setShowDropdown(false)
    setShowNewVenueForm(false)
  }

  function openNewVenueForm() {
    setShowNewVenueForm(true)
    setShowDropdown(false)
    setNewVenueForm(emptyNewVenue)
  }

  async function handleCreateVenue() {
    if (!venueSearch.trim()) return
    setSavingVenue(true)
    const { data, error } = await supabase
      .from('venues')
      .insert({
        name: venueSearch.trim(),
        type: newVenueForm.type || null,
        address: newVenueForm.address || null,
        neighborhood: newVenueForm.neighborhood || null,
        city: newVenueForm.city || null,
        phone: newVenueForm.phone || null,
        contact_name: newVenueForm.contact_name || null,
      })
      .select()
      .single()

    if (error) {
      toast({ title: 'Erro ao cadastrar bar', description: error.message, variant: 'destructive' })
    } else {
      setVenues((prev) => [...prev, data])
      selectVenue(data)
      toast({ title: `"${data.name}" cadastrado!` })
    }
    setSavingVenue(false)
  }

  function addPositivation() {
    setPositivations([...positivations, { brand_id: '', product_name: '', status: 'positivado', notes: '' }])
  }
  function removePositivation(i: number) { setPositivations(positivations.filter((_, idx) => idx !== i)) }
  function updatePositivation(i: number, field: keyof PositivationForm, value: string) {
    const updated = [...positivations]
    updated[i] = { ...updated[i], [field]: value }
    if (field === 'brand_id') updated[i].product_name = ''
    setPositivations(updated)
  }

  function addFollowup() {
    setFollowups([...followups, { brand_id: '', content: '', due_date: '', status: 'aberto' }])
  }
  function removeFollowup(i: number) { setFollowups(followups.filter((_, idx) => idx !== i)) }
  function updateFollowup(i: number, field: keyof FollowupForm, value: string) {
    const updated = [...followups]; updated[i] = { ...updated[i], [field]: value }; setFollowups(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!venueId || !visitedAt) {
      toast({ title: 'Selecione a casa e a data', variant: 'destructive' })
      return
    }
    for (const p of positivations) {
      if (!p.brand_id || !p.product_name) {
        toast({ title: 'Preencha todas as positivações', variant: 'destructive' }); return
      }
    }
    for (const f of followups) {
      if (!f.content) {
        toast({ title: 'Preencha o conteúdo dos follow-ups', variant: 'destructive' }); return
      }
    }
    setSaving(true)

    const { data: visit, error: visitError } = await supabase
      .from('visits').insert({ venue_id: venueId, visited_at: visitedAt, notes }).select().single()

    if (visitError) {
      toast({ title: 'Erro ao criar visita', description: visitError.message, variant: 'destructive' })
      setSaving(false); return
    }

    if (positivations.length > 0) {
      await supabase.from('positivations').insert(positivations.map((p) => ({ ...p, visit_id: visit.id })))
    }
    if (followups.length > 0) {
      await supabase.from('followups').insert(followups.map((f) => ({
        ...f,
        brand_id: f.brand_id === 'all' ? null : f.brand_id || null,
        visit_id: visit.id,
        due_date: f.due_date || null,
      })))
    }

    toast({ title: 'Visita registrada com sucesso!' })
    router.push(`/admin/visits/${visit.id}`)
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
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
        <Card>
          <CardHeader><CardTitle className="text-base">Informações da visita</CardTitle></CardHeader>
          <CardContent className="space-y-4">

            {/* Venue search */}
            <div className="space-y-2">
              <Label>Bar / Estabelecimento *</Label>
              <div className="relative" ref={dropdownRef}>
                <Input
                  placeholder="Digite o nome do bar..."
                  value={venueSearch}
                  onChange={(e) => {
                    setVenueSearch(e.target.value)
                    setVenueId('')
                    setShowDropdown(true)
                    setShowNewVenueForm(false)
                  }}
                  onFocus={() => { if (!venueId) setShowDropdown(true) }}
                  className={cn(venueId && 'border-primary/50 bg-primary/5')}
                />

                {/* Dropdown */}
                {showDropdown && venueSearch && !venueId && (
                  <div className="absolute z-50 w-full mt-1 border rounded-lg bg-card shadow-lg max-h-56 overflow-y-auto">
                    {filteredVenues.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => selectVenue(v)}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted text-sm border-b last:border-b-0 flex items-center gap-2"
                      >
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>
                          <span className="font-medium">{v.name}</span>
                          {(v.neighborhood || v.city) && (
                            <span className="text-muted-foreground text-xs ml-2">
                              {[v.neighborhood, v.city].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}

                    {/* Option to create new */}
                    <button
                      type="button"
                      onClick={openNewVenueForm}
                      className="w-full text-left px-3 py-2.5 hover:bg-primary/5 text-sm text-primary font-medium flex items-center gap-2 border-t"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0" />
                      Cadastrar "{venueSearch}" como novo bar
                    </button>
                  </div>
                )}
              </div>

              {/* Selected venue indicator */}
              {venueId && (
                <button type="button" onClick={clearVenue} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" /> Limpar seleção
                </button>
              )}
            </div>

            {/* Inline new venue form */}
            {showNewVenueForm && (
              <div className="border border-primary/30 rounded-lg p-4 bg-primary/5 space-y-3">
                <p className="text-sm font-semibold text-primary">Cadastrar novo bar</p>
                <p className="text-xs text-muted-foreground">Nome: <span className="font-medium text-foreground">"{venueSearch}"</span> — preencha o restante se quiser (tudo opcional)</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={newVenueForm.type} onValueChange={(v) => setNewVenueForm({ ...newVenueForm, type: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
                      <SelectContent>
                        {VENUE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Bairro</Label>
                    <Input className="h-9" placeholder="Bairro" value={newVenueForm.neighborhood} onChange={(e) => setNewVenueForm({ ...newVenueForm, neighborhood: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cidade</Label>
                    <Input className="h-9" placeholder="Cidade" value={newVenueForm.city} onChange={(e) => setNewVenueForm({ ...newVenueForm, city: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Telefone</Label>
                    <Input className="h-9" placeholder="(11) 99999-9999" value={newVenueForm.phone} onChange={(e) => setNewVenueForm({ ...newVenueForm, phone: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Nome do contato</Label>
                  <Input className="h-9" placeholder="Ex: João (gerente)" value={newVenueForm.contact_name} onChange={(e) => setNewVenueForm({ ...newVenueForm, contact_name: e.target.value })} />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button type="button" size="sm" onClick={handleCreateVenue} disabled={savingVenue}>
                    {savingVenue ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                    Cadastrar e selecionar
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewVenueForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

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
                  <Label className="text-xs">Produto / SKU *</Label>
                  {p.brand_id && brandSkus[p.brand_id]?.length > 0 ? (
                    <Select value={p.product_name} onValueChange={(v) => updatePositivation(i, 'product_name', v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar SKU" /></SelectTrigger>
                      <SelectContent>
                        {brandSkus[p.brand_id].map((sku) => (
                          <SelectItem key={sku.id} value={sku.name}>{sku.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input placeholder="Ex: Produto X" value={p.product_name} onChange={(e) => updatePositivation(i, 'product_name', e.target.value)} className="h-9" />
                  )}
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
                    <Label className="text-xs">Marca</Label>
                    <Select value={f.brand_id} onValueChange={(v) => updateFollowup(i, 'brand_id', v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">🌐 Todas as marcas</SelectItem>
                        {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
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

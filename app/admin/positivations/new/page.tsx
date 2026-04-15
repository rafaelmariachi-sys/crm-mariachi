'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Plus, X, Loader2, ArrowLeft, MapPin, Package } from 'lucide-react'
import { POSITIVATION_STATUS_LABELS, Brand, Venue, PositivationStatus, VENUE_TYPES } from '@/lib/types'
import Link from 'next/link'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

type PositivationRow = {
  brand_id: string
  product_name: string
  status: PositivationStatus
  notes: string
}

const emptyNewVenue = { type: '', address: '', neighborhood: '', city: '', phone: '', contact_name: '' }

export default function NewPositivationPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [brands, setBrands] = useState<Brand[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [brandSkus, setBrandSkus] = useState<Record<string, { id: string; name: string }[]>>({})
  const [saving, setSaving] = useState(false)

  // Venue selection
  const [venueSearch, setVenueSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [venueId, setVenueId] = useState('')
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null)

  // New venue inline form
  const [showNewVenueForm, setShowNewVenueForm] = useState(false)
  const [newVenueForm, setNewVenueForm] = useState(emptyNewVenue)
  const [savingVenue, setSavingVenue] = useState(false)

  // Date
  const [positivatedAt, setPositivatedAt] = useState(format(new Date(), 'yyyy-MM-dd'))

  // Positivation rows
  const [rows, setRows] = useState<PositivationRow[]>([
    { brand_id: '', product_name: '', status: 'positivado', notes: '' },
  ])

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
    (v.city || '').toLowerCase().includes(venueSearch.toLowerCase()) ||
    (v.neighborhood || '').toLowerCase().includes(venueSearch.toLowerCase())
  )

  function selectVenue(v: Venue) {
    setVenueId(v.id)
    setSelectedVenue(v)
    setVenueSearch(v.name + (v.city ? ` – ${v.city}` : ''))
    setShowDropdown(false)
    setShowNewVenueForm(false)
  }

  function clearVenue() {
    setVenueId('')
    setSelectedVenue(null)
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
      toast({ title: 'Erro ao cadastrar estabelecimento', description: error.message, variant: 'destructive' })
    } else {
      setVenues((prev) => [...prev, data])
      selectVenue(data)
      toast({ title: `"${data.name}" cadastrado!` })
    }
    setSavingVenue(false)
  }

  // Row management
  function addRow() {
    setRows([...rows, { brand_id: '', product_name: '', status: 'positivado', notes: '' }])
  }
  function removeRow(i: number) {
    setRows(rows.filter((_, idx) => idx !== i))
  }
  function updateRow(i: number, field: keyof PositivationRow, value: string) {
    const updated = [...rows]
    updated[i] = { ...updated[i], [field]: value }
    if (field === 'brand_id') updated[i].product_name = ''
    setRows(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!venueId) {
      toast({ title: 'Selecione um estabelecimento', variant: 'destructive' }); return
    }
    if (rows.length === 0) {
      toast({ title: 'Adicione pelo menos uma positivação', variant: 'destructive' }); return
    }
    for (const r of rows) {
      if (!r.brand_id || !r.product_name) {
        toast({ title: 'Preencha marca e SKU em todas as linhas', variant: 'destructive' }); return
      }
    }

    setSaving(true)

    const inserts = rows.map((r) => ({
      venue_id: venueId,
      positivated_at: positivatedAt,
      brand_id: r.brand_id,
      product_name: r.product_name,
      status: r.status,
      notes: r.notes || null,
    }))

    const { error } = await supabase.from('positivations').insert(inserts)

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
      setSaving(false); return
    }

    toast({ title: `${inserts.length} positivação${inserts.length !== 1 ? 'ões' : ''} registrada${inserts.length !== 1 ? 's' : ''}!` })
    router.push('/admin/positivations')
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/positivations">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nova Positivação</h1>
          <p className="text-muted-foreground text-sm">Registre produtos positivados em um estabelecimento</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Venue + Date */}
        <Card>
          <CardHeader><CardTitle className="text-base">Estabelecimento</CardTitle></CardHeader>
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
                    setSelectedVenue(null)
                    setShowDropdown(true)
                    setShowNewVenueForm(false)
                  }}
                  onFocus={() => { if (!venueId) setShowDropdown(true) }}
                  className={cn(venueId && 'border-primary/50 bg-primary/5')}
                />

                {showDropdown && venueSearch && !venueId && (
                  <div className="absolute z-50 w-full mt-1 border rounded-lg bg-card shadow-lg max-h-64 overflow-y-auto">
                    {filteredVenues.length === 0 && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum resultado</p>
                    )}
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
                    <button
                      type="button"
                      onClick={openNewVenueForm}
                      className="w-full text-left px-3 py-2.5 hover:bg-primary/5 text-sm text-primary font-medium flex items-center gap-2 border-t"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0" />
                      Cadastrar "{venueSearch}" como novo estabelecimento
                    </button>
                  </div>
                )}
              </div>

              {venueId && selectedVenue && (
                <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{selectedVenue.name}</p>
                      {(selectedVenue.neighborhood || selectedVenue.city) && (
                        <p className="text-xs text-muted-foreground">
                          {[selectedVenue.neighborhood, selectedVenue.city].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <button type="button" onClick={clearVenue} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Inline new venue form */}
            {showNewVenueForm && (
              <div className="border border-primary/30 rounded-lg p-4 bg-primary/5 space-y-3">
                <p className="text-sm font-semibold text-primary">Cadastrar novo estabelecimento</p>
                <p className="text-xs text-muted-foreground">
                  Nome: <span className="font-medium text-foreground">"{venueSearch}"</span> — demais campos opcionais
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={newVenueForm.type} onValueChange={(v) => setNewVenueForm({ ...newVenueForm, type: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
                      <SelectContent>{VENUE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Bairro</Label>
                    <Input className="h-9" placeholder="Bairro" value={newVenueForm.neighborhood}
                      onChange={(e) => setNewVenueForm({ ...newVenueForm, neighborhood: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cidade</Label>
                    <Input className="h-9" placeholder="Cidade" value={newVenueForm.city}
                      onChange={(e) => setNewVenueForm({ ...newVenueForm, city: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Telefone</Label>
                    <Input className="h-9" placeholder="(11) 99999-9999" value={newVenueForm.phone}
                      onChange={(e) => setNewVenueForm({ ...newVenueForm, phone: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome do contato</Label>
                  <Input className="h-9" placeholder="Ex: João (gerente)" value={newVenueForm.contact_name}
                    onChange={(e) => setNewVenueForm({ ...newVenueForm, contact_name: e.target.value })} />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="button" size="sm" onClick={handleCreateVenue} disabled={savingVenue}>
                    {savingVenue ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                    Cadastrar e selecionar
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewVenueForm(false)}>Cancelar</Button>
                </div>
              </div>
            )}

            {/* Date */}
            <div className="space-y-2">
              <Label>Data da positivação *</Label>
              <Input type="date" value={positivatedAt} onChange={(e) => setPositivatedAt(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Positivation rows */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Produtos positivados ({rows.length})
              </CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar produto
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {rows.map((r, i) => (
              <div key={i} className="p-4 border rounded-lg space-y-3 relative bg-muted/20">
                {rows.length > 1 && (
                  <Button type="button" variant="ghost" size="icon"
                    className="absolute right-2 top-2 h-7 w-7"
                    onClick={() => removeRow(i)}>
                    <X className="h-3 w-3" />
                  </Button>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {/* Brand */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Marca *</Label>
                    <Select value={r.brand_id} onValueChange={(v) => updateRow(i, 'brand_id', v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status *</Label>
                    <Select value={r.status} onValueChange={(v) => updateRow(i, 'status', v as PositivationStatus)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.entries(POSITIVATION_STATUS_LABELS) as [PositivationStatus, string][]).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* SKU */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Produto / SKU *</Label>
                  {r.brand_id && brandSkus[r.brand_id]?.length > 0 ? (
                    <Select value={r.product_name} onValueChange={(v) => updateRow(i, 'product_name', v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar SKU" /></SelectTrigger>
                      <SelectContent>
                        {brandSkus[r.brand_id].map((sku) => (
                          <SelectItem key={sku.id} value={sku.name}>{sku.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder={r.brand_id ? 'Digitar produto...' : 'Selecione a marca primeiro'}
                      value={r.product_name}
                      onChange={(e) => updateRow(i, 'product_name', e.target.value)}
                      className="h-9"
                      disabled={!r.brand_id}
                    />
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Observações</Label>
                  <Input
                    placeholder="Ex: pedido feito, aguardando entrega..."
                    value={r.notes}
                    onChange={(e) => updateRow(i, 'notes', e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end pb-8">
          <Link href="/admin/positivations">
            <Button variant="outline" type="button">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Package className="h-4 w-4 mr-2" />}
            Salvar positivações
          </Button>
        </div>
      </form>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, MapPin, Pencil, Trash2, Loader2, Phone, Mail, Clock, Truck, User, Copy, Check, Building2 } from 'lucide-react'
import { Venue, VENUE_TYPES } from '@/lib/types'

const emptyForm = {
  name: '', address: '', neighborhood: '', city: '', type: '',
  contact_name: '', phone: '', email: '',
  business_hours: '', delivery_hours: '', delivery_day: '',
  cnpj: '', razao_social: '', notes: '',
}

function formatVenueText(venue: Venue): string {
  const lines: string[] = []
  lines.push(`🏠 *${venue.name}*`)
  if (venue.razao_social) lines.push(`Razão Social: ${venue.razao_social}`)
  if (venue.cnpj) lines.push(`CNPJ: ${venue.cnpj}`)
  lines.push(`Tipo: ${venue.type}`)
  if (venue.address) lines.push(`Endereço: ${venue.address}, ${venue.neighborhood} – ${venue.city}`)
  else lines.push(`Bairro: ${venue.neighborhood} – ${venue.city}`)
  if (venue.contact_name) lines.push(`\n👤 Contato: ${venue.contact_name}`)
  if (venue.phone) lines.push(`📞 Telefone: ${venue.phone}`)
  if (venue.email) lines.push(`✉️ E-mail: ${venue.email}`)
  if (venue.business_hours) lines.push(`\n🕐 Funcionamento: ${venue.business_hours}`)
  if (venue.delivery_day || venue.delivery_hours) {
    const delivery = [venue.delivery_day, venue.delivery_hours].filter(Boolean).join(' – ')
    lines.push(`🚚 Entrega: ${delivery}`)
  }
  if (venue.notes) lines.push(`\n📝 Obs: ${venue.notes}`)
  return lines.join('\n')
}

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null)
  const [saving, setSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const [form, setForm] = useState(emptyForm)

  async function loadVenues() {
    setLoading(true)
    const { data, error } = await supabase.from('venues').select('*').order('name')
    if (error) toast({ title: 'Erro ao carregar casas', variant: 'destructive' })
    else setVenues(data || [])
    setLoading(false)
  }

  useEffect(() => { loadVenues() }, [])

  function openNew() {
    setEditingVenue(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(venue: Venue) {
    setEditingVenue(venue)
    setForm({
      name: venue.name || '',
      address: venue.address || '',
      neighborhood: venue.neighborhood || '',
      city: venue.city || '',
      type: venue.type || '',
      contact_name: venue.contact_name || '',
      phone: venue.phone || '',
      email: venue.email || '',
      business_hours: venue.business_hours || '',
      delivery_hours: venue.delivery_hours || '',
      delivery_day: venue.delivery_day || '',
      cnpj: venue.cnpj || '',
      razao_social: venue.razao_social || '',
      notes: venue.notes || '',
    })
    setDialogOpen(true)
  }

  async function handleCopy(venue: Venue) {
    const text = formatVenueText(venue)
    await navigator.clipboard.writeText(text)
    setCopiedId(venue.id)
    toast({ title: 'Copiado!', description: 'Dados prontos para colar no WhatsApp ou e-mail.' })
    setTimeout(() => setCopiedId(null), 2500)
  }

  async function handleSave() {
    if (!form.name) {
      toast({ title: 'Informe o nome do estabelecimento', variant: 'destructive' })
      return
    }
    setSaving(true)

    const payload = {
      name: form.name,
      address: form.address || null,
      neighborhood: form.neighborhood,
      city: form.city,
      type: form.type,
      contact_name: form.contact_name || null,
      phone: form.phone || null,
      email: form.email || null,
      business_hours: form.business_hours || null,
      delivery_hours: form.delivery_hours || null,
      delivery_day: form.delivery_day || null,
      cnpj: form.cnpj || null,
      razao_social: form.razao_social || null,
      notes: form.notes || null,
    }

    if (editingVenue) {
      const { error } = await supabase.from('venues').update(payload).eq('id', editingVenue.id)
      if (error) toast({ title: 'Erro ao atualizar', variant: 'destructive' })
      else { toast({ title: 'Casa atualizada!' }); setDialogOpen(false); loadVenues() }
    } else {
      const { error } = await supabase.from('venues').insert(payload)
      if (error) toast({ title: 'Erro ao criar', variant: 'destructive' })
      else { toast({ title: 'Casa cadastrada!' }); setDialogOpen(false); loadVenues() }
    }
    setSaving(false)
  }

  async function handleDelete(venue: Venue) {
    if (!confirm(`Excluir "${venue.name}"? Todas as visitas associadas serão removidas.`)) return
    const { error } = await supabase.from('venues').delete().eq('id', venue.id)
    if (error) toast({ title: 'Erro ao excluir', variant: 'destructive' })
    else { toast({ title: 'Casa excluída' }); loadVenues() }
  }

  const filtered = venues.filter((v) => {
    const matchSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.city.toLowerCase().includes(search.toLowerCase()) ||
      v.neighborhood.toLowerCase().includes(search.toLowerCase()) ||
      (v.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (v.cnpj || '').includes(search) ||
      (v.razao_social || '').toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || v.type === filterType
    return matchSearch && matchType
  })

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Casas</h1>
          <p className="text-muted-foreground text-sm">{venues.length} estabelecimentos cadastrados</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nova casa
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, bairro, CNPJ ou contato..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {VENUE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Nenhuma casa encontrada</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((venue) => (
            <Card key={venue.id} className="group hover:border-primary/40 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{venue.name}</p>
                    {venue.razao_social && (
                      <p className="text-xs text-muted-foreground truncate">{venue.razao_social}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      <MapPin className="h-3 w-3 inline mr-1" />
                      {venue.neighborhood} · {venue.city}
                    </p>

                    <div className="mt-2 space-y-1">
                      {venue.contact_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3 shrink-0" />{venue.contact_name}
                        </p>
                      )}
                      {venue.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" />{venue.phone}
                        </p>
                      )}
                      {venue.email && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 shrink-0" />{venue.email}
                        </p>
                      )}
                      {venue.cnpj && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3 shrink-0" />{venue.cnpj}
                        </p>
                      )}
                      {venue.business_hours && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3 shrink-0" />{venue.business_hours}
                        </p>
                      )}
                      {(venue.delivery_day || venue.delivery_hours) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Truck className="h-3 w-3 shrink-0" />
                          {[venue.delivery_day, venue.delivery_hours].filter(Boolean).join(' – ')}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline" className="text-xs">{venue.type}</Badge>
                      <button
                        onClick={() => handleCopy(venue)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors ml-auto"
                        title="Copiar dados para compartilhar"
                      >
                        {copiedId === venue.id ? (
                          <><Check className="h-3 w-3 text-green-500" /><span className="text-green-500">Copiado!</span></>
                        ) : (
                          <><Copy className="h-3 w-3" />Copiar</>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(venue)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(venue)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVenue ? 'Editar casa' : 'Nova casa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">

            {/* Dados básicos */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Estabelecimento</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Nome *</Label>

                  <Input placeholder="Ex: Bar do Zé" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Razão Social</Label>
                  <Input placeholder="Ex: Bar do Zé Ltda" value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>CNPJ</Label>
                  <Input placeholder="00.000.000/0000-00" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>
                      {VENUE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Endereço</Label>
                  <Input placeholder="Rua, número" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Bairro</Label>
                    <Input placeholder="Bairro" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cidade</Label>
                    <Input placeholder="Cidade" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>

            {/* Contato */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contato</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Nome do contato</Label>
                  <Input placeholder="Ex: João (gerente)" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Telefone / WhatsApp</Label>
                    <Input placeholder="(11) 99999-9999" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>E-mail</Label>
                    <Input type="email" placeholder="contato@bar.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>

            {/* Horários */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Horários</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Funcionamento</Label>
                  <Input placeholder="Ex: Seg-Sex 11h-23h / Sáb 12h-00h" value={form.business_hours} onChange={(e) => setForm({ ...form, business_hours: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Dia de entrega</Label>
                    <Input placeholder="Ex: Terças e Quintas" value={form.delivery_day} onChange={(e) => setForm({ ...form, delivery_day: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Horário de entrega</Label>
                    <Input placeholder="Ex: 08h-12h" value={form.delivery_hours} onChange={(e) => setForm({ ...form, delivery_hours: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                placeholder="Informações adicionais sobre o estabelecimento..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingVenue ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

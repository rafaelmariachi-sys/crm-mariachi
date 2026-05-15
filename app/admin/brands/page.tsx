'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Package, Loader2, UserPlus, Pencil, Trash2, GripVertical } from 'lucide-react'
import { Brand } from '@/lib/types'

type Sku = { id: string; name: string; active: boolean; display_order: number }

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [brandDialogOpen, setBrandDialogOpen] = useState(false)
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [skuDialogOpen, setSkuDialogOpen] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const [brandForm, setBrandForm] = useState({ name: '', logo_url: '' })
  const [userForm, setUserForm] = useState({ email: '', password: '' })

  // SKU management
  const [skus, setSkus] = useState<Sku[]>([])
  const [skuLoading, setSkuLoading] = useState(false)
  const [newSkuName, setNewSkuName] = useState('')
  const [savingSku, setSavingSku] = useState(false)

  async function loadBrands() {
    setLoading(true)
    const { data } = await supabase.from('brands').select('*').order('name')
    setBrands(data || [])
    setLoading(false)
  }

  useEffect(() => { loadBrands() }, [])

  async function loadSkus(brandId: string) {
    setSkuLoading(true)
    const { data } = await supabase
      .from('brand_skus')
      .select('*')
      .eq('brand_id', brandId)
      .order('display_order')
    setSkus(data || [])
    setSkuLoading(false)
  }

  function openSkuDialog(brand: Brand) {
    setSelectedBrand(brand)
    setNewSkuName('')
    setSkuDialogOpen(true)
    loadSkus(brand.id)
  }

  async function handleAddSku() {
    if (!newSkuName.trim() || !selectedBrand) return
    setSavingSku(true)
    const maxOrder = skus.length > 0 ? Math.max(...skus.map((s) => s.display_order)) : 0
    const { data, error } = await supabase
      .from('brand_skus')
      .insert({ brand_id: selectedBrand.id, name: newSkuName.trim(), active: true, display_order: maxOrder + 1 })
      .select()
      .single()
    if (error) {
      toast({ title: 'Erro ao adicionar SKU', description: error.message, variant: 'destructive' })
    } else {
      setSkus((prev) => [...prev, data])
      setNewSkuName('')
      toast({ title: `"${data.name}" adicionado!` })
    }
    setSavingSku(false)
  }

  async function handleDeleteSku(sku: Sku) {
    if (!confirm(`Remover "${sku.name}"?`)) return
    const { error } = await supabase.from('brand_skus').delete().eq('id', sku.id)
    if (error) {
      toast({ title: 'Erro ao remover', variant: 'destructive' })
    } else {
      setSkus((prev) => prev.filter((s) => s.id !== sku.id))
    }
  }

  async function handleToggleSku(sku: Sku) {
    const { error } = await supabase.from('brand_skus').update({ active: !sku.active }).eq('id', sku.id)
    if (!error) setSkus((prev) => prev.map((s) => s.id === sku.id ? { ...s, active: !s.active } : s))
  }

  async function handleCreateBrand() {
    if (!brandForm.name) {
      toast({ title: 'Informe o nome da marca', variant: 'destructive' })
      return
    }
    setSaving(true)
    const { error } = await supabase.from('brands').insert({
      name: brandForm.name,
      logo_url: brandForm.logo_url || null,
    })
    if (error) toast({ title: 'Erro ao criar marca', description: error.message, variant: 'destructive' })
    else {
      toast({ title: 'Marca criada!' })
      setBrandDialogOpen(false)
      setBrandForm({ name: '', logo_url: '' })
      loadBrands()
    }
    setSaving(false)
  }

  async function handleCreateUser() {
    if (!userForm.email || !userForm.password || !selectedBrand) {
      toast({ title: 'Preencha email e senha', variant: 'destructive' })
      return
    }
    if (userForm.password.length < 6) {
      toast({ title: 'Senha deve ter ao menos 6 caracteres', variant: 'destructive' })
      return
    }
    setSaving(true)
    const res = await fetch('/api/admin/create-brand-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userForm.email, password: userForm.password, brand_id: selectedBrand.id }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: 'Erro ao criar usuário', description: data.error, variant: 'destructive' })
    } else {
      toast({ title: 'Usuário criado com sucesso!', description: `Acesso criado para ${selectedBrand.name}` })
      setUserDialogOpen(false)
      setUserForm({ email: '', password: '' })
    }
    setSaving(false)
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marcas</h1>
          <p className="text-muted-foreground text-sm">{brands.length} marcas cadastradas</p>
        </div>
        <Button onClick={() => setBrandDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Nova marca
        </Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      ) : brands.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Nenhuma marca cadastrada</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <Card key={brand.id}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  {brand.logo_url ? (
                    <img src={brand.logo_url} alt={brand.name} className="h-10 w-10 rounded-full object-cover border border-border" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold text-sm">{brand.name[0]}</span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{brand.name}</p>
                    <p className="text-xs text-muted-foreground">Marca cliente</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => openSkuDialog(brand)}>
                    <Package className="h-3 w-3 mr-2" />
                    Gerenciar SKUs
                  </Button>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => { setSelectedBrand(brand); setUserDialogOpen(true) }}>
                    <UserPlus className="h-3 w-3 mr-2" />
                    Criar acesso
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* SKU Dialog */}
      <Dialog open={skuDialogOpen} onOpenChange={setSkuDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>SKUs — {selectedBrand?.name}</DialogTitle>
            <DialogDescription>Produtos disponíveis para seleção ao registrar positivações.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Add new SKU */}
            <div className="flex gap-2">
              <Input
                placeholder="Nome do produto / SKU..."
                value={newSkuName}
                onChange={(e) => setNewSkuName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSku() } }}
                className="h-9"
              />
              <Button size="sm" onClick={handleAddSku} disabled={savingSku || !newSkuName.trim()} className="shrink-0">
                {savingSku ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              </Button>
            </div>

            {/* SKU list */}
            {skuLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-9 rounded-md" />)}
              </div>
            ) : skus.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum SKU cadastrado ainda.</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {skus.map((sku) => (
                  <div
                    key={sku.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md border ${
                      sku.active ? 'bg-background' : 'bg-muted/30 opacity-60'
                    }`}
                  >
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className={`text-sm flex-1 ${!sku.active ? 'line-through text-muted-foreground' : ''}`}>
                      {sku.name}
                    </span>
                    <button
                      onClick={() => handleToggleSku(sku)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
                      title={sku.active ? 'Desativar' : 'Ativar'}
                    >
                      {sku.active ? 'Ativo' : 'Inativo'}
                    </button>
                    <button
                      onClick={() => handleDeleteSku(sku)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="Remover SKU"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSkuDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Brand dialog */}
      <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova marca</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input placeholder="Ex: Diageo" value={brandForm.name} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>URL do logo</Label>
              <Input placeholder="https://..." value={brandForm.logo_url} onChange={(e) => setBrandForm({ ...brandForm, logo_url: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBrandDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateBrand} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Criar acesso — {selectedBrand?.name}</DialogTitle>
            <DialogDescription>O usuário criado terá acesso somente leitura aos dados desta marca.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" placeholder="marca@email.com" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Senha *</Label>
              <Input type="password" placeholder="Mínimo 6 caracteres" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateUser} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Criar acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

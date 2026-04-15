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
import { Plus, Package, Loader2, UserPlus } from 'lucide-react'
import { Brand } from '@/lib/types'

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [brandDialogOpen, setBrandDialogOpen] = useState(false)
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const [brandForm, setBrandForm] = useState({ name: '', logo_url: '' })
  const [userForm, setUserForm] = useState({ email: '', password: '' })

  async function loadBrands() {
    setLoading(true)
    const { data } = await supabase.from('brands').select('*').order('name')
    setBrands(data || [])
    setLoading(false)
  }

  useEffect(() => { loadBrands() }, [])

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
          <Plus className="h-4 w-4 mr-2" />
          Nova marca
        </Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
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
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
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
                </div>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => { setSelectedBrand(brand); setUserDialogOpen(true) }}
                  >
                    <UserPlus className="h-3 w-3 mr-2" />
                    Criar acesso
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Brand dialog */}
      <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova marca</DialogTitle>
          </DialogHeader>
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
            <DialogDescription>
              O usuário criado terá acesso somente leitura aos dados desta marca.
            </DialogDescription>
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

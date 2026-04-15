'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
  Upload, Trash2, Loader2, ImageIcon, FileText, X, ZoomIn, Download, Camera,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  { value: 'all', label: 'Todos' },
  { value: 'drink', label: '🍹 Drinks' },
  { value: 'cardapio', label: '📋 Cardápios' },
  { value: 'benchmark', label: '🔍 Benchmark' },
  { value: 'outro', label: 'Outros' },
]

const CATEGORY_LABELS: Record<string, string> = {
  drink: 'Drink',
  cardapio: 'Cardápio',
  benchmark: 'Benchmark',
  outro: 'Outro',
}

const CATEGORY_COLORS: Record<string, string> = {
  drink: 'bg-purple-500/15 text-purple-700 border-purple-200',
  cardapio: 'bg-blue-500/15 text-blue-700 border-blue-200',
  benchmark: 'bg-amber-500/15 text-amber-700 border-amber-200',
  outro: 'bg-gray-500/15 text-gray-600 border-gray-200',
}

interface MediaItem {
  id: string
  brand_id: string
  title: string | null
  category: string
  storage_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  created_at: string
  brands: { name: string }
  signedUrl?: string
}

export default function AdminMediaPage() {
  const supabase = createClient()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [brands, setBrands] = useState<{ id: string; name: string }[]>([])
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState('all')
  const [brandFilter, setBrandFilter] = useState('all')

  // Upload state
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadBrandId, setUploadBrandId] = useState('')
  const [uploadCategory, setUploadCategory] = useState('drink')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Lightbox
  const [lightbox, setLightbox] = useState<MediaItem | null>(null)

  async function loadMedia() {
    setLoading(true)
    const { data } = await supabase
      .from('brand_media')
      .select('*, brands(name)')
      .order('created_at', { ascending: false })

    if (data) {
      // Generate signed URLs for images
      const withUrls = await Promise.all(
        data.map(async (item: any) => {
          const { data: urlData } = await supabase.storage
            .from('brand-media')
            .createSignedUrl(item.storage_path, 3600)
          return { ...item, signedUrl: urlData?.signedUrl }
        })
      )
      setMedia(withUrls)
    }
    setLoading(false)
  }

  useEffect(() => {
    supabase.from('brands').select('id, name').order('name').then(({ data }) => setBrands(data || []))
    loadMedia()
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(files)
  }

  function removeFile(i: number) {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleUpload() {
    if (!uploadBrandId) {
      toast({ title: 'Selecione uma marca', variant: 'destructive' }); return
    }
    if (selectedFiles.length === 0) {
      toast({ title: 'Selecione pelo menos um arquivo', variant: 'destructive' }); return
    }

    setUploading(true)
    setUploadProgress(0)

    let done = 0
    const errors: string[] = []

    for (const file of selectedFiles) {
      const ext = file.name.split('.').pop()
      const path = `${uploadBrandId}/${uploadCategory}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

      const { error: storageError } = await supabase.storage
        .from('brand-media')
        .upload(path, file, { contentType: file.type, upsert: false })

      if (storageError) {
        errors.push(file.name)
      } else {
        const title = uploadTitle.trim() || (selectedFiles.length === 1 ? file.name.replace(/\.[^.]+$/, '') : null)
        await supabase.from('brand_media').insert({
          brand_id: uploadBrandId,
          category: uploadCategory,
          title: title || null,
          storage_path: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
        })
      }

      done++
      setUploadProgress(Math.round((done / selectedFiles.length) * 100))
    }

    if (errors.length > 0) {
      toast({ title: `Erro ao enviar: ${errors.join(', ')}`, variant: 'destructive' })
    } else {
      toast({ title: `${done} arquivo${done !== 1 ? 's' : ''} enviado${done !== 1 ? 's' : ''}!` })
    }

    setUploading(false)
    setUploadOpen(false)
    setSelectedFiles([])
    setUploadTitle('')
    loadMedia()
  }

  async function handleDelete(item: MediaItem) {
    if (!confirm(`Excluir "${item.title || item.file_name}"?`)) return
    await supabase.storage.from('brand-media').remove([item.storage_path])
    await supabase.from('brand_media').delete().eq('id', item.id)
    toast({ title: 'Arquivo excluído' })
    setMedia((prev) => prev.filter((m) => m.id !== item.id))
  }

  async function handleDownload(item: MediaItem) {
    const { data } = await supabase.storage
      .from('brand-media')
      .createSignedUrl(item.storage_path, 60)
    if (data?.signedUrl) {
      const a = document.createElement('a')
      a.href = data.signedUrl
      a.download = item.file_name
      a.click()
    }
  }

  const filtered = media.filter((m) => {
    const matchCat = catFilter === 'all' || m.category === catFilter
    const matchBrand = brandFilter === 'all' || m.brand_id === brandFilter
    return matchCat && matchBrand
  })

  const isPdf = (item: MediaItem) => item.mime_type === 'application/pdf'

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mídia</h1>
          <p className="text-muted-foreground text-sm">Fotos de drinks, cardápios e benchmark</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Camera className="h-4 w-4 mr-2" /> Upload
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Brand filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setBrandFilter('all')}
            className={cn('px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
              brandFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground')}
          >Todas as marcas</button>
          {brands.map((b) => (
            <button
              key={b.id}
              onClick={() => setBrandFilter(b.id)}
              className={cn('px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                brandFilter === b.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground')}
            >{b.name}</button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setCatFilter(c.value)}
              className={cn('px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                catFilter === c.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground')}
            >{c.label}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma mídia encontrada</p>
          <p className="text-sm mt-1">Clique em "Upload" para adicionar fotos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((item) => (
            <div key={item.id} className="group relative rounded-xl overflow-hidden border bg-muted/30 hover:border-primary/40 transition-colors">
              {/* Thumbnail */}
              <div
                className="aspect-square cursor-pointer relative"
                onClick={() => setLightbox(item)}
              >
                {isPdf(item) ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <FileText className="h-10 w-10" />
                    <span className="text-xs">PDF</span>
                  </div>
                ) : item.signedUrl ? (
                  <img src={item.signedUrl} alt={item.title || item.file_name}
                    className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="h-6 w-6 text-white" />
                </div>
              </div>

              {/* Info */}
              <div className="p-2.5">
                <p className="text-xs font-medium truncate">{item.title || item.file_name}</p>
                <div className="flex items-center justify-between mt-1.5 gap-1">
                  <div className="flex gap-1 flex-wrap">
                    <Badge className={cn('text-[10px] px-1.5 py-0 border', CATEGORY_COLORS[item.category])} variant="outline">
                      {CATEGORY_LABELS[item.category]}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {(item.brands as any)?.name}
                    </Badge>
                  </div>
                  <button onClick={() => handleDelete(item)}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {format(new Date(item.created_at), 'dd/MM/yy', { locale: ptBR })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={(v) => { if (!uploading) setUploadOpen(v) }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload de mídia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* File picker */}
            <div className="space-y-2">
              <Label>Arquivos *</Label>
              <div
                className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Toque para abrir câmera ou galeria</p>
                <p className="text-xs text-muted-foreground mt-1">Imagens ou PDF · até 20 MB por arquivo</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Selected files preview */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2 mt-2">
                  {selectedFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                      {f.type === 'application/pdf' ? (
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <img src={URL.createObjectURL(f)} alt={f.name}
                          className="h-10 w-10 object-cover rounded shrink-0" />
                      )}
                      <span className="flex-1 truncate text-xs">{f.name}</span>
                      <button type="button" onClick={() => removeFile(i)}
                        className="text-muted-foreground hover:text-foreground shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Brand */}
            <div className="space-y-1.5">
              <Label>Marca *</Label>
              <Select value={uploadBrandId} onValueChange={setUploadBrandId}>
                <SelectTrigger><SelectValue placeholder="Selecionar marca" /></SelectTrigger>
                <SelectContent>
                  {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="drink">🍹 Drink</SelectItem>
                  <SelectItem value="cardapio">📋 Cardápio</SelectItem>
                  <SelectItem value="benchmark">🔍 Benchmark</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label>Título <span className="text-muted-foreground">(opcional)</span></Label>
              <Input
                placeholder="Ex: Caipirinha com Famigerada Bruta"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
              />
            </div>

            {/* Progress */}
            {uploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Enviando...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={uploading || selectedFiles.length === 0}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              {uploading ? 'Enviando...' : `Enviar${selectedFiles.length > 1 ? ` (${selectedFiles.length})` : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Top bar */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white font-medium text-sm">{lightbox.title || lightbox.file_name}</p>
                <p className="text-white/60 text-xs">{(lightbox.brands as any)?.name} · {CATEGORY_LABELS[lightbox.category]}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => handleDownload(lightbox)}>
                  <Download className="h-4 w-4 mr-1.5" /> Baixar
                </Button>
                <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={() => setLightbox(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            {isPdf(lightbox) ? (
              <div className="bg-card rounded-xl p-8 text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium">{lightbox.file_name}</p>
                <Button className="mt-4" onClick={() => handleDownload(lightbox)}>
                  <Download className="h-4 w-4 mr-2" /> Baixar PDF
                </Button>
              </div>
            ) : lightbox.signedUrl ? (
              <img src={lightbox.signedUrl} alt={lightbox.title || lightbox.file_name}
                className="w-full max-h-[70vh] object-contain rounded-xl" />
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

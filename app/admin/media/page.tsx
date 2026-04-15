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
import { Upload, Trash2, Loader2, ImageIcon, FileText, X, ZoomIn, Download, Camera, MapPin } from 'lucide-react'
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
const CATEGORY_LABELS: Record<string, string> = { drink: 'Drink', cardapio: 'Cardápio', benchmark: 'Benchmark', outro: 'Outro' }
const CATEGORY_COLORS: Record<string, string> = {
  drink: 'bg-purple-500/15 text-purple-700 border-purple-200',
  cardapio: 'bg-blue-500/15 text-blue-700 border-blue-200',
  benchmark: 'bg-amber-500/15 text-amber-700 border-amber-200',
  outro: 'bg-gray-500/15 text-gray-600 border-gray-200',
}

interface MediaItem {
  id: string
  brand_id: string | null
  venue_id: string | null
  event_name: string | null
  title: string | null
  category: string
  storage_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  created_at: string
  brands: { name: string } | null
  venues: { id: string; name: string; neighborhood: string | null } | null
  signedUrl?: string
}

interface Venue { id: string; name: string; neighborhood: string | null; city: string | null }

function pillCn(active: boolean) {
  return cn('px-3 py-1.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap',
    active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground')
}

export default function AdminMediaPage() {
  const supabase = createClient()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const venueDropRef = useRef<HTMLDivElement>(null)

  const [brands, setBrands] = useState<{ id: string; name: string }[]>([])
  const [allVenues, setAllVenues] = useState<Venue[]>([])
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [catFilter, setCatFilter] = useState('all')
  const [brandFilter, setBrandFilter] = useState('all')
  const [venueFilter, setVenueFilter] = useState('all')

  // Upload state
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadBrandId, setUploadBrandId] = useState('')
  const [uploadCategory, setUploadCategory] = useState('drink')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadEventName, setUploadEventName] = useState('')
  const [uploadVenueId, setUploadVenueId] = useState('')
  const [uploadVenueName, setUploadVenueName] = useState('')
  const [venueSearch, setVenueSearch] = useState('')
  const [showVenueDrop, setShowVenueDrop] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Lightbox
  const [lightbox, setLightbox] = useState<MediaItem | null>(null)

  // Cardápio vai para todas as marcas automaticamente
  const isAllBrands = uploadCategory === 'cardapio'

  async function loadMedia() {
    setLoading(true)
    const { data } = await supabase
      .from('brand_media')
      .select('*, brands(name), venues(id, name, neighborhood)')
      .order('created_at', { ascending: false })

    if (data) {
      const withUrls = await Promise.all(
        data.map(async (item: any) => {
          const { data: u } = await supabase.storage.from('brand-media').createSignedUrl(item.storage_path, 3600)
          return { ...item, signedUrl: u?.signedUrl }
        })
      )
      setMedia(withUrls)
    }
    setLoading(false)
  }

  useEffect(() => {
    Promise.all([
      supabase.from('brands').select('id, name').order('name'),
      supabase.from('venues').select('id, name, neighborhood, city').order('name'),
    ]).then(([{ data: b }, { data: v }]) => {
      setBrands(b || [])
      setAllVenues(v || [])
    })
    loadMedia()
  }, [])

  // Close venue dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (venueDropRef.current && !venueDropRef.current.contains(e.target as Node)) setShowVenueDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredVenues = allVenues.filter(v =>
    v.name.toLowerCase().includes(venueSearch.toLowerCase()) ||
    (v.neighborhood || '').toLowerCase().includes(venueSearch.toLowerCase()) ||
    (v.city || '').toLowerCase().includes(venueSearch.toLowerCase())
  )

  function selectVenue(v: Venue) {
    setUploadVenueId(v.id)
    setUploadVenueName(v.name + (v.city ? ` – ${v.city}` : ''))
    setVenueSearch(v.name + (v.city ? ` – ${v.city}` : ''))
    setShowVenueDrop(false)
  }

  function clearVenueSelection() {
    setUploadVenueId('')
    setUploadVenueName('')
    setVenueSearch('')
  }

  function resetUpload() {
    setSelectedFiles([])
    setUploadTitle('')
    setUploadEventName('')
    setUploadBrandId('')
    setUploadCategory('drink')
    clearVenueSelection()
  }

  async function handleUpload() {
    if (!isAllBrands && !uploadBrandId) { toast({ title: 'Selecione uma marca', variant: 'destructive' }); return }
    if (selectedFiles.length === 0) { toast({ title: 'Selecione pelo menos um arquivo', variant: 'destructive' }); return }

    setUploading(true)
    setUploadProgress(0)
    const brandFolder = isAllBrands ? 'todas' : uploadBrandId
    let done = 0
    const errors: string[] = []

    for (const file of selectedFiles) {
      const ext = file.name.split('.').pop()
      const path = `${brandFolder}/${uploadCategory}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: storageError } = await supabase.storage.from('brand-media').upload(path, file, { contentType: file.type })

      if (storageError) {
        errors.push(file.name)
      } else {
        const title = uploadTitle.trim() || (selectedFiles.length === 1 ? file.name.replace(/\.[^.]+$/, '') : null)
        await supabase.from('brand_media').insert({
          brand_id: isAllBrands ? null : uploadBrandId,
          venue_id: uploadVenueId || null,
          event_name: uploadEventName.trim() || null,
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

    if (errors.length > 0) toast({ title: `Erro ao enviar: ${errors.join(', ')}`, variant: 'destructive' })
    else toast({ title: `${done} arquivo${done !== 1 ? 's' : ''} enviado${done !== 1 ? 's' : ''}!` })

    setUploading(false)
    setUploadOpen(false)
    resetUpload()
    loadMedia()
  }

  async function handleDelete(item: MediaItem) {
    if (!confirm(`Excluir "${item.title || item.file_name}"?`)) return
    await supabase.storage.from('brand-media').remove([item.storage_path])
    await supabase.from('brand_media').delete().eq('id', item.id)
    toast({ title: 'Arquivo excluído' })
    setMedia(prev => prev.filter(m => m.id !== item.id))
    if (lightbox?.id === item.id) setLightbox(null)
  }

  async function handleDownload(item: MediaItem) {
    const { data } = await supabase.storage.from('brand-media').createSignedUrl(item.storage_path, 60)
    if (data?.signedUrl) {
      const a = document.createElement('a'); a.href = data.signedUrl; a.download = item.file_name; a.click()
    }
  }

  // Venues that actually have photos (for filter)
  const venuesWithMedia = Array.from(
    new Map(media.filter(m => m.venue_id && m.venues).map(m => [m.venue_id!, m.venues!])).entries()
  ).sort((a, b) => a[1].name.localeCompare(b[1].name, 'pt-BR'))

  const filtered = media.filter(m => {
    const matchCat = catFilter === 'all' || m.category === catFilter
    const matchBrand = brandFilter === 'all' || (brandFilter === 'todas' ? !m.brand_id : m.brand_id === brandFilter)
    const matchVenue = venueFilter === 'all' || (venueFilter === 'sem' ? !m.venue_id : m.venue_id === venueFilter)
    return matchCat && matchBrand && matchVenue
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
        {/* Venue filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button onClick={() => setVenueFilter('all')} className={pillCn(venueFilter === 'all')}>Todos os bares</button>
          <button onClick={() => setVenueFilter('sem')} className={pillCn(venueFilter === 'sem')}>Sem bar</button>
          {venuesWithMedia.map(([id, v]) => (
            <button key={id} onClick={() => setVenueFilter(id)} className={pillCn(venueFilter === id)}>
              {v.name}
            </button>
          ))}
        </div>

        {/* Brand filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button onClick={() => setBrandFilter('all')} className={pillCn(brandFilter === 'all')}>Todas as marcas</button>
          <button onClick={() => setBrandFilter('todas')} className={pillCn(brandFilter === 'todas')}>📋 Cardápios gerais</button>
          {brands.map(b => (
            <button key={b.id} onClick={() => setBrandFilter(b.id)} className={pillCn(brandFilter === b.id)}>{b.name}</button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setCatFilter(c.value)} className={pillCn(catFilter === c.value)}>{c.label}</button>
          ))}
        </div>
      </div>

      {!loading && <p className="text-xs text-muted-foreground">{filtered.length} arquivo{filtered.length !== 1 ? 's' : ''}</p>}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-square bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma mídia encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(item => (
            <div key={item.id} className="group relative rounded-xl overflow-hidden border bg-muted/30 hover:border-primary/40 transition-colors">
              <div className="aspect-square cursor-pointer relative" onClick={() => setLightbox(item)}>
                {isPdf(item) ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <FileText className="h-10 w-10" /><span className="text-xs">PDF</span>
                  </div>
                ) : item.signedUrl ? (
                  <img src={item.signedUrl} alt={item.title || item.file_name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center"><ImageIcon className="h-8 w-8 text-muted-foreground" /></div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="h-6 w-6 text-white" />
                </div>
              </div>

              <div className="p-2.5 space-y-1.5">
                <p className="text-xs font-medium truncate">{item.title || item.file_name}</p>

                {/* Venue */}
                {item.venues && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate">
                    <MapPin className="h-2.5 w-2.5 shrink-0" />{item.venues.name}
                  </p>
                )}
                {item.event_name && (
                  <p className="text-[10px] text-primary/80 truncate">🎉 {item.event_name}</p>
                )}

                <div className="flex items-center justify-between gap-1">
                  <div className="flex gap-1 min-w-0">
                    <Badge className={cn('text-[10px] px-1.5 py-0 border shrink-0', CATEGORY_COLORS[item.category])} variant="outline">
                      {CATEGORY_LABELS[item.category]}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 truncate">
                      {item.brand_id ? item.brands?.name : 'Todas'}
                    </Badge>
                  </div>
                  <button onClick={() => handleDelete(item)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <p className="text-[10px] text-muted-foreground">{format(new Date(item.created_at), 'dd/MM/yy', { locale: ptBR })}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={v => { if (!uploading) { setUploadOpen(v); if (!v) resetUpload() } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Upload de mídia</DialogTitle></DialogHeader>
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
                <p className="text-xs text-muted-foreground mt-1">Imagens ou PDF · até 20 MB</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={e => setSelectedFiles(Array.from(e.target.files || []))} />
              {selectedFiles.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {selectedFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      {f.type === 'application/pdf'
                        ? <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        : <img src={URL.createObjectURL(f)} alt={f.name} className="h-10 w-10 object-cover rounded shrink-0" />}
                      <span className="flex-1 truncate text-xs">{f.name}</span>
                      <button type="button" onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-foreground shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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

            {/* Brand */}
            {isAllBrands ? (
              <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-500/10 px-3 py-2.5 text-sm text-blue-700">
                <span className="text-base leading-none mt-0.5">📋</span>
                <span>Cardápios ficam visíveis para <strong>todas as marcas</strong> automaticamente.</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Marca *</Label>
                <Select value={uploadBrandId} onValueChange={setUploadBrandId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar marca" /></SelectTrigger>
                  <SelectContent>{brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {/* Venue search */}
            <div className="space-y-1.5">
              <Label>Bar / Estabelecimento <span className="text-muted-foreground">(opcional)</span></Label>
              <div className="relative" ref={venueDropRef}>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar bar..."
                    value={venueSearch}
                    className={cn('pl-8', uploadVenueId && 'border-primary/50 bg-primary/5')}
                    onChange={e => { setVenueSearch(e.target.value); setUploadVenueId(''); setUploadVenueName(''); setShowVenueDrop(true) }}
                    onFocus={() => { if (!uploadVenueId) setShowVenueDrop(true) }}
                  />
                  {uploadVenueId && (
                    <button type="button" onClick={clearVenueSelection} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {showVenueDrop && venueSearch && !uploadVenueId && (
                  <div className="absolute z-50 w-full mt-1 border rounded-lg bg-card shadow-lg max-h-48 overflow-y-auto">
                    {filteredVenues.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum resultado</p>}
                    {filteredVenues.slice(0, 20).map(v => (
                      <button key={v.id} type="button" onClick={() => selectVenue(v)}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-0 flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span>
                          <span className="font-medium">{v.name}</span>
                          {(v.neighborhood || v.city) && (
                            <span className="text-muted-foreground text-xs ml-1">{[v.neighborhood, v.city].filter(Boolean).join(' · ')}</span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Event name */}
            <div className="space-y-1.5">
              <Label>Evento <span className="text-muted-foreground">(opcional)</span></Label>
              <Input placeholder="Ex: Lançamento Famigerada · Março 2025" value={uploadEventName} onChange={e => setUploadEventName(e.target.value)} />
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label>Título <span className="text-muted-foreground">(opcional)</span></Label>
              <Input placeholder="Ex: Caipirinha com Famigerada Bruta" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} />
            </div>

            {/* Progress */}
            {uploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Enviando...</span><span>{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadOpen(false); resetUpload() }} disabled={uploading}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={uploading || selectedFiles.length === 0}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              {uploading ? 'Enviando...' : `Enviar${selectedFiles.length > 1 ? ` (${selectedFiles.length})` : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3 gap-3">
              <div className="min-w-0">
                <p className="text-white font-medium text-sm truncate">{lightbox.title || lightbox.file_name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge className={cn('text-[10px] px-1.5 border', CATEGORY_COLORS[lightbox.category])} variant="outline">
                    {CATEGORY_LABELS[lightbox.category]}
                  </Badge>
                  {lightbox.brands && <span className="text-white/60 text-xs">{lightbox.brands.name}</span>}
                  {lightbox.venues && (
                    <span className="text-white/60 text-xs flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />{lightbox.venues.name}
                    </span>
                  )}
                  {lightbox.event_name && <span className="text-white/60 text-xs">🎉 {lightbox.event_name}</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="secondary" onClick={() => handleDownload(lightbox)}>
                  <Download className="h-4 w-4 mr-1.5" /> Baixar
                </Button>
                <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={() => setLightbox(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {isPdf(lightbox) ? (
              <div className="bg-card rounded-xl p-8 text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium">{lightbox.file_name}</p>
                <Button className="mt-4" onClick={() => handleDownload(lightbox)}><Download className="h-4 w-4 mr-2" /> Baixar PDF</Button>
              </div>
            ) : lightbox.signedUrl ? (
              <img src={lightbox.signedUrl} alt={lightbox.title || lightbox.file_name} className="w-full max-h-[70vh] object-contain rounded-xl" />
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

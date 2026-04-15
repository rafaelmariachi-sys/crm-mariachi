'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { ImageIcon, FileText, Download, X, ZoomIn } from 'lucide-react'
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

export default function BrandMediaPage() {
  const supabase = createClient()
  const { toast } = useToast()

  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState('all')
  const [brandFilter, setBrandFilter] = useState('all')
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([])
  const [lightbox, setLightbox] = useState<MediaItem | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: brandUsers } = await supabase
        .from('brand_users')
        .select('brand_id, brands(id, name)')
        .eq('user_id', user.id)

      const allBrands = (brandUsers || []).map((bu: any) => ({ id: bu.brands.id, name: bu.brands.name }))
      setBrands(allBrands)

      const brandIds = allBrands.map((b) => b.id)
      if (brandIds.length === 0) { setLoading(false); return }

      const { data } = await supabase
        .from('brand_media')
        .select('*, brands(name)')
        .in('brand_id', brandIds)
        .order('created_at', { ascending: false })

      if (data) {
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
    load()
  }, [])

  async function handleDownload(item: MediaItem) {
    setDownloading(item.id)
    try {
      const { data } = await supabase.storage
        .from('brand-media')
        .createSignedUrl(item.storage_path, 60)
      if (data?.signedUrl) {
        const a = document.createElement('a')
        a.href = data.signedUrl
        a.download = item.file_name
        a.click()
        toast({ title: 'Download iniciado!' })
      }
    } catch {
      toast({ title: 'Erro ao baixar arquivo', variant: 'destructive' })
    }
    setDownloading(null)
  }

  const isPdf = (item: MediaItem) => item.mime_type === 'application/pdf'

  const filtered = media.filter((m) => {
    const matchCat = catFilter === 'all' || m.category === catFilter
    const matchBrand = brandFilter === 'all' || m.brand_id === brandFilter
    return matchCat && matchBrand
  })

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Mídia</h1>
        <p className="text-muted-foreground text-sm">Fotos de drinks, cardápios e benchmark</p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Brand filter (only if multi-brand) */}
        {brands.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setBrandFilter('all')}
              className={cn('px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                brandFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground')}
            >Todos</button>
            {brands.map((b) => (
              <button
                key={b.id}
                onClick={() => setBrandFilter(b.id)}
                className={cn('px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                  brandFilter === b.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground')}
              >{b.name}</button>
            ))}
          </div>
        )}

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

      {/* Count */}
      {!loading && (
        <p className="text-sm text-muted-foreground">{filtered.length} arquivo{filtered.length !== 1 ? 's' : ''}</p>
      )}

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
          <p className="font-medium">Nenhuma mídia disponível</p>
          <p className="text-sm mt-1">As fotos aparecerão aqui quando forem adicionadas</p>
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
                    <span className="text-xs font-medium">PDF</span>
                  </div>
                ) : item.signedUrl ? (
                  <img
                    src={item.signedUrl}
                    alt={item.title || item.file_name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="h-6 w-6 text-white" />
                </div>
              </div>

              {/* Info */}
              <div className="p-2.5">
                <p className="text-xs font-medium truncate">{item.title || item.file_name}</p>
                <div className="flex items-center justify-between mt-1.5 gap-1">
                  <Badge className={cn('text-[10px] px-1.5 py-0 border', CATEGORY_COLORS[item.category])} variant="outline">
                    {CATEGORY_LABELS[item.category]}
                  </Badge>
                  <button
                    onClick={() => handleDownload(item)}
                    disabled={downloading === item.id}
                    className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                    title="Baixar"
                  >
                    <Download className={cn('h-3.5 w-3.5', downloading === item.id && 'animate-pulse')} />
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

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Top bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{lightbox.title || lightbox.file_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge className={cn('text-[10px] px-1.5 border', CATEGORY_COLORS[lightbox.category])} variant="outline">
                    {CATEGORY_LABELS[lightbox.category]}
                  </Badge>
                  {brands.length > 1 && (
                    <span className="text-white/60 text-xs">{(lightbox.brands as any)?.name}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 ml-3 shrink-0">
                <Button
                  size="sm"
                  onClick={() => handleDownload(lightbox)}
                  disabled={downloading === lightbox.id}
                  className="bg-white text-black hover:bg-white/90"
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Baixar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={() => setLightbox(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            {isPdf(lightbox) ? (
              <div className="bg-card rounded-xl p-10 text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="font-medium">{lightbox.file_name}</p>
                <Button className="mt-4" onClick={() => handleDownload(lightbox)}>
                  <Download className="h-4 w-4 mr-2" /> Baixar PDF
                </Button>
              </div>
            ) : lightbox.signedUrl ? (
              <img
                src={lightbox.signedUrl}
                alt={lightbox.title || lightbox.file_name}
                className="w-full max-h-[75vh] object-contain rounded-xl"
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

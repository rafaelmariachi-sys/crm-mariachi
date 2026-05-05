import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Phone, Mail, Building2, Package } from 'lucide-react'
import { POSITIVATION_STATUS_LABELS, POSITIVATION_STATUS_COLORS, PositivationStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { BrandTabs } from '@/components/brand/brand-tabs'
import { StatusTabs } from '@/components/brand/status-tabs'
import { ViewTabs } from '@/components/brand/view-tabs'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

const STATUS_SECTION_LABEL: Record<string, string> = {
  positivado: 'Produtos positivados',
  em_negociacao: 'Produtos em negociação',
  perdido: 'Produtos perdidos',
  all: 'Produtos',
}

const STATUS_PAGE_LABEL: Record<string, string> = {
  positivado: 'positivadas',
  em_negociacao: 'em negociação',
  perdido: 'perdidas',
  all: 'no total',
}

export default async function BrandVenuesPage({
  searchParams,
}: {
  searchParams: { brand?: string; status?: string; view?: string }
}) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: brandUsers } = await supabase
    .from('brand_users')
    .select('brand_id, brands(id, name)')
    .eq('user_id', user!.id)

  const allBrands = (brandUsers || []).map((bu: any) => ({ id: bu.brands.id, name: bu.brands.name }))
  const selectedBrand = searchParams.brand
  const selectedStatus = searchParams.status || 'all'
  const selectedView = searchParams.view || 'casa'
  const brandIds = selectedBrand ? [selectedBrand] : allBrands.map((b) => b.id)

  let query = supabase
    .from('positivations')
    .select(
      'id, product_name, status, brand_id, brands(name), venue_id, venues(id, name, address, neighborhood, city, type, phone, email, cnpj, razao_social, delivery_day, contact_name), visits(venue_id, venues(id, name, address, neighborhood, city, type, phone, email, cnpj, razao_social, delivery_day, contact_name))'
    )
    .in('brand_id', brandIds)

  if (selectedStatus === 'perdido') {
    query = query.in('status', ['perdido', 'inativo'])
  } else if (selectedStatus !== 'all') {
    query = query.eq('status', selectedStatus as PositivationStatus)
  }

  const { data: positivations } = await query

  // ── VIEW: Por casa ──────────────────────────────────────────────────
  const venueMap = new Map<
    string,
    { venue: any; products: { brand: string; product_name: string; status: PositivationStatus }[] }
  >()

  positivations?.forEach((p: any) => {
    const venue = p.venues || p.visits?.venues
    if (!venue) return
    const venueId = venue.id
    if (!venueMap.has(venueId)) venueMap.set(venueId, { venue, products: [] })
    venueMap.get(venueId)!.products.push({
      brand: p.brands?.name || '',
      product_name: p.product_name || 'Sem SKU',
      status: p.status,
    })
  })

  const venues = Array.from(venueMap.values()).sort((a, b) =>
    a.venue.name.localeCompare(b.venue.name, 'pt-BR')
  )

  // ── VIEW: Por produto ───────────────────────────────────────────────
  const productMap = new Map<
    string,
    {
      productName: string
      brand: string
      statusSummary: Record<string, number>
      venues: { venue: any; status: PositivationStatus }[]
    }
  >()

  positivations?.forEach((p: any) => {
    const venue = p.venues || p.visits?.venues
    const key = `${p.brand_id}__${p.product_name || 'Sem SKU'}`
    if (!productMap.has(key)) {
      productMap.set(key, {
        productName: p.product_name || 'Sem SKU',
        brand: p.brands?.name || '',
        statusSummary: {},
        venues: [],
      })
    }
    const entry = productMap.get(key)!
    entry.statusSummary[p.status] = (entry.statusSummary[p.status] || 0) + 1
    if (venue) entry.venues.push({ venue, status: p.status })
  })

  const products = Array.from(productMap.values()).sort((a, b) =>
    a.productName.localeCompare(b.productName, 'pt-BR')
  )

  const sectionLabel = STATUS_SECTION_LABEL[selectedStatus] ?? 'Produtos'
  const pageLabel = STATUS_PAGE_LABEL[selectedStatus] ?? ''

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Casas & Produtos</h1>
        <p className="text-muted-foreground text-sm">
          {selectedView === 'casa'
            ? `${venues.length} casa${venues.length !== 1 ? 's' : ''} ${pageLabel}`
            : `${products.length} produto${products.length !== 1 ? 's' : ''} ${pageLabel}`}
        </p>
      </div>

      {/* Filtro por marca */}
      <Suspense><BrandTabs brands={allBrands} /></Suspense>

      {/* Toggle de visualização */}
      <Suspense><ViewTabs /></Suspense>

      {/* Filtro por status */}
      <Suspense><StatusTabs /></Suspense>

      {/* ── VISTA: POR CASA ── */}
      {selectedView === 'casa' && (
        venues.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhuma casa encontrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {venues.map(({ venue, products: prods }) => (
              <Card key={venue.id}>
                <CardContent className="p-4 sm:p-5 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-base leading-tight">{venue.name}</p>
                      {(venue.neighborhood || venue.city) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {[venue.neighborhood, venue.city].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {venue.address && (
                        <p className="text-xs text-muted-foreground mt-0.5">{venue.address}</p>
                      )}
                    </div>
                    {venue.type && (
                      <Badge variant="outline" className="text-xs shrink-0">{venue.type}</Badge>
                    )}
                  </div>

                  {/* Contact info */}
                  {(venue.contact_name || venue.phone || venue.email) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground border-t border-border pt-3">
                      {venue.contact_name && (
                        <span className="font-medium text-foreground">{venue.contact_name}</span>
                      )}
                      {venue.phone && (
                        <a href={`tel:${venue.phone}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                          <Phone className="h-3 w-3" />{venue.phone}
                        </a>
                      )}
                      {venue.email && (
                        <a href={`mailto:${venue.email}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                          <Mail className="h-3 w-3" />{venue.email}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Business info */}
                  {(venue.cnpj || venue.razao_social || venue.delivery_day) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground border-t border-border pt-3">
                      {venue.razao_social && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />{venue.razao_social}
                        </span>
                      )}
                      {venue.cnpj && <span>CNPJ: {venue.cnpj}</span>}
                      {venue.delivery_day && <span>Entrega: {venue.delivery_day}</span>}
                    </div>
                  )}

                  {/* Products */}
                  <div className="border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Package className="h-3 w-3" /> {sectionLabel}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {prods.map((p, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className={cn(
                            'text-xs px-2 py-1 rounded-full border whitespace-nowrap',
                            POSITIVATION_STATUS_COLORS[p.status]
                          )}>
                            {p.product_name}
                          </span>
                          {selectedStatus === 'all' && (
                            <span className="text-[10px] text-muted-foreground">
                              {POSITIVATION_STATUS_LABELS[p.status]}
                            </span>
                          )}
                          {allBrands.length > 1 && (
                            <span className="text-xs text-muted-foreground">({p.brand})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* ── VISTA: POR PRODUTO ── */}
      {selectedView === 'produto' && (
        products.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product, idx) => (
              <Card key={idx}>
                <CardContent className="p-4 sm:p-5 space-y-3">
                  {/* Header do produto */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-base leading-tight flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        {product.productName}
                      </p>
                      {allBrands.length > 1 && (
                        <p className="text-xs text-muted-foreground mt-0.5">{product.brand}</p>
                      )}
                    </div>
                    {/* Contagem por status */}
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      {Object.entries(product.statusSummary).map(([status, count]) => (
                        <span
                          key={status}
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full border whitespace-nowrap',
                            POSITIVATION_STATUS_COLORS[status as PositivationStatus]
                          )}
                        >
                          {count} {POSITIVATION_STATUS_LABELS[status as PositivationStatus] || status}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Lista de casas */}
                  {product.venues.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Casas
                      </p>
                      <div className="space-y-1.5">
                        {product.venues
                          .sort((a, b) => a.venue.name.localeCompare(b.venue.name, 'pt-BR'))
                          .map((entry, i) => (
                            <div key={i} className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <span className="text-sm">{entry.venue.name}</span>
                                {(entry.venue.neighborhood || entry.venue.city) && (
                                  <span className="text-xs text-muted-foreground ml-1.5">
                                    {[entry.venue.neighborhood, entry.venue.city].filter(Boolean).join(' · ')}
                                  </span>
                                )}
                              </div>
                              <span className={cn(
                                'text-xs px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0',
                                POSITIVATION_STATUS_COLORS[entry.status]
                              )}>
                                {POSITIVATION_STATUS_LABELS[entry.status]}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  )
}

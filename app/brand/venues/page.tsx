import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Phone, Mail, Building2, Package } from 'lucide-react'
import { POSITIVATION_STATUS_LABELS, POSITIVATION_STATUS_COLORS, PositivationStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { BrandTabs } from '@/components/brand/brand-tabs'

export const dynamic = 'force-dynamic'

export default async function BrandVenuesPage({ searchParams }: { searchParams: { brand?: string } }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: brandUsers } = await supabase.from('brand_users').select('brand_id, brands(id, name)').eq('user_id', user!.id)

  const allBrands = (brandUsers || []).map((bu: any) => ({ id: bu.brands.id, name: bu.brands.name }))
  const selectedBrand = searchParams.brand
  const brandIds = selectedBrand ? [selectedBrand] : allBrands.map((b) => b.id)

  const { data: positivations } = await supabase
    .from('positivations')
    .select('id, product_name, status, brand_id, brands(name), venue_id, venues(id, name, address, neighborhood, city, type, phone, email, cnpj, razao_social, delivery_day, contact_name), visits(venue_id, venues(id, name, address, neighborhood, city, type, phone, email, cnpj, razao_social, delivery_day, contact_name))')
    .in('brand_id', brandIds)
    .eq('status', 'positivado')

  // Group by venue — supports both independent (venue_id) and visit-linked positivations
  const venueMap = new Map<string, { venue: any; products: { brand: string; product_name: string; status: PositivationStatus }[] }>()

  positivations?.forEach((p: any) => {
    // Prefer direct venue_id, fallback to via visit
    const venue = p.venues || p.visits?.venues
    if (!venue) return
    const venueId = venue.id
    if (!venueMap.has(venueId)) {
      venueMap.set(venueId, { venue, products: [] })
    }
    venueMap.get(venueId)!.products.push({
      brand: p.brands?.name || '',
      product_name: p.product_name,
      status: p.status,
    })
  })

  const venues = Array.from(venueMap.values()).sort((a, b) =>
    a.venue.name.localeCompare(b.venue.name)
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Casas</h1>
        <p className="text-muted-foreground text-sm">{venues.length} casas positivadas</p>
      </div>

      <BrandTabs brands={allBrands} />

      {venues.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Nenhuma casa positivada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {venues.map(({ venue, products }) => (
            <Card key={venue.id}>
              <CardContent className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-base">{venue.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {[venue.neighborhood, venue.city].filter(Boolean).join(' · ')}
                    </p>
                    {venue.address && (
                      <p className="text-xs text-muted-foreground mt-0.5">{venue.address}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{venue.type}</Badge>
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
                    {venue.cnpj && (
                      <span>CNPJ: {venue.cnpj}</span>
                    )}
                    {venue.delivery_day && (
                      <span>Entrega: {venue.delivery_day}</span>
                    )}
                  </div>
                )}

                {/* Products positivated */}
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Package className="h-3 w-3" /> Produtos positivados
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {products.map((p, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className={cn('text-xs px-2 py-1 rounded-full border whitespace-nowrap', POSITIVATION_STATUS_COLORS[p.status])}>
                          {p.product_name}
                        </span>
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
      )}
    </div>
  )
}

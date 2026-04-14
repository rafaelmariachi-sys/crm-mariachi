export type Brand = {
  id: string
  name: string
  logo_url: string | null
  created_at: string
}

export type Venue = {
  id: string
  name: string
  address: string
  neighborhood: string
  city: string
  type: string
  contact_name: string | null
  phone: string | null
  email: string | null
  business_hours: string | null
  delivery_hours: string | null
  delivery_day: string | null
  cnpj: string | null
  razao_social: string | null
  notes: string | null
  created_at: string
}

export type Visit = {
  id: string
  venue_id: string
  visited_at: string
  notes: string
  created_at: string
  venues?: Venue
}

export type PositivationStatus = 'positivado' | 'em_negociacao' | 'recusado' | 'retorno_pendente'

export const POSITIVATION_STATUS_LABELS: Record<PositivationStatus, string> = {
  positivado: 'Positivado',
  em_negociacao: 'Em Negociação',
  recusado: 'Recusado',
  retorno_pendente: 'Retorno Pendente',
}

export const POSITIVATION_STATUS_COLORS: Record<PositivationStatus, string> = {
  positivado: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  em_negociacao: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  recusado: 'bg-red-500/20 text-red-400 border-red-500/30',
  retorno_pendente: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

export type Positivation = {
  id: string
  visit_id: string
  brand_id: string
  product_name: string
  status: PositivationStatus
  notes: string | null
  created_at: string
  brands?: Brand
  visits?: Visit & { venues?: Venue }
}

export type FollowupStatus = 'aberto' | 'concluido' | 'cancelado'

export const FOLLOWUP_STATUS_LABELS: Record<FollowupStatus, string> = {
  aberto: 'Aberto',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

export const FOLLOWUP_STATUS_COLORS: Record<FollowupStatus, string> = {
  aberto: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  concluido: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  cancelado: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
}

export type Followup = {
  id: string
  visit_id: string
  brand_id: string
  content: string
  due_date: string | null
  status: FollowupStatus
  created_at: string
  brands?: Brand
  visits?: Visit & { venues?: Venue }
}

export type BrandUser = {
  id: string
  user_id: string
  brand_id: string
  brands?: Brand
}

export const VENUE_TYPES = [
  'Bar',
  'Restaurante',
  'Balada',
  'Hotel',
  'Rooftop',
  'Clube',
  'Lounge',
  'Empório',
  'Outro',
]

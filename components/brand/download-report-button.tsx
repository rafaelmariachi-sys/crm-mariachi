'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { generateBrandReportPDF } from '@/lib/generate-brand-report'

interface Props {
  brandIds: string[]
  brandName: string
  /** Quando fornecido, o seletor de mês fica oculto e este valor é usado */
  controlledMonth?: string
}

export function DownloadReportButton({ brandIds, brandName, controlledMonth }: Props) {
  const [loading, setLoading] = useState(false)
  const [internalMonth, setInternalMonth] = useState(
    format(subMonths(new Date(), 1), 'yyyy-MM')
  )
  const selectedMonth = controlledMonth ?? internalMonth

  async function generate() {
    if (!brandIds.length) return
    setLoading(true)

    try {
      const supabase = createClient()

      const [year, month] = selectedMonth.split('-').map(Number)
      const refDate = new Date(year, month - 1, 1)
      const start = format(startOfMonth(refDate), 'yyyy-MM-dd')
      const end = format(endOfMonth(refDate), 'yyyy-MM-dd')

      // Visitas: via API route (bypassa RLS — retorna TODAS as visitas)
      const visitsRes = await fetch(`/api/brand/visits?start=${start}&end=${end}`)
      if (!visitsRes.ok) {
        const errData = await visitsRes.json().catch(() => ({}))
        throw new Error(`Erro ao buscar visitas: ${visitsRes.status}${errData.error ? ' — ' + errData.error : ''}`)
      }
      const visitsJson = await visitsRes.json()
      const allVisits: any[] = visitsJson.visits ?? []

      const [{ data: allPositivations }, { data: followups }] = await Promise.all([
        supabase
          .from('positivations')
          .select('id, product_name, status, notes, positivated_at, created_at, venue_id, venues(name, neighborhood, city), visit_id, visits(venues(name, neighborhood, city))')
          .in('brand_id', brandIds)
          .order('positivated_at', { ascending: false, nullsFirst: false }),
        supabase
          .from('followups')
          .select('id, content, due_date, status, visits(venues(name, neighborhood, city))')
          .or(`brand_id.in.(${brandIds.join(',')}),brand_id.is.null`)
          .gte('due_date', start)
          .lte('due_date', end)
          .order('due_date', { ascending: true }),
      ])

      await generateBrandReportPDF(
        brandName,
        selectedMonth,
        allVisits,
        allPositivations ?? [],
        followups ?? []
      )
    } catch (err) {
      console.error('Erro ao gerar relatório:', err)
      alert('Erro ao gerar o relatório. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {!controlledMonth && (
        <input
          type="month"
          value={internalMonth}
          max={format(new Date(), 'yyyy-MM')}
          onChange={(e) => setInternalMonth(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      )}
      <Button onClick={generate} disabled={loading} variant="outline" className="gap-2 whitespace-nowrap">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {loading ? 'Gerando...' : brandName}
      </Button>
    </div>
  )
}

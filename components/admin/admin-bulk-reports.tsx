'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2, CheckCircle, Package } from 'lucide-react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { generateBrandReportPDF } from '@/lib/generate-brand-report'

interface Brand { id: string; name: string }

interface Props {
  brands: Brand[]
}

export function AdminBulkReports({ brands }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(
    format(subMonths(new Date(), 1), 'yyyy-MM')
  )
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [loadingAll, setLoadingAll] = useState(false)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set())

  function getDateRange() {
    const [year, month] = selectedMonth.split('-').map(Number)
    const refDate = new Date(year, month - 1, 1)
    return {
      start: format(startOfMonth(refDate), 'yyyy-MM-dd'),
      end: format(endOfMonth(refDate), 'yyyy-MM-dd'),
    }
  }

  async function fetchAndGenerate(brand: Brand): Promise<boolean> {
    const { start, end } = getDateRange()
    const res = await fetch(`/api/admin/report-data?brandId=${brand.id}&start=${start}&end=${end}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    const data = await res.json()
    await generateBrandReportPDF(brand.name, selectedMonth, data.visits, data.positivations, data.followups)
    return true
  }

  async function generateOne(brand: Brand) {
    setLoadingId(brand.id)
    setErrorIds(prev => { const s = new Set(prev); s.delete(brand.id); return s })
    try {
      await fetchAndGenerate(brand)
      setCompletedIds(prev => new Set(prev).add(brand.id))
    } catch (err: any) {
      console.error(`Erro ao gerar relatório de ${brand.name}:`, err)
      setErrorIds(prev => new Set(prev).add(brand.id))
    }
    setLoadingId(null)
  }

  async function generateAll() {
    setLoadingAll(true)
    setCompletedIds(new Set())
    setErrorIds(new Set())
    for (const brand of brands) {
      setLoadingId(brand.id)
      try {
        await fetchAndGenerate(brand)
        setCompletedIds(prev => new Set(prev).add(brand.id))
      } catch (err: any) {
        console.error(`Erro ao gerar relatório de ${brand.name}:`, err)
        setErrorIds(prev => new Set(prev).add(brand.id))
      }
      setLoadingId(null)
      // Pequeno delay entre downloads para o browser não engasgar
      await new Promise(r => setTimeout(r, 600))
    }
    setLoadingAll(false)
  }

  const isAnyLoading = loadingAll || !!loadingId
  const allDone = completedIds.size === brands.length && brands.length > 0

  return (
    <div className="space-y-5">
      {/* Seletor de mês + botão "Gerar todos" */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Mês de referência</p>
          <input
            type="month"
            value={selectedMonth}
            max={format(new Date(), 'yyyy-MM')}
            onChange={(e) => {
              setSelectedMonth(e.target.value)
              setCompletedIds(new Set())
              setErrorIds(new Set())
            }}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="self-end">
          <Button
            onClick={generateAll}
            disabled={isAnyLoading || brands.length === 0}
            className="gap-2"
          >
            {loadingAll
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />}
            {loadingAll
              ? `Gerando ${completedIds.size + 1} de ${brands.length}...`
              : allDone
              ? 'Gerar novamente (todos)'
              : 'Gerar todos os relatórios'}
          </Button>
        </div>
      </div>

      {allDone && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Todos os {brands.length} relatórios foram gerados com sucesso!
        </div>
      )}

      {/* Lista de marcas */}
      <div className="space-y-2">
        {brands.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma marca cadastrada</p>
          </div>
        ) : (
          brands.map((brand) => {
            const isLoading = loadingId === brand.id
            const isDone = completedIds.has(brand.id)
            const hasError = errorIds.has(brand.id)

            return (
              <div
                key={brand.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  isDone ? 'border-emerald-500/30 bg-emerald-500/5' :
                  hasError ? 'border-red-500/30 bg-red-500/5' :
                  'bg-card'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isDone ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : isLoading ? (
                    <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-border shrink-0" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{brand.name}</p>
                    {hasError && (
                      <p className="text-xs text-red-500">Erro ao gerar — tente novamente</p>
                    )}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateOne(brand)}
                  disabled={isAnyLoading}
                  className="gap-1.5 shrink-0"
                >
                  {isLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Download className="h-3.5 w-3.5" />}
                  {isLoading ? 'Gerando...' : isDone ? 'Baixar novamente' : 'Baixar PDF'}
                </Button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

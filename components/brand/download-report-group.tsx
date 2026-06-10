'use client'

import { useState } from 'react'
import { format, subMonths } from 'date-fns'
import { DownloadReportButton } from './download-report-button'

interface Props {
  brands: { id: string; name: string }[]
}

export function DownloadReportGroup({ brands }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(
    format(subMonths(new Date(), 1), 'yyyy-MM')
  )

  if (brands.length === 1) {
    return (
      <DownloadReportButton
        brandIds={[brands[0].id]}
        brandName={brands[0].name}
      />
    )
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Seletor de mês compartilhado */}
      <input
        type="month"
        value={selectedMonth}
        max={format(new Date(), 'yyyy-MM')}
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      {/* Um botão por marca */}
      <div className="flex flex-wrap justify-end gap-2">
        {brands.map((b) => (
          <DownloadReportButton
            key={b.id}
            brandIds={[b.id]}
            brandName={b.name}
            controlledMonth={selectedMonth}
          />
        ))}
      </div>
    </div>
  )
}

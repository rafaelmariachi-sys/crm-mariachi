'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { POSITIVATION_STATUS_LABELS, PositivationStatus } from '@/lib/types'

interface Props {
  brandIds: string[]
  brandName: string
}

const FOLLOWUP_STATUS_LABELS: Record<string, string> = {
  aberto: 'Aberto',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

export function DownloadReportButton({ brandIds, brandName }: Props) {
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(
    format(subMonths(new Date(), 1), 'yyyy-MM')
  )

  async function generate() {
    if (!brandIds.length) return
    setLoading(true)

    try {
      const { jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const supabase = createClient()

      const [year, month] = selectedMonth.split('-').map(Number)
      const refDate = new Date(year, month - 1, 1)
      const start = format(startOfMonth(refDate), 'yyyy-MM-dd')
      const end = format(endOfMonth(refDate), 'yyyy-MM-dd')
      const monthLabel = format(refDate, "MMMM 'de' yyyy", { locale: ptBR })
      const monthLabelUp = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)
      const now = new Date()

      // ── FETCH DATA ────────────────────────────────────────────────

      const [
        { data: allVisits },
        { data: allPositivations },
        { data: followups },
      ] = await Promise.all([

        // TODAS as visitas do mês — independente de marca
        supabase
          .from('visits')
          .select('id, visited_at, notes, venues(name, neighborhood, city, type)')
          .gte('visited_at', start + 'T00:00:00')
          .lte('visited_at', end + 'T23:59:59')
          .order('visited_at', { ascending: false }),

        // Positivações da marca (todas — para status atual + filtro do mês)
        supabase
          .from('positivations')
          .select('id, product_name, status, notes, positivated_at, created_at, venue_id, venues(name, neighborhood, city), visit_id, visits(venues(name, neighborhood, city))')
          .in('brand_id', brandIds)
          .order('positivated_at', { ascending: false, nullsFirst: false }),

        // Follow-ups da marca com due_date NO mês escolhido
        supabase
          .from('followups')
          .select('id, content, due_date, status, visits(venues(name, neighborhood, city))')
          .or(`brand_id.in.(${brandIds.join(',')}),brand_id.is.null`)
          .gte('due_date', start)
          .lte('due_date', end)
          .order('due_date', { ascending: true }),
      ])

      // Positivações do mês selecionado
      const monthPositivations = (allPositivations || []).filter((p: any) => {
        const date = (p.positivated_at || p.created_at || '').substring(0, 10)
        return date >= start && date <= end
      })

      // Resumo por status (de TODAS as positivações da marca)
      const statusCounts: Record<string, number> = { positivado: 0, em_negociacao: 0, perdido: 0, inativo: 0 }
      ;(allPositivations || []).forEach((p: any) => {
        if (p.status in statusCounts) statusCounts[p.status]++
      })

      // ── BUILD PDF ─────────────────────────────────────────────────

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = doc.internal.pageSize.getWidth()
      const M = 14
      let y = 0

      // — Header —
      doc.setFillColor(15, 15, 15)
      doc.rect(0, 0, W, 32, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(15)
      doc.text(brandName, M, 13)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(`Relatório Mensal — ${monthLabelUp}`, M, 22)
      doc.setFontSize(7.5)
      doc.setTextColor(180, 180, 180)
      doc.text(`Gerado em ${format(now, "dd/MM/yyyy 'às' HH:mm")}`, W - M, 22, { align: 'right' })

      y = 42

      // — Resumo —
      doc.setTextColor(30, 30, 30)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text('RESUMO DO MÊS', M, y)
      y += 4

      const cards = [
        { label: 'Visitas no mês', value: (allVisits || []).length },
        { label: 'Positivações no mês', value: monthPositivations.length },
        { label: 'Positivados (total)', value: statusCounts.positivado },
        { label: 'Em Negociação', value: statusCounts.em_negociacao },
        { label: 'Perdidos', value: statusCounts.perdido + statusCounts.inativo },
        { label: 'Follow-ups no mês', value: (followups || []).length },
      ]

      const cols = 3
      const cardW = (W - M * 2 - (cols - 1) * 3) / cols
      const cardH = 16

      cards.forEach((card, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const cx = M + col * (cardW + 3)
        const cy = y + row * (cardH + 3)
        doc.setDrawColor(220, 220, 220)
        doc.setFillColor(250, 250, 250)
        doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'FD')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(13)
        doc.setTextColor(20, 20, 20)
        doc.text(String(card.value), cx + cardW / 2, cy + 7, { align: 'center' })
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.5)
        doc.setTextColor(100, 100, 100)
        doc.text(card.label, cx + cardW / 2, cy + 13, { align: 'center' })
      })

      y += Math.ceil(cards.length / cols) * (cardH + 3) + 8

      // ── helpers ──────────────────────────────────────────────────
      function section(title: string) {
        if (y > 245) { doc.addPage(); y = 16 }
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9.5)
        doc.setTextColor(15, 15, 15)
        doc.text(title, M, y)
        doc.setDrawColor(200, 200, 200)
        doc.line(M, y + 1.5, W - M, y + 1.5)
        y += 4
      }

      const tbl = {
        styles: { fontSize: 7.5, cellPadding: 2.5, lineColor: [230, 230, 230] as [number, number, number], lineWidth: 0.2 },
        headStyles: { fillColor: [25, 25, 25] as [number, number, number], textColor: 255, fontStyle: 'bold' as const, fontSize: 7.5 },
        alternateRowStyles: { fillColor: [248, 248, 248] as [number, number, number] },
        margin: { left: M, right: M },
      }

      const noData = (msg: string) => [[{
        content: msg,
        colSpan: 10,
        styles: { halign: 'center' as const, textColor: [150, 150, 150] as [number, number, number], fontStyle: 'italic' as const },
      }]]

      // ── 1. TODAS AS VISITAS DO MÊS ──────────────────────────────
      section(`VISITAS — ${monthLabelUp.toUpperCase()}`)

      autoTable(doc, {
        ...tbl,
        startY: y,
        head: [['Data', 'Casa', 'Tipo', 'Bairro · Cidade', 'Observações']],
        body: (allVisits || []).length === 0
          ? noData('Nenhuma visita registrada no período')
          : (allVisits || []).map((v: any) => [
              format(new Date(v.visited_at), 'dd/MM/yyyy', { locale: ptBR }),
              v.venues?.name || '—',
              v.venues?.type || '—',
              [v.venues?.neighborhood, v.venues?.city].filter(Boolean).join(' · ') || '—',
              v.notes || '',
            ]),
        columnStyles: { 0: { cellWidth: 22 }, 2: { cellWidth: 20 }, 4: { cellWidth: 52 } },
      })
      y = (doc as any).lastAutoTable.finalY + 10

      // ── 2. POSITIVAÇÕES DO MÊS ───────────────────────────────────
      section(`POSITIVAÇÕES DO MÊS — ${monthLabelUp.toUpperCase()}`)

      autoTable(doc, {
        ...tbl,
        startY: y,
        head: [['Produto', 'Casa', 'Bairro · Cidade', 'Status', 'Data']],
        body: monthPositivations.length === 0
          ? noData('Nenhuma positivação no período')
          : monthPositivations.map((p: any) => {
              const v = p.venues || p.visits?.venues
              const date = (p.positivated_at || p.created_at || '').substring(0, 10)
              return [
                p.product_name || '—',
                v?.name || '—',
                [v?.neighborhood, v?.city].filter(Boolean).join(' · ') || '—',
                POSITIVATION_STATUS_LABELS[p.status as PositivationStatus] || p.status,
                date ? format(new Date(date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '—',
              ]
            }),
        columnStyles: { 3: { cellWidth: 28 }, 4: { cellWidth: 22 } },
      })
      y = (doc as any).lastAutoTable.finalY + 10

      // ── 3. STATUS ATUAL — TODAS AS POSITIVAÇÕES ──────────────────
      section('POSITIVAÇÕES — STATUS ATUAL (TODAS)')

      autoTable(doc, {
        ...tbl,
        startY: y,
        head: [['Produto', 'Casa', 'Bairro · Cidade', 'Status']],
        body: (allPositivations || []).length === 0
          ? noData('Nenhuma positivação cadastrada')
          : (allPositivations || []).map((p: any) => {
              const v = p.venues || p.visits?.venues
              return [
                p.product_name || '—',
                v?.name || '—',
                [v?.neighborhood, v?.city].filter(Boolean).join(' · ') || '—',
                POSITIVATION_STATUS_LABELS[p.status as PositivationStatus] || p.status,
              ]
            }),
        columnStyles: { 3: { cellWidth: 28 } },
      })
      y = (doc as any).lastAutoTable.finalY + 10

      // ── 4. FOLLOW-UPS DO MÊS ─────────────────────────────────────
      section(`FOLLOW-UPS — ${monthLabelUp.toUpperCase()}`)

      autoTable(doc, {
        ...tbl,
        startY: y,
        head: [['Conteúdo', 'Casa', 'Vencimento', 'Status']],
        body: (followups || []).length === 0
          ? noData('Nenhum follow-up com vencimento neste período')
          : (followups || []).map((f: any) => [
              f.content || '—',
              f.visits?.venues?.name || '—',
              f.due_date
                ? format(new Date(f.due_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                : 'Sem prazo',
              FOLLOWUP_STATUS_LABELS[f.status] || f.status,
            ]),
        columnStyles: { 0: { cellWidth: 75 }, 2: { cellWidth: 24 }, 3: { cellWidth: 24 } },
      })

      // — Footer —
      const total = doc.getNumberOfPages()
      for (let i = 1; i <= total; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setTextColor(170, 170, 170)
        doc.text(
          `${brandName} · Relatório ${monthLabelUp} · Pág. ${i} de ${total}`,
          W / 2,
          doc.internal.pageSize.getHeight() - 6,
          { align: 'center' }
        )
      }

      doc.save(`relatorio-${brandName.toLowerCase().replace(/\s+/g, '-')}-${selectedMonth}.pdf`)
    } catch (err) {
      console.error('Erro ao gerar relatório:', err)
      alert('Erro ao gerar o relatório. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="month"
        value={selectedMonth}
        max={format(new Date(), 'yyyy-MM')}
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <Button onClick={generate} disabled={loading} variant="outline" className="gap-2 whitespace-nowrap">
        {loading
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <Download className="h-4 w-4" />}
        {loading ? 'Gerando...' : 'Baixar Relatório'}
      </Button>
    </div>
  )
}

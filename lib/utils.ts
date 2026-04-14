import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, fmt = "dd/MM/yyyy") {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: ptBR })
}

export function formatDateTime(date: string | Date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function getDueDateLabel(dueDate: string | null): { label: string; urgent: boolean } {
  if (!dueDate) return { label: 'Sem prazo', urgent: false }
  const d = parseISO(dueDate)
  if (isToday(d)) return { label: 'Hoje', urgent: true }
  if (isTomorrow(d)) return { label: 'Amanhã', urgent: true }
  if (isPast(d)) return { label: `Vencido (${formatDate(dueDate)})`, urgent: true }
  return { label: formatDate(dueDate), urgent: false }
}

export function getCurrentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  }
}

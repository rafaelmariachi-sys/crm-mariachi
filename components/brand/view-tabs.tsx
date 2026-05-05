'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Building2, Package } from 'lucide-react'

const VIEW_OPTIONS = [
  { value: 'casa', label: 'Por casa', icon: Building2 },
  { value: 'produto', label: 'Por produto', icon: Package },
]

export function ViewTabs() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selected = searchParams.get('view') || 'casa'

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'casa') params.delete('view')
    else params.set('view', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex gap-2">
      {VIEW_OPTIONS.map((opt) => {
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            onClick={() => select(opt.value)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors',
              selected === opt.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

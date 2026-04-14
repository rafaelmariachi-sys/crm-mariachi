'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

type Brand = { id: string; name: string }

export function BrandTabs({ brands }: { brands: Brand[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selected = searchParams.get('brand') || 'all'

  if (brands.length <= 1) return null

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') params.delete('brand')
    else params.set('brand', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={() => select('all')}
        className={cn(
          'px-4 py-1.5 rounded-full text-sm font-medium border transition-colors',
          selected === 'all'
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
        )}
      >
        Todas
      </button>
      {brands.map((b) => (
        <button
          key={b.id}
          onClick={() => select(b.id)}
          className={cn(
            'px-4 py-1.5 rounded-full text-sm font-medium border transition-colors',
            selected === b.id
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
          )}
        >
          {b.name}
        </button>
      ))}
    </div>
  )
}

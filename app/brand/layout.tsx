import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BrandSidebar } from '@/components/brand/sidebar'

export default async function BrandLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: brandUsers } = await supabase
    .from('brand_users')
    .select('brand_id, brands(name)')
    .eq('user_id', user.id)

  if (!brandUsers || brandUsers.length === 0) redirect('/admin/dashboard')

  const brandName = (brandUsers as any[]).map((bu) => bu.brands?.name).filter(Boolean).join(' & ')

  return (
    <div className="min-h-screen bg-background">
      <BrandSidebar brandName={brandName} />
      <div className="lg:pl-56">
        <main className="pt-14 lg:pt-0 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}

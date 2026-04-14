import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BrandSidebar } from '@/components/brand/sidebar'

export default async function BrandLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: brandUser } = await supabase
    .from('brand_users')
    .select('brand_id, brands(name)')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!brandUser) redirect('/admin/dashboard')

  const brandName = (brandUser as any).brands?.name

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

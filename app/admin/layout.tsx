import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Verify admin (no brand_user records)
  const { data: brandUsers } = await supabase
    .from('brand_users')
    .select('brand_id')
    .eq('user_id', user.id)
    .limit(1)

  if (brandUsers && brandUsers.length > 0) redirect('/brand/dashboard')

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="lg:pl-56">
        <main className="pt-14 lg:pt-0 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}

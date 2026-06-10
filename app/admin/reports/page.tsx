import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileDown } from 'lucide-react'
import { AdminBulkReports } from '@/components/admin/admin-bulk-reports'

export const dynamic = 'force-dynamic'

export default async function AdminReportsPage() {
  const supabase = createClient()
  const { data: brands } = await supabase
    .from('brands')
    .select('id, name')
    .order('name')

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground text-sm">
          Gere os PDFs mensais para enviar às marcas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileDown className="h-4 w-4" />
            Relatórios por marca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdminBulkReports brands={brands ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}

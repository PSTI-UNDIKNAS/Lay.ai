import { Button } from '@/components/ui/button'
import { Download, Settings, BarChart3, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DashboardHeader() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-600">Complete platform oversight and management</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export Data</Button>
          <Button variant="outline" className="gap-2"><Settings className="h-4 w-4" /> Settings</Button>
        </div>
      </div>

      <div className="border-b border-zinc-200" />

      <div className="flex items-center gap-6">
        <TabItem active icon={<BarChart3 className="h-4 w-4" />}>Overview</TabItem>
        <TabItem icon={<UserCheck className="h-4 w-4" />}>Lecturer Approvals <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs">8</span></TabItem>
      </div>
    </div>
  )
}

function TabItem({ children, icon, active }: { children: React.ReactNode; icon?: React.ReactNode; active?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2 pb-3 text-sm font-medium', active ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-600')}>{icon}{children}</div>
  )
}


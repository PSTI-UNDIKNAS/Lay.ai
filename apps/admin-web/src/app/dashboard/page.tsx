import AdminShell from '@/components/admin/AdminShell'
import DashboardHeader from '@/components/admin/DashboardHeader'
import StatCard from '@/components/admin/StatCard'
import Card from '@/components/admin/Card'
import { Users, BookOpen, Clock, ShieldCheck, TrendingUp, FileText, Activity, UserCheck, ClipboardList } from 'lucide-react'

export default function DashboardPage() {
  return (
    <AdminShell>
      <div className="space-y-8">
        <DashboardHeader />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Users"
            value={<span>1,247</span>}
            subtitle={<span className="text-zinc-600">45 lecturers, 1202 students</span>}
            icon={<Users className="h-6 w-6" />}
          />
          <StatCard
            title="Active Courses"
            value={<span>28</span>}
            subtitle={<div className="flex items-center gap-2 text-sm text-green-600"><TrendingUp className="h-4 w-4" /> <span>+3 this month</span></div>}
            icon={<BookOpen className="h-6 w-6" />}
          />
          <StatCard
            title="Pending Lecturers"
            value={<span className="text-orange-600">8</span>}
            subtitle={<span className="text-orange-600">Requires approval</span>}
            icon={<Clock className="h-6 w-6 text-orange-600" />}
          />
          <StatCard
            title="System Health"
            value={<span>99.9%</span>}
            subtitle={<span className="text-green-600">Uptime</span>}
            icon={<ShieldCheck className="h-6 w-6" />}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card title="Learning Content">
            <div className="space-y-3">
              <div className="flex items-center justify-between"><span className="text-zinc-600">Learning Units</span><span className="font-semibold text-zinc-900">156</span></div>
              <div className="flex items-center justify-between"><span className="text-zinc-600">Assignments</span><span className="font-semibold text-zinc-900">89</span></div>
              <div className="flex items-center justify-between"><span className="text-zinc-600">Quizzes</span><span className="font-semibold text-zinc-900">134</span></div>
            </div>
          </Card>

          <Card title="Recent Activity">
            <div className="space-y-3">
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-600" /> <span className="text-zinc-700">2 courses published</span></div>
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-orange-500" /> <span className="text-zinc-700">3 lecturer applications</span></div>
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-violet-600" /> <span className="text-zinc-700">12 assignments submitted</span></div>
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-zinc-900" /> <span className="text-zinc-700">Platform analytics updated</span></div>
            </div>
          </Card>

          <Card title="Quick Actions">
            <div className="space-y-3">
              <button className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-100">
                <span className="flex items-center gap-2"><UserCheck className="h-4 w-4" /> Review Lecturer Applications</span>
              </button>
              <button className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-100">
                <span className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Process Enrollments</span>
              </button>
            </div>
          </Card>
        </div>
      </div>
    </AdminShell>
  )
}

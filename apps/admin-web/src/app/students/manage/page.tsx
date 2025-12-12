import AdminShell from '@/components/admin/AdminShell'
import Card from '@/components/admin/Card'
import StatCard from '@/components/admin/StatCard'
import { Input } from '@/components/ui/input'
import { GraduationCap, CheckCircle, Clock } from 'lucide-react'

const students = [
  { name: 'Alice Johnson', email: 'alice.johnson@email.com', joinDate: '10/01/2024', status: 'active' as const },
  { name: 'Bob Smith', email: 'bob.smith@email.com', joinDate: '08/01/2024', status: 'active' as const },
  { name: 'Carol Davis', email: 'carol.davis@email.com', joinDate: '15/12/2023', status: 'active' as const },
  { name: 'David Wilson', email: 'david.wilson@email.com', joinDate: '05/01/2024', status: 'active' as const },
  { name: 'Eva Brown', email: 'eva.brown@email.com', joinDate: '12/01/2024', status: 'pending' as const },
  { name: 'Frank Miller', email: 'frank.miller@email.com', joinDate: '15/01/2024', status: 'active' as const },
]

function StatusBadge({ status }: { status: 'active' | 'pending' }) {
  const styles = status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-orange-50 text-orange-700 border border-orange-200'
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles}`}>{status}</span>
}

export default function ManageStudentsPage() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Manage Students</h1>
          <p className="mt-2 text-sm text-zinc-600">View and manage all registered student accounts</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard title="Total Students" value={<span>8</span>} icon={<GraduationCap className="h-6 w-6" />} />
          <StatCard title="Active Students" value={<span>6</span>} icon={<CheckCircle className="h-6 w-6 text-green-600" />} />
          <StatCard title="Pending Approval" value={<span className="text-orange-600">2</span>} icon={<Clock className="h-6 w-6 text-orange-600" />} />
        </div>

        <Card>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <Input placeholder="Search students by name or email..." />
            </div>
            <div>
              <select className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900">
                <option>All Status</option>
                <option>Active</option>
                <option>Pending</option>
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-1/2">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-32">Join Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-24">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((row) => (
                  <tr key={row.email} className="border-b border-zinc-100">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 text-xs font-semibold">
                          {row.name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-zinc-900">{row.name}</div>
                          <div className="text-xs text-zinc-600">{row.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-zinc-900">{row.joinDate}</div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-4">
                        <button className="text-sm font-medium text-blue-600 hover:text-blue-700">View</button>
                        <button className="text-sm font-medium text-red-600 hover:text-red-700">Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminShell>
  )
}

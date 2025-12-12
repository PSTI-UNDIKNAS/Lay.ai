import AdminShell from '@/components/admin/AdminShell'
import Card from '@/components/admin/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

const data = [
  {
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@stanford.edu',
    department: 'Computer Science',
    appliedAt: 'Mar 10, 2024, 06:00 PM',
    status: 'pending' as const,
  },
  {
    name: 'Prof. Michael Chen',
    email: 'michael.chen@mit.edu',
    department: 'Electrical Engineering',
    appliedAt: 'Mar 9, 2024, 11:00 PM',
    status: 'pending' as const,
  },
  {
    name: 'Dr. Emily Rodriguez',
    email: 'emily.rodriguez@berkeley.edu',
    department: 'Mathematics',
    appliedAt: 'Mar 8, 2024, 08:00 PM',
    status: 'approved' as const,
  },
  {
    name: 'Dr. James Wilson',
    email: 'james.wilson@community.edu',
    department: 'Business',
    appliedAt: 'Mar 8, 2024, 01:00 AM',
    status: 'rejected' as const,
  },
]

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const styles =
    status === 'approved'
      ? 'bg-green-50 text-green-700 border border-green-200'
      : status === 'rejected'
      ? 'bg-red-50 text-red-700 border border-red-200'
      : 'bg-orange-50 text-orange-700 border border-orange-200'
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles}`}>{status}</span>
}

export default function LecturerApprovalsPage() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-zinc-900">Lecturer Applications</h1>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="relative w-full max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-zinc-500" />
              </div>
              <Input className="pl-10" placeholder="Search applicants, email, department..." />
            </div>
            <div className="flex items-center gap-2">
              <select className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900">
                <option>All Status</option>
                <option>Pending</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-1/4">Applicant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-1/4">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-1/4">Applied Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-24">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-48">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.email} className="border-b border-zinc-100">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 text-sm font-semibold">
                          {row.name.split(' ').map((n) => n[0]).slice(0, 1)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-zinc-900">{row.name}</div>
                          <div className="text-xs text-zinc-600">{row.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-zinc-900">{row.department}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-zinc-900">{row.appliedAt}</div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">Approve</Button>
                        <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">Reject</Button>
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

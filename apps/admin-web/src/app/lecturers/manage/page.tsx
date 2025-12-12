import AdminShell from '@/components/admin/AdminShell'
import Card from '@/components/admin/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CircleUser, Pencil, Trash2, MoreVertical } from 'lucide-react'

const lecturers = [
  { name: 'Dr. Sarah Johnson', email: 'sarah.johnson@university.edu', students: 45, joinDate: '15/09/2023', status: 'active' as const },
  { name: 'Prof. Michael Chen', email: 'michael.chen@university.edu', students: 38, joinDate: '20/08/2023', status: 'active' as const },
  { name: 'Dr. Emily Rodriguez', email: 'emily.rodriguez@university.edu', students: 52, joinDate: '01/10/2023', status: 'active' as const },
  { name: 'Dr. James Wilson', email: 'james.wilson@university.edu', students: 29, joinDate: '10/07/2023', status: 'inactive' as const },
]

function StatusBadge({ status }: { status: 'active' | 'inactive' }) {
  const styles = status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles}`}>{status}</span>
}

export default function ManageLecturerPage() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Manage Lecturers</h1>
            <p className="mt-2 text-sm text-zinc-600">Add, invite, and manage lecturer accounts</p>
          </div>
          <Button className="bg-red-600 text-white hover:bg-red-700">+ Invite Lecturer</Button>
        </div>

        <Card>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <Input placeholder="Search lecturers by name or email..." />
            </div>
            <div>
              <select className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900">
                <option>All Status</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-1/3">Lecturer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-24">Students</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-32">Join Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-24">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lecturers.map((row) => (
                  <tr key={row.email} className="border-b border-zinc-100">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
                          <CircleUser className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-zinc-900">{row.name}</div>
                          <div className="text-xs text-zinc-600">{row.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-zinc-900">{row.students}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-zinc-900">{row.joinDate}</div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                        <Button variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50"><MoreVertical className="h-4 w-4" /></Button>
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

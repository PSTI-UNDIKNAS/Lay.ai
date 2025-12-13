"use client"

import { useEffect, useState } from 'react'
import AdminShell from '@/components/admin/AdminShell'
import Card from '@/components/admin/Card'
import StatCard from '@/components/admin/StatCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GraduationCap, CheckCircle, Clock, Pencil, Trash2, MoreVertical } from 'lucide-react'
import { getUsers, deleteUser, type AdminUser, type AdminUserStatus } from '@/lib/admin-api'
import InviteUserModal from '@/components/admin/InviteUserModal'
import EditUserModal from '@/components/admin/EditUserModal'

function StatusBadge({ status }: { status: AdminUserStatus }) {
  const styles =
    status === 'active'
      ? 'bg-green-50 text-green-700 border border-green-200'
      : status === 'inactive'
      ? 'bg-red-50 text-red-700 border border-red-200'
      : 'bg-orange-50 text-orange-700 border border-orange-200'
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles}`}>{status}</span>
}

export default function ManageStudentsPage() {
  const [students, setStudents] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)

  useEffect(() => {
    getUsers({ role: 'student', limit: 50 })
      .then((users) => {
        setStudents(users)
        setError(null)
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : 'Failed to load students'
        setError(msg)
      })
      .finally(() => setLoading(false))
  }, [])
  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Manage Students</h1>
            <p className="mt-2 text-sm text-zinc-600">View and manage all registered student accounts</p>
          </div>
          <div>
            <button className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800" onClick={() => setShowInvite((v) => !v)}>+ Invite Student</button>
          </div>
        </div>

        {showInvite && (
          <InviteUserModal
            open={showInvite}
            onClose={() => setShowInvite(false)}
            role="student"
            defaultStatus="active"
            onInvited={(user) => setStudents((list) => [user, ...list])}
          />
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard title="Total Students" value={<span>{students.length}</span>} icon={<GraduationCap className="h-6 w-6" />} />
          <StatCard title="Active Students" value={<span>{students.filter((s) => s.status === 'active').length}</span>} icon={<CheckCircle className="h-6 w-6 text-green-600" />} />
          <StatCard title="Pending Approval" value={<span className="text-orange-600">{students.filter((s) => s.status === 'pending_approval').length}</span>} icon={<Clock className="h-6 w-6 text-orange-600" />} />
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
            <div className="relative">
              <table className="min-w-full table-fixed">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-1/2">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-1/2">NIM</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-32">Join Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-24">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-32">Actions</th>
                  </tr>
                </thead>
              </table>
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full table-fixed">
                  <tbody>
                    {loading && (
                      <tr>
                        <td className="px-4 py-6 text-sm text-zinc-600" colSpan={5}>Loading students…</td>
                      </tr>
                    )}
                    {error && !loading && (
                      <tr>
                        <td className="px-4 py-6 text-sm text-red-700" colSpan={5}>{error}</td>
                      </tr>
                    )}
                    {!loading && !error && students.length === 0 && (
                      <tr>
                        <td className="px-4 py-6 text-sm text-zinc-600" colSpan={5}>No students found</td>
                      </tr>
                    )}
                    {!loading && !error && students.map((row) => (
                      <tr key={row.id} className="border-b border-zinc-100">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 text-xs font-semibold">
                              {row.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-zinc-900">{row.name}</div>
                              <div className="text-xs text-zinc-600">{row.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-zinc-900">{row.unique_identifier}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-zinc-900">{new Date(row.created_at).toLocaleDateString()}</div>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              className="border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                              onClick={() => setEditingUser(row)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              className="border-red-200 text-red-700 hover:bg-red-50"
                              onClick={async () => {
                                if (!confirm('Delete this student?')) return
                                try {
                                  await deleteUser(row.id)
                                  setStudents((list) => list.filter((u) => u.id !== row.id))
                                } catch (e) {
                                  alert(e instanceof Error ? e.message : 'Failed to delete user')
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Card>
        {editingUser && (
          <EditUserModal
            open={true}
            onClose={() => setEditingUser(null)}
            user={editingUser}
            onUpdated={(updated) => setStudents((list) => list.map((u) => (u.id === updated.id ? updated : u)))}
          />
        )}
      </div>
    </AdminShell>
  )
}

"use client"

import { useEffect, useState } from 'react'
import AdminShell from '@/components/admin/AdminShell'
import Card from '@/components/admin/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { getPendingLecturers, approveLecturer, type PendingLecturer } from '@/lib/admin-api'

function StatusBadge() {
  return <span className="rounded-full px-3 py-1 text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">pending</span>
}

export default function LecturerApprovalsPage() {
  const [lecturers, setLecturers] = useState<PendingLecturer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [approveError, setApproveError] = useState<string | null>(null)

  useEffect(() => {
    getPendingLecturers()
      .then((list) => {
        setLecturers(list)
        setError(null)
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : 'Failed to load applicants'
        setError(msg)
      })
      .finally(() => setLoading(false))
  }, [])
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
          {approveError && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{approveError}</div>
          )}
          <div className="overflow-x-auto">
            <div className="relative">
              <table className="min-w-full table-fixed">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-1/4">Applicant</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-1/4">Unique ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-1/4">Applied Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-24">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 w-48">Actions</th>
                  </tr>
                </thead>
              </table>
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full table-fixed">
                  <tbody>
                    {loading && (
                      <tr>
                        <td className="px-4 py-6 text-sm text-zinc-600" colSpan={5}>Loading applicants…</td>
                      </tr>
                    )}
                    {error && !loading && (
                      <tr>
                        <td className="px-4 py-6 text-sm text-red-700" colSpan={5}>{error}</td>
                      </tr>
                    )}
                    {!loading && !error && lecturers.length === 0 && (
                      <tr>
                        <td className="px-4 py-6 text-sm text-zinc-600" colSpan={5}>No pending lecturer applications</td>
                      </tr>
                    )}
                    {!loading && !error && lecturers.map((row) => (
                      <tr key={row.id} className="border-b border-zinc-100">
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
                          <div className="text-sm text-zinc-900">{row.unique_identifier}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-zinc-900">{new Date(row.created_at).toLocaleString()}</div>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              className="border-green-200 text-green-700 hover:bg-green-50"
                              isLoading={approvingId === row.id}
                              onClick={async () => {
                                setApproveError(null)
                                setApprovingId(row.id)
                                try {
                                  await approveLecturer(row.id)
                                  setLecturers((list) => list.filter((l) => l.id !== row.id))
                                } catch (e) {
                                  const msg = e instanceof Error ? e.message : 'Failed to approve lecturer'
                                  setApproveError(msg)
                                } finally {
                                  setApprovingId(null)
                                }
                              }}
                            >
                              Approve
                            </Button>
                            <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" disabled>Reject</Button>
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
      </div>
    </AdminShell>
  )
}

"use client"

import { useEffect, useState } from 'react'
import Modal from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateUser, type AdminUser, type AdminUserStatus } from '@/lib/admin-api'

export default function EditUserModal({ open, onClose, user, onUpdated }: { open: boolean; onClose: () => void; user: AdminUser; onUpdated: (user: AdminUser) => void }) {
  const [form, setForm] = useState<{ name: string; email: string; unique_identifier: string; status: AdminUserStatus }>({ name: user.name, email: user.email, unique_identifier: user.unique_identifier, status: user.status })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({ name: user.name, email: user.email, unique_identifier: user.unique_identifier, status: user.status })
      setError(null)
    }
  }, [open, user])

  return (
    <Modal open={open} onClose={onClose} title="Edit Student">
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input placeholder="Full name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <Input placeholder="Unique ID" value={form.unique_identifier} onChange={(e) => setForm((f) => ({ ...f, unique_identifier: e.target.value }))} />
          <div>
            <select className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as AdminUserStatus }))}>
              <option value="active">Active</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        {error && <div className="text-sm text-red-700">{error}</div>}
        <div className="flex gap-2">
          <Button
            onClick={async () => {
              setError(null)
              setLoading(true)
              try {
                const updated = await updateUser(user.id, { name: form.name, email: form.email, unique_identifier: form.unique_identifier, status: form.status })
                onUpdated(updated)
                onClose()
              } catch (e) {
                const msg = e instanceof Error ? e.message : 'Failed to update user'
                setError(msg)
              } finally {
                setLoading(false)
              }
            }}
            className="bg-zinc-900 text-white hover:bg-zinc-800"
            isLoading={loading}
          >
            Save Changes
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}

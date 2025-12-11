'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from '@/components/admin/Sidebar'

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
        <button
          className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
          Menu
        </button>
        <div className="text-base font-semibold text-zinc-900">Admin</div>
      </div>

      <div className="flex min-h-[calc(100vh-0px)]">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from '@/components/lecturer/Sidebar'
import { useRouter } from 'next/navigation'
import { getMe } from '@/lib/auth-api'

export default function LecturerShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    getMe()
      .then(() => {
        if (!mounted) return
        setAuthError(null)
      })
      .catch(() => {
        if (!mounted) return
        setAuthError('Invalid or expired token')
        try {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          sessionStorage.removeItem('token')
          sessionStorage.removeItem('user')
        } catch {}
        router.replace('/login')
      })
    return () => {
      mounted = false
    }
  }, [router])

  return (
    <div className="min-h-screen bg-white">
      {authError && (
        <div className="sticky top-0 z-40 w-full bg-red-50 text-red-700 border-b border-red-200 px-4 py-2 text-sm">
          {authError}
        </div>
      )}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
        <button
          className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
          Menu
        </button>
        <div className="text-base font-semibold text-zinc-900">Lecturer</div>
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


'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, BookOpen, Bot, User, Users } from 'lucide-react'
import { logout } from '@/lib/auth-api'

const items = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'My Courses', href: '/courses', icon: BookOpen },
  { label: 'My Students', href: '/students', icon: Users },
  { label: 'AI Chatbot', href: '/ai', icon: Bot },
  { label: 'Profile', href: '/profile', icon: User },
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    try {
      await logout()
    } catch {}
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('user')
    } catch {}
    if (onNavigate) onNavigate()
    router.replace('/login')
  }

  return (
    <nav className="h-screen w-64 border-r border-zinc-200 bg-white p-4 flex flex-col">
      <div className="mb-6 text-xl font-semibold text-zinc-900">Lecturer</div>
      <ul className="space-y-1">
        {items.map(({ label, href, icon: Icon }) => {
          const active = pathname?.endsWith(href)
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100',
                  active && 'bg-zinc-100 text-zinc-900'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
      <button
        onClick={handleLogout}
        className="mt-auto w-full rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
      >
        Logout
      </button>
    </nav>
  )
}

export default Sidebar

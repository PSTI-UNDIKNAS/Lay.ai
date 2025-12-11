'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, BadgeCheck, UserCog, Users, Bot } from 'lucide-react'

const items = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Lecturer Approvals', href: '/lecturers/approvals', icon: BadgeCheck },
  { label: 'Manage Lecturer', href: '/lecturers/manage', icon: UserCog },
  { label: 'Manage Students', href: '/students/manage', icon: Users },
  { label: 'AI Features', href: '/ai', icon: Bot },
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="h-screen w-64 border-r border-zinc-200 bg-white p-4">
      <div className="mb-6 text-xl font-semibold text-zinc-900">Admin</div>
      <ul className="space-y-1">
        {items.map(({ label, href, icon: Icon }) => {
          const active = pathname?.startsWith(href)
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
    </nav>
  )
}

export default Sidebar

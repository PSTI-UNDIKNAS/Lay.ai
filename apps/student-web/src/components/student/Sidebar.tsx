'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bot, BookOpen, GraduationCap, LayoutDashboard, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearAuthStorage, requestLogout } from '@/lib/auth';

const items = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Course Catalog', href: '/course-catalog', icon: BookOpen },
  { label: 'Enrolled Courses', href: '/enrolled-courses', icon: GraduationCap },
  { label: 'AI Chatbot', href: '/ai', icon: Bot },
  { label: 'Profile', href: '/profile', icon: User },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await requestLogout();
    clearAuthStorage();
    if (onNavigate) onNavigate();
    router.replace('/login');
  }

  return (
    <nav className="h-screen w-64 border-r border-zinc-200 bg-white p-4 flex flex-col">
      <div className="mb-6 flex items-center gap-2 text-xl font-semibold text-zinc-900">
        <BookOpen className="h-12 w-12 text-[#5277DE]" />
        <span className="text-xl text-[#5277DE]">LAY.AI</span>
      </div>
      <ul className="space-y-1">
        {items.map(({ label, href, icon: Icon }) => {
          const active = pathname?.endsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                className={cn(
                  'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-[#DBE9FE] hover:text-[#1F3A89]',
                  active && 'bg-[#DBE9FE] text-[#1F3A89]',
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 text-zinc-600 group-hover:text-[#5277DE]',
                    active && 'text-[#5277DE]',
                  )}
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <button
        onClick={() => void handleLogout()}
        className="mt-auto w-full rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
      >
        Logout
      </button>
    </nav>
  );
}

export default Sidebar;

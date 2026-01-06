'use client';

import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/student/Sidebar';
import { clearAuthStorage, fetchMe, isActiveStudent } from '@/lib/auth';

export default function StudentShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    fetchMe()
      .then((res) => {
        if (!mounted) return;
        if (!isActiveStudent(res.user)) {
          setAuthError('Only active student accounts can access this area');
          clearAuthStorage();
          router.replace('/login');
          return;
        }
        setAuthError(null);
      })
      .catch(() => {
        if (!mounted) return;
        setAuthError('Invalid or expired token');
        clearAuthStorage();
        router.replace('/login');
      });
    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div className="h-screen bg-white overflow-hidden">
      {authError && (
        <div className="sticky top-0 z-40 w-full bg-red-50 text-red-700 border-b border-red-200 px-4 py-2 text-sm">
          {authError}
        </div>
      )}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
        <button
          className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          onClick={() => setOpen(true)}
          type="button"
        >
          <Menu className="h-5 w-5" />
          Menu
        </button>
        <div className="text-base font-semibold text-zinc-900">Student</div>
      </div>

      <div className="flex h-full">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <main className="flex flex-1 flex-col p-4 md:p-8 overflow-hidden">{children}</main>
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
  );
}


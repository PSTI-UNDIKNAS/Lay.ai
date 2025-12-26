'use client';

import { useEffect, useState } from 'react';
import StudentShell from '@/components/student/StudentShell';
import Card from '@/components/student/Card';
import { fetchMe, StudentUser } from '@/lib/auth';

export default function StudentProfilePage() {
  const [user, setUser] = useState<StudentUser | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchMe()
      .then((res) => {
        if (!mounted) return;
        setUser(res.user);
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <StudentShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Profile</h1>
        <Card title="Account">
          <div className="grid gap-2 text-sm text-zinc-700">
            <div className="flex items-center justify-between gap-4">
              <div className="text-zinc-600">Name</div>
              <div className="text-zinc-900 font-medium">{user?.name || '—'}</div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="text-zinc-600">Email</div>
              <div className="text-zinc-900 font-medium">{user?.email || '—'}</div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="text-zinc-600">Student ID</div>
              <div className="text-zinc-900 font-medium">{user?.unique_identifier || '—'}</div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="text-zinc-600">Status</div>
              <div className="text-zinc-900 font-medium">{user?.status || '—'}</div>
            </div>
          </div>
        </Card>
      </div>
    </StudentShell>
  );
}


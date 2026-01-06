'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import StudentShell from '@/components/student/StudentShell';
import Card from '@/components/student/Card';
import { fetchMe, StudentUser } from '@/lib/auth';
import { BadgeCheck, Mail, Shield, User } from 'lucide-react';

export default function StudentProfilePage() {
  const [me, setMe] = useState<StudentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMe = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMe();
      setMe(res.user);
      setError(null);
    } catch (err) {
      setMe(null);
      setError(err instanceof Error ? err.message : 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const initials = useMemo(() => {
    if (!me?.name) return 'S';
    return me.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('');
  }, [me?.name]);

  const inputBase =
    'flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 ring-offset-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <StudentShell>
      <div className="space-y-8">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-lg font-semibold text-white">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900">{me?.name || 'Student Profile'}</h1>
              <p className="mt-1 text-sm text-zinc-600">Manage your account information and security settings</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <Card title="Account Details">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">Full Name</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <User className="h-4 w-4 text-zinc-400" />
                    </div>
                    <input value={me?.name || ''} disabled className={`${inputBase} pl-9`} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">Email</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Mail className="h-4 w-4 text-zinc-400" />
                    </div>
                    <input value={me?.email || ''} disabled className={`${inputBase} pl-9`} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">Unique ID</label>
                  <input value={me?.unique_identifier || ''} disabled className={inputBase} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">Role</label>
                  <div className="inline-flex h-10 items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm font-medium capitalize text-zinc-700">
                    {me?.role || 'student'}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">Status</label>
                  <div className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium capitalize text-zinc-700">
                    <BadgeCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                    {me?.status || 'active'}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-zinc-500">Profile information is synchronized with your student account.</div>
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading}
                  onClick={() => void loadMe()}
                >
                  Refresh
                </button>
              </div>
            </div>
          </Card>

          <Card title="Security">
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <div className="mt-0.5 rounded-md bg-zinc-900 p-1.5 text-white">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-zinc-900">Account Security</div>
                  <div className="mt-1 text-xs text-zinc-600">
                    Your account is protected by the platform&apos;s authentication system. Contact the administrator if you need to update your credentials.
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="inline-flex h-10 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled
              >
                Change Password (managed by admin)
              </button>
            </div>
          </Card>
        </div>
      </div>
    </StudentShell>
  );
}

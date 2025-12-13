"use client";

import { useEffect, useState } from 'react';
import LecturerShell from '@/components/lecturer/LecturerShell';
import { getMe } from '@/lib/auth-api';

export default function LecturerDashboard() {
  const [name, setName] = useState<string>('');
  const [identifier, setIdentifier] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    getMe()
      .then((res) => {
        if (!mounted) return;
        setName(res.user.name);
        setIdentifier(res.user.unique_identifier);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <LecturerShell>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Lecturer Dashboard</h1>
            <p className="mt-2 text-sm text-zinc-600">Welcome back{name ? `, ${name}` : ''}</p>
          </div>
        </div>
        <div className="border-b border-zinc-200" />
        <div className="text-sm text-zinc-600">ID: {identifier}</div>
      </div>
    </LecturerShell>
  );
}

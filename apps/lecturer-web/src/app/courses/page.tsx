"use client";

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import LecturerShell from '@/components/lecturer/LecturerShell';
import StatCard from '@/components/lecturer/StatCard';
import Card from '@/components/lecturer/Card';
import { Users, BookOpen, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createCourse, getMyCourses, LecturerCourse } from '@/lib/auth-api';

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<LecturerCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createdMessage, setCreatedMessage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const stats = useMemo(
    () => ({
      totalCourses: courses.length,
      totalStudents: 0,
      learningUnits: 0,
    }),
    [courses],
  );

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    getMyCourses(100, 0)
      .then((data) => {
        if (!mounted) return;
        setCourses(data);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load courses');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  function accessLabel(accessType: string) {
    if (accessType === 'public') return 'Open public';
    if (accessType === 'password') return 'Password protected';
    if (accessType === 'by_request') return 'Request to join';
    return accessType;
  }

  function accessChip(accessType: string) {
    const label = accessLabel(accessType);
    const styles =
      accessType === 'public'
        ? 'bg-green-50 text-green-700 border-green-200'
        : accessType === 'password'
        ? 'bg-orange-50 text-orange-700 border-orange-200'
        : 'bg-blue-50 text-blue-700 border-blue-200';
    return (
      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${styles}`}>{label}</span>
    );
  }

  function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  async function handleCreateCourse() {
    if (!title.trim()) return;
    setCreating(true);
    setError(null);
    setCreatedMessage(null);
    try {
      const course = await createCourse(title.trim(), description.trim(), 'public');
      setCourses((prev) => [course, ...prev]);
      setTitle('');
      setDescription('');
      setCreatedMessage('Course created successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create course');
    } finally {
      setCreating(false);
    }
  }

  return (
    <LecturerShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">My Courses</h1>
            <p className="mt-2 text-sm text-zinc-600">Manage your courses and learning content</p>
          </div>
          <Button variant="outline" onClick={() => { setCreateOpen(true); setCreatedMessage(null); }}>Create Course</Button>
        </div>

        {createOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setCreateOpen(false)}
            />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <Card title="Create Course" className="w-full max-w-xl" bodyClassName="space-y-4">
                {createdMessage && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {createdMessage}
                  </div>
                )}
                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Title</div>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={creating} />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Description</div>
                  <textarea
                    className="min-h-[96px] w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-900/5 placeholder:text-zinc-400 focus-visible:ring-2"
                    value={description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                    disabled={creating}
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Close</Button>
                  <Button variant="outline" onClick={handleCreateCourse} disabled={creating || !title.trim()}>
                    {creating ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard title="Total Course" value={<span>{stats.totalCourses}</span>} icon={<BookOpen className="h-6 w-6" />} />
          <StatCard title="Total Students" value={<span>{stats.totalStudents}</span>} icon={<Users className="h-6 w-6" />} />
          <StatCard title="Learning Units" value={<span>{stats.learningUnits}</span>} icon={<FileText className="h-6 w-6" />} />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {loading && courses.length === 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-600">
              Loading courses...
            </div>
          )}
          {!loading && courses.length === 0 && !error && (
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-600">
              You have not created any courses yet.
            </div>
          )}
          {courses.map((c) => (
            <Card key={c.id} title={c.title} headerRight={accessChip(c.access_type)}>
              <div className="space-y-3">
                <p className="text-sm text-zinc-700">{c.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-3">
                    <Button variant="outline">View</Button>
                    <Button variant="outline">Edit</Button>
                  </div>
                  <div className="text-xs text-zinc-500">Last updated {formatDate(c.updated_at)}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </LecturerShell>
  );
}

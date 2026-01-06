"use client";

import { useEffect, useMemo, useState } from 'react';
import LecturerShell from '@/components/lecturer/LecturerShell';
import StatCard from '@/components/lecturer/StatCard';
import Card from '@/components/lecturer/Card';
import { Users, UserCheck, UserX, Search as SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getCourseEnrolledStudents, getMyCourses, LecturerCourse } from '@/lib/auth-api';

type StudentStatus = 'active' | 'inactive';

interface StudentRow {
  id: string;
  studentId: string;
  name: string;
  email: string;
  nim: string;
  courseId: string;
  courseTitle: string;
  lastActive: string;
  status: StudentStatus;
}

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function statusBadge(status: StudentStatus) {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border';
  const styles =
    status === 'active'
      ? 'bg-green-50 text-green-700 border-green-200'
      : 'bg-zinc-50 text-zinc-600 border-zinc-200';
  const label = status === 'active' ? 'Active' : 'Inactive';
  return <span className={`${base} ${styles}`}>{label}</span>;
}

export default function MyStudentsPage() {
  const [courses, setCourses] = useState<LecturerCourse[]>([]);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | StudentStatus>('all');

  useEffect(() => {
    let mounted = true;
    Promise.resolve().then(() => {
      if (!mounted) return;
      setLoading(true);
      setError(null);
    });

    getMyCourses(200, 0)
      .then(async (data) => {
        if (!mounted) return;
        setCourses(data);
        const grouped = await Promise.all(
          data.map(async (course) => {
            const students = await getCourseEnrolledStudents(course.id);
            return students.map((s): StudentRow => {
              const status: StudentStatus = s.status === 'active' ? 'active' : 'inactive';
              return {
                id: `${course.id}:${s.id}`,
                studentId: s.id,
                name: s.name,
                email: s.email,
                nim: s.unique_identifier,
                courseId: course.id,
                courseTitle: course.title,
                lastActive: formatDateTime(s.updated_at),
                status,
              };
            });
          }),
        );
        if (!mounted) return;
        setRows(grouped.flat());
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load students');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const uniqueStudents = useMemo(() => {
    const map = new Map<string, StudentRow>();
    for (const r of rows) {
      if (!map.has(r.studentId)) map.set(r.studentId, r);
    }
    return Array.from(map.values());
  }, [rows]);

  const stats = useMemo(
    () => ({
      totalStudents: uniqueStudents.length,
      activeStudents: uniqueStudents.filter((s) => s.status === 'active').length,
      inactiveStudents: uniqueStudents.filter((s) => s.status === 'inactive').length,
    }),
    [uniqueStudents],
  );

  const filteredStudents = useMemo(
    () =>
      rows.filter((student) => {
        const matchesSearch =
          !searchTerm ||
          student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.nim.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCourse =
          courseFilter === 'all' || student.courseId === courseFilter;
        const matchesStatus =
          statusFilter === 'all' || student.status === statusFilter;
        return matchesSearch && matchesCourse && matchesStatus;
      }),
    [rows, searchTerm, courseFilter, statusFilter],
  );

  return (
    <LecturerShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">My Students</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Monitor student activity and manage enrollments across your courses
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard
            title="Total Student"
            value={<span>{stats.totalStudents}</span>}
            icon={<Users className="h-6 w-6" />}
          />
          <StatCard
            title="Active Student"
            value={<span>{stats.activeStudents}</span>}
            icon={<UserCheck className="h-6 w-6" />}
          />
          <StatCard
            title="Inactive Student"
            value={<span>{stats.inactiveStudents}</span>}
            icon={<UserX className="h-6 w-6" />}
          />
        </div>

        <Card bodyClassName="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:max-w-xs">
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Search student
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <SearchIcon className="h-4 w-4 text-zinc-400" />
                </div>
                <Input
                  placeholder="Search by name"
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-end">
              <div className="w-full md:w-48">
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Course
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                >
                  <option value="all">All courses</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full md:w-48">
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Status
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as 'all' | StudentStatus)
                  }
                >
                  <option value="all">All status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-zinc-700">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">NIM</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Last Active</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && filteredStudents.length === 0 && (
                  <tr>
                    <td
                      className="px-4 py-6 text-center text-sm text-zinc-500"
                      colSpan={6}
                    >
                      Loading students...
                    </td>
                  </tr>
                )}
                {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-zinc-900">
                        {student.name}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {student.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">
                      {student.nim || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">
                      {student.courseTitle}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {student.lastActive}
                    </td>
                    <td className="px-4 py-3">{statusBadge(student.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
                {!loading && filteredStudents.length === 0 && (
                  <tr>
                    <td
                      className="px-4 py-6 text-center text-sm text-zinc-500"
                      colSpan={6}
                    >
                      No students found for the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </LecturerShell>
  );
}

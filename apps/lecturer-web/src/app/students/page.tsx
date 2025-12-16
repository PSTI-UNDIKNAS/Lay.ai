"use client";

import { useMemo, useState } from 'react';
import LecturerShell from '@/components/lecturer/LecturerShell';
import StatCard from '@/components/lecturer/StatCard';
import Card from '@/components/lecturer/Card';
import { Users, UserCheck, UserX, Search as SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type StudentStatus = 'active' | 'inactive';

interface StudentRow {
  id: string;
  name: string;
  course: string;
  lastActive: string;
  status: StudentStatus;
}

const studentsData: StudentRow[] = [
  {
    id: '1',
    name: 'John Smith',
    course: 'Web Development Fundamentals',
    lastActive: '2024-01-20 14:30',
    status: 'active',
  },
  {
    id: '2',
    name: 'Emily Davis',
    course: 'AI for Educators',
    lastActive: '2024-01-19 16:10',
    status: 'active',
  },
  {
    id: '3',
    name: 'Michael Brown',
    course: 'Advanced Algorithms',
    lastActive: '2024-01-15 09:45',
    status: 'inactive',
  },
  {
    id: '4',
    name: 'Sarah Johnson',
    course: 'Web Development Fundamentals',
    lastActive: '2024-01-18 11:20',
    status: 'active',
  },
];

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
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | StudentStatus>('all');

  const stats = {
    totalStudents: studentsData.length,
    activeStudents: studentsData.filter((s) => s.status === 'active').length,
    inactiveStudents: studentsData.filter((s) => s.status === 'inactive').length,
  };

  const courses = useMemo(
    () => Array.from(new Set(studentsData.map((s) => s.course))).sort(),
    [],
  );

  const filteredStudents = useMemo(
    () =>
      studentsData.filter((student) => {
        const matchesSearch =
          !searchTerm ||
          student.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCourse =
          courseFilter === 'all' || student.course === courseFilter;
        const matchesStatus =
          statusFilter === 'all' || student.status === statusFilter;
        return matchesSearch && matchesCourse && matchesStatus;
      }),
    [searchTerm, courseFilter, statusFilter],
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
                    <option key={course} value={course}>
                      {course}
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
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-zinc-700">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Last Active</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                      {student.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">
                      {student.course}
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
                {filteredStudents.length === 0 && (
                  <tr>
                    <td
                      className="px-4 py-6 text-center text-sm text-zinc-500"
                      colSpan={5}
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

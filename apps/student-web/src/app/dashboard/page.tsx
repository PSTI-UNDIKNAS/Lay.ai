'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Bot, CalendarClock, GraduationCap, Trophy } from 'lucide-react';
import Link from 'next/link';
import StudentShell from '@/components/student/StudentShell';
import DashboardHeader from '@/components/student/DashboardHeader';
import StatCard from '@/components/student/StatCard';
import Card from '@/components/student/Card';
import { fetchMe, fetchStudentDashboardStats, StudentDashboardStats, StudentUser } from '@/lib/auth';

export default function StudentDashboard() {
  const [name, setName] = useState<string>('');
  const [user, setUser] = useState<StudentUser | null>(null);
  const [stats, setStats] = useState<StudentDashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchMe()
      .then((res) => {
        if (!mounted) return;
        setUser(res.user);
        setName(res.user.name);
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
        setName('');
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setStatsLoading(true);
    setStatsError(null);

    fetchStudentDashboardStats()
      .then((res) => {
        if (!mounted) return;
        setStats(res);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        const msg = err instanceof Error ? err.message : 'Failed to load dashboard stats';
        setStats(null);
        setStatsError(msg);
      })
      .finally(() => {
        if (!mounted) return;
        setStatsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <StudentShell>
      <div className="space-y-8">
        <DashboardHeader name={name} />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Enrolled Courses"
            value={
              statsLoading ? (
                <span className="inline-block h-8 w-10 rounded bg-zinc-100 align-middle" />
              ) : statsError ? (
                <span>—</span>
              ) : (
                <span>{stats?.enrolledCoursesCount ?? 0}</span>
              )
            }
            subtitle={statsError ? <span className="text-red-700">{statsError}</span> : undefined}
            icon={<GraduationCap className="h-6 w-6" />}
          />
          <StatCard
            title="Upcoming Deadlines"
            value={
              statsLoading ? (
                <span className="inline-block h-8 w-10 rounded bg-zinc-100 align-middle" />
              ) : statsError ? (
                <span>—</span>
              ) : (
                <span>{stats?.upcomingDeadlinesCount ?? 0}</span>
              )
            }
            subtitle={
              statsError ? undefined : (
                <span>Next {stats?.upcomingDays ?? 7} days</span>
              )
            }
            icon={<CalendarClock className="h-6 w-6" />}
          />
          <StatCard
            title="Achievements"
            value={
              statsLoading ? (
                <span className="inline-block h-8 w-10 rounded bg-zinc-100 align-middle" />
              ) : statsError ? (
                <span>—</span>
              ) : (
                <span>{stats?.achievementsCount ?? 0}</span>
              )
            }
            subtitle={
              statsError
                ? undefined
                : (
                    <span>
                      Assignments {stats?.submittedAssignmentsCount ?? 0} • Quizzes {stats?.quizAttemptsCount ?? 0}
                    </span>
                  )
            }
            icon={<Trophy className="h-6 w-6" />}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card title="Next Up">
            <div className="space-y-3 text-sm text-zinc-700">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                <span>Finish “Binary Trees” lesson</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-600" />
                <span>Quiz: Web Development Fundamentals</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-violet-600" />
                <span>Assignment: Basic Calculator</span>
              </div>
            </div>
          </Card>

          <Card title="Quick Actions">
            <div className="space-y-3">
              <Link
                href="/course-catalog"
                className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-100"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Browse Course Catalog
                </span>
              </Link>
              <Link
                href="/enrolled-courses"
                className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-100"
              >
                <span className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" /> View Enrolled Courses
                </span>
              </Link>
              <Link
                href="/ai"
                className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-100"
              >
                <span className="flex items-center gap-2">
                  <Bot className="h-4 w-4" /> Ask AI Chatbot
                </span>
              </Link>
            </div>
          </Card>

          <Card title="Profile">
            <div className="space-y-1 text-sm text-zinc-700">
              <div className="text-zinc-900 font-medium">{user?.name || '—'}</div>
              <div>{user?.email || '—'}</div>
              <div className="text-zinc-500">ID: {user?.unique_identifier || '—'}</div>
            </div>
          </Card>
        </div>
      </div>
    </StudentShell>
  );
}

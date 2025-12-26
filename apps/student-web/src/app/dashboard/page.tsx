'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Bot, CalendarClock, GraduationCap, Trophy } from 'lucide-react';
import Link from 'next/link';
import StudentShell from '@/components/student/StudentShell';
import DashboardHeader from '@/components/student/DashboardHeader';
import StatCard from '@/components/student/StatCard';
import Card from '@/components/student/Card';
import { fetchMe, StudentUser } from '@/lib/auth';

export default function StudentDashboard() {
  const [name, setName] = useState<string>('');
  const [user, setUser] = useState<StudentUser | null>(null);

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

  return (
    <StudentShell>
      <div className="space-y-8">
        <DashboardHeader name={name} />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Enrolled Courses" value={<span>4</span>} icon={<GraduationCap className="h-6 w-6" />} />
          <StatCard title="Upcoming Deadlines" value={<span>2</span>} icon={<CalendarClock className="h-6 w-6" />} />
          <StatCard title="Achievements" value={<span>7</span>} icon={<Trophy className="h-6 w-6" />} />
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

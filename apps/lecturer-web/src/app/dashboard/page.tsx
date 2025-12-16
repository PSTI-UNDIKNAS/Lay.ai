"use client";

import { useEffect, useState } from 'react';
import LecturerShell from '@/components/lecturer/LecturerShell';
import DashboardHeader from '@/components/lecturer/DashboardHeader';
import StatCard from '@/components/lecturer/StatCard';
import Card from '@/components/lecturer/Card';
import { Users, BookOpen, FileText, Clock, ClipboardList } from 'lucide-react';
import { getMe, fetchLecturerDashboardStats, LecturerDashboardStats } from '@/lib/auth-api';

export default function LecturerDashboard() {
  const [name, setName] = useState<string>('');
  const [identifier, setIdentifier] = useState<string>('');
  const [stats, setStats] = useState<LecturerDashboardStats>({
    totalCourses: 5,
    totalStudents: 247,
    totalLearningUnits: 32,
  });

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

  useEffect(() => {
    let mounted = true;
    fetchLecturerDashboardStats()
      .then((res: LecturerDashboardStats) => {
        if (!mounted) return;
        setStats(res);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <LecturerShell>
      <div className="space-y-8">
        <DashboardHeader name={name} />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Total Courses" value={<span>{stats.totalCourses}</span>} icon={<BookOpen className="h-6 w-6" />} />
          <StatCard title="Total Students" value={<span>{stats.totalStudents}</span>} icon={<Users className="h-6 w-6" />} />
          <StatCard title="Learning Units" value={<span>{stats.totalLearningUnits}</span>} icon={<FileText className="h-6 w-6" />} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card title="Recent Activity">
            <div className="space-y-3">
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-600" /> <span className="text-zinc-700">John Smith submitted Basic Calculator</span></div>
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green-600" /> <span className="text-zinc-700">Emily Davis enrolled in Web Development Fundamentals</span></div>
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-violet-600" /> <span className="text-zinc-700">Michael Brown completed Binary Trees</span></div>
            </div>
          </Card>

          <Card title="Quick Actions">
            <div className="space-y-3">
              <button className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-100">
                <span className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Create New Course</span>
              </button>
              <button className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-100">
                <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Add Learning Unit</span>
              </button>
              <button className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-100">
                <span className="flex items-center gap-2"><Users className="h-4 w-4" /> View Student Progress</span>
              </button>
              <button className="flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-100">
                <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> Grade Submissions</span>
              </button>
            </div>
          </Card>
        </div>
      </div>
    </LecturerShell>
  );
}

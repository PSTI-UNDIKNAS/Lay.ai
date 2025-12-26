'use client';

import StudentShell from '@/components/student/StudentShell';
import Card from '@/components/student/Card';

export default function EnrolledCoursesPage() {
  return (
    <StudentShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Enrolled Courses</h1>
        <Card>
          <div className="text-sm text-zinc-700">Coming soon.</div>
        </Card>
      </div>
    </StudentShell>
  );
}


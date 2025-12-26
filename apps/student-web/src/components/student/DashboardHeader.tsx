import { BarChart3, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardHeader({ name }: { name?: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Student Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-600">Welcome back{name ? `, ${name}` : ''}</p>
        </div>
      </div>

      <div className="border-b border-zinc-200" />

      <div className="flex items-center gap-6">
        <TabItem active icon={<BarChart3 className="h-4 w-4" />}>
          Overview
        </TabItem>
        <TabItem icon={<BookOpen className="h-4 w-4" />}>Courses</TabItem>
      </div>
    </div>
  );
}

function TabItem({
  children,
  icon,
  active,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 pb-3 text-sm font-medium',
        active ? 'text-zinc-900 border-b-2 border-zinc-900' : 'text-zinc-600',
      )}
    >
      {icon}
      {children}
    </div>
  );
}


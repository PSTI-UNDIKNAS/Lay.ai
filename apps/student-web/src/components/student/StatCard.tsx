import * as React from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon: React.ReactNode;
  className?: string;
}

export default function StatCard({ title, value, subtitle, icon, className }: StatCardProps) {
  return (
    <div className={cn('rounded-xl border border-zinc-200 bg-white shadow-sm p-5', className)}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-zinc-600">{title}</div>
          <div className="mt-2 text-3xl font-semibold text-zinc-900">{value}</div>
          {subtitle && <div className="mt-2 text-sm text-zinc-600">{subtitle}</div>}
        </div>
        <div className="text-zinc-700">{icon}</div>
      </div>
    </div>
  );
}


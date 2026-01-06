import * as React from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  title?: string
  className?: string
  children: React.ReactNode
  headerRight?: React.ReactNode
  bodyClassName?: string
}

export default function Card({ title, className, children, headerRight, bodyClassName }: CardProps) {
  return (
    <div className={cn('rounded-xl border border-zinc-200 bg-white shadow-sm', className)}>
      {(title || headerRight) && (
        <div className="flex items-center justify-between px-5 pt-5">
          {title && <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>}
          {headerRight}
        </div>
      )}
      <div className={cn((title || headerRight) ? 'px-5 pb-5 pt-3' : 'p-5', bodyClassName)}>{children}</div>
    </div>
  )
}


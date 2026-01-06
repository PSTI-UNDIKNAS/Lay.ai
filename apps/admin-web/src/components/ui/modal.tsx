import * as React from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
  bodyClassName?: string
}

export default function Modal({ open, onClose, title, children, actions, className, bodyClassName }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={cn('w-full max-w-lg rounded-xl border border-zinc-200 bg-white shadow-lg', className)}>
          <div className="flex items-center justify-between px-5 pt-5">
            {title ? <h3 className="text-sm font-semibold text-zinc-900">{title}</h3> : <div />}
            <button className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100" onClick={onClose}><X className="h-4 w-4" /></button>
          </div>
          <div className={cn('px-5 pb-5 pt-3', bodyClassName)}>{children}</div>
          {actions && <div className="px-5 pb-5">{actions}</div>}
        </div>
      </div>
    </div>
  )
}

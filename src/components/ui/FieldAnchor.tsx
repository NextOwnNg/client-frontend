import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

/** Wraps a field so the error summary can scroll to it (`#field-<name>`). */
export function FieldAnchor({ name, children, className }: { name: string; children: ReactNode; className?: string }) {
  return (
    <div id={`field-${name}`} className={cx('scroll-mt-24', className)}>
      {children}
    </div>
  )
}

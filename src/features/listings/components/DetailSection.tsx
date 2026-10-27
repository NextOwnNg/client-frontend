import { type ReactNode } from 'react'
import { sectionHeading } from '@/features/listings/components/listing-styles'

/** A titled section of the listing body. */
export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className={sectionHeading}>{title}</h2>
      {children}
    </section>
  )
}

import { lazy, Suspense } from 'react'

const AreaSheet = lazy(() => import('@/components/layout/AreaSheet').then((mod) => ({ default: mod.AreaSheet })))

/** Loads the area chooser's code on first open, keeping sheet code out of the entry chunk. */
export function AreaSheetLoader({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Suspense fallback={null}>
      <AreaSheet open={open} onOpenChange={onOpenChange} />
    </Suspense>
  )
}

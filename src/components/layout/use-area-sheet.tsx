import { useState, type ReactNode } from 'react'
import { AreaSheetLoader } from '@/components/layout/AreaSheetLoader'

/**
 * Opens the area chooser from anywhere (header pill, Home's "Choose your area"). The sheet's code loads on
 * first open; call `preload` on hover or focus to fetch it early.
 */
export function useAreaSheet(): { open: () => void; preload: () => void; sheet: ReactNode } {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  return {
    open: () => {
      setMounted(true)
      setOpen(true)
    },
    preload: () => void import('@/components/layout/AreaSheet'),
    sheet: mounted ? <AreaSheetLoader open={open} onOpenChange={setOpen} /> : null,
  }
}

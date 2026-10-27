import { type ReactNode } from 'react'

/** Fixed above the tab bar on phones so the next step is in reach (UX-21); a card on desktop. */
export function ConfirmPanel({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="Confirm the exchange"
      className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 flex flex-col gap-2 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-sm desktop:static desktop:rounded-card desktop:border desktop:bg-surface desktop:p-4 desktop:backdrop-blur-none print:hidden"
    >
      {children}
    </section>
  )
}

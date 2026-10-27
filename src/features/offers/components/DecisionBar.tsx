import { type ReactNode } from 'react'

/** Fixed above the tab bar on phones so the decision is always in reach (UX-19); in the page flow on desktop. */
export function DecisionBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-sm desktop:static desktop:rounded-card desktop:border desktop:bg-surface desktop:p-4 desktop:backdrop-blur-none">
      <div className="mx-auto flex max-w-content flex-col gap-2">{children}</div>
    </div>
  )
}

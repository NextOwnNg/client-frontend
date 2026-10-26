import { Bookmark } from 'lucide-react'
import { useIsSaved, useToggleSave } from '@/features/saved/api'
import { cx } from '@/lib/cx'
import { useSessionStore } from '@/stores/session'
import type { SavedKind } from '@/types/api'

/**
 * Save / Saved for a post or listing on a card (FE-SAV-01). It flips at once; the server confirms or it flips
 * back. Guests are asked to sign in instead.
 */
export function SaveToggle({
  kind,
  id,
  onGuest,
  className,
}: {
  kind: SavedKind
  id: string
  onGuest: () => void
  className?: string
}) {
  const member = useSessionStore((s) => s.status === 'member')
  const saved = useIsSaved(kind, id)
  const toggle = useToggleSave()

  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => (member ? toggle.mutate({ kind, id, on: !saved }) : onGuest())}
      className={cx(
        'inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-compact font-semibold transition-[background-color,transform] duration-120 ease-out active:scale-95 pointer-fine:hover:bg-mint',
        saved ? 'text-action' : 'text-ink',
        className,
      )}
    >
      <Bookmark aria-hidden className={cx('size-5', saved && 'fill-current')} strokeWidth={1.75} />
      {saved ? 'Saved' : 'Save'}
    </button>
  )
}

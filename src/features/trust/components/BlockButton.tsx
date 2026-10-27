import { toast } from '@heroui/react'
import { Undo2, UserX } from 'lucide-react'
import { useState } from 'react'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useIsBlocked, useSetBlocked } from '@/features/trust/api'
import { blockEffect, endsWith } from '@/features/trust/copy'
import { errorMessage } from '@/lib/api/error-message'
import { cx } from '@/lib/cx'

const control =
  'inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-compact font-semibold transition-[background-color,transform] duration-120 ease-out active:scale-[0.97] pointer-fine:hover:bg-mint'

/**
 * FE-TRU-02: Block asks first and says what changes; Unblock is immediate, since it only restores what was
 * there. Shown to members only: a guest has nobody to block.
 */
export function BlockButton({
  person,
  iconOnly,
  className,
}: {
  person: { id: string; displayName: string }
  /** A 44px icon button for tight headers; the label becomes its accessible name. */
  iconOnly?: boolean
  className?: string
}) {
  const blocked = useIsBlocked(person.id)
  const setBlocked = useSetBlocked()
  const [confirming, setConfirming] = useState(false)

  const change = async (next: boolean) => {
    try {
      await setBlocked.mutateAsync({ userId: person.id, blocked: next })
      toast(`${next ? 'You blocked' : 'You unblocked'} ${endsWith(person.displayName)}`)
    } catch (error) {
      toast.danger(errorMessage(error, next ? 'They weren’t blocked.' : 'They weren’t unblocked.'))
      throw error
    }
  }

  return (
    <>
      {blocked ? (
        <button
          type="button"
          disabled={setBlocked.isPending}
          onClick={() => void change(false).catch(() => {})}
          className={cx(control, 'text-action', className)}
        >
          <Undo2 aria-hidden className="size-4" />
          Unblock {person.displayName}
        </button>
      ) : (
        <button
          type="button"
          aria-label={iconOnly ? `Block ${person.displayName}` : undefined}
          onClick={() => setConfirming(true)}
          className={cx(
            iconOnly
              ? 'flex size-11 shrink-0 items-center justify-center rounded-full text-muted pointer-fine:hover:bg-mint pointer-fine:hover:text-ink'
              : cx(control, 'text-muted hover:text-ink'),
            className,
          )}
        >
          <UserX aria-hidden className={iconOnly ? 'size-4.5' : 'size-4'} strokeWidth={iconOnly ? 1.75 : 2} />
          {!iconOnly && `Block ${person.displayName}`}
        </button>
      )}
      <ConfirmModal
        open={confirming}
        onOpenChange={setConfirming}
        title={`Block ${person.displayName}?`}
        body={blockEffect(person.displayName)}
        confirmLabel="Block"
        tone="danger"
        onConfirm={() => change(true)}
      />
    </>
  )
}

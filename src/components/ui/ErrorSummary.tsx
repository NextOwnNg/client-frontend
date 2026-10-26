import { CircleAlert } from 'lucide-react'
import { useEffect, useRef } from 'react'

export type SummaryItem = { message: string; onSelect: () => void }

/**
 * The error summary at the top of a form (PRD §7.5): takes focus when it appears, and each line moves to
 * the field that needs attention.
 */
export function ErrorSummary({ title, items }: { title: string; items: SummaryItem[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const signature = items.map((i) => i.message).join('|')

  useEffect(() => {
    if (signature) ref.current?.focus()
  }, [signature])

  if (items.length === 0) return null
  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="flex gap-3 rounded-control bg-danger/10 p-4 text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-danger" />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-body font-semibold">{title}</p>
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => (
            <li key={item.message}>
              <button
                type="button"
                onClick={item.onSelect}
                className="cursor-pointer text-left text-compact text-ink underline decoration-danger/50 underline-offset-4 hover:decoration-danger"
              >
                {item.message}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

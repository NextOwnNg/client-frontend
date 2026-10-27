import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cx } from '@/lib/cx'

/** Sticky at the bottom on phones (above the tab bar), in the page flow from 1024px. */
export function StepFooter({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-sm desktop:static desktop:mt-8 desktop:border-t desktop:bg-transparent desktop:px-0 desktop:pt-6 desktop:backdrop-blur-none">
      <div className="mx-auto flex max-w-2xl items-center gap-3 desktop:mx-0 desktop:max-w-none">{children}</div>
    </div>
  )
}

/** Where the person is in a multi-step form, with each step's label linked from tablet width up. */
export function StepMeter<T extends string>({
  label,
  steps,
  current,
  href,
  state,
}: {
  label: string
  steps: { id: T; label: string }[]
  current: T
  href: (step: T) => string
  /** History state for the step links, e.g. how deep the visitor is in a multi-step flow. */
  state?: unknown
}) {
  const index = Math.max(
    0,
    steps.findIndex((s) => s.id === current),
  )
  return (
    <nav aria-label={label} className="flex flex-col gap-2">
      <p className="text-caption font-semibold text-muted">
        <span>
          Step {index + 1} of {steps.length}
        </span>
        <span className="tablet:hidden"> · {steps[index]!.label}</span>
      </p>
      <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s, i) => (
          <li key={s.id} className="flex flex-col gap-1.5">
            <span
              aria-hidden
              className={cx('h-1 rounded-full transition-colors duration-200', i <= index ? 'bg-action' : 'bg-border')}
            />
            <Link
              to={href(s.id)}
              state={state}
              aria-current={s.id === current ? 'step' : undefined}
              className={cx(
                'hidden min-h-11 items-start text-compact underline-offset-4 hover:underline tablet:flex',
                s.id === current ? 'font-semibold text-ink' : 'text-muted',
              )}
            >
              {s.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  )
}

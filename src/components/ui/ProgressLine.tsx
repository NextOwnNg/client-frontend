import { m } from 'framer-motion'
import { cx } from '@/lib/cx'
import { durations, easeOut } from '@/lib/motion/presets'
import { MotionProvider } from '@/components/motion/MotionProvider'

export type ProgressStep = { id: string; label: string; state: 'done' | 'current' | 'todo' }

const stateText: Record<ProgressStep['state'], string> = {
  done: ', done',
  current: ', current step',
  todo: ', not started',
}

/**
 * The single corridor (direction contract): a Teal margin rule running through every step.
 * Done steps draw their tick; nothing ticks until the server says the step is done.
 */
export function ProgressLine({ steps, label }: { steps: ProgressStep[]; label: string }) {
  return (
    <MotionProvider>
      <ol aria-label={label} className="relative flex flex-col">
        {steps.map((step, index) => {
          const last = index === steps.length - 1
          return (
            <li
              key={step.id}
              aria-current={step.state === 'current' ? 'step' : undefined}
              className="relative flex min-h-12 gap-3 pb-6 last:pb-0"
            >
              {!last && (
                <span
                  aria-hidden
                  className={cx(
                    'absolute top-6 bottom-0 left-[11px] w-0.5 rounded-full',
                    step.state === 'done' ? 'bg-action' : 'bg-border',
                  )}
                />
              )}
              <StepMarker state={step.state} />
              <span
                className={cx(
                  'pt-0.5 text-body',
                  step.state === 'todo' ? 'text-muted' : 'text-ink',
                  step.state === 'current' && 'font-semibold',
                )}
              >
                {step.label}
                <span className="sr-only">{stateText[step.state]}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </MotionProvider>
  )
}

function StepMarker({ state }: { state: ProgressStep['state'] }) {
  if (state === 'done') {
    return (
      <span aria-hidden className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-action">
        <svg viewBox="0 0 24 24" className="size-4 text-action-foreground" fill="none">
          <m.path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth={2.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: durations.slow, ease: easeOut }}
          />
        </svg>
      </span>
    )
  }
  return (
    <span
      aria-hidden
      className={cx(
        'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 bg-surface',
        state === 'current' ? 'border-action' : 'border-border',
      )}
    >
      {state === 'current' && <span className="size-2.5 rounded-full bg-action" />}
    </span>
  )
}

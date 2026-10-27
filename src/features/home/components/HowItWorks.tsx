import { Check } from 'lucide-react'
import { copy } from '@/lib/copy/copy'

const steps = [
  { title: 'Find or list an item', body: 'Every listing shows its condition and any defects, with real photos.' },
  {
    title: 'Make a structured offer',
    body: 'Offer cash, your own item, or your item plus cash. Each offer says who pays whom.',
  },
  {
    title: 'Meet, inspect, confirm',
    body: 'Inspect in person and pay directly. The trade completes when you both confirm.',
  },
]

/** Three steps on the margin rule, each ticked: how a trade moves from listing to confirmation. */
export function HowItWorks() {
  return (
    <section
      aria-labelledby="how-heading"
      className="flex flex-col gap-4 rounded-card bg-surface p-5 ring-1 ring-border tablet:p-8"
    >
      <h2 id="how-heading" className="text-h3 text-ink tablet:text-h2">
        How a trade works
      </h2>
      <ol className="relative flex flex-col gap-5 tablet:grid tablet:grid-cols-3 tablet:gap-8">
        {steps.map((step) => (
          <li key={step.title} className="relative flex gap-3 tablet:flex-col">
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-action text-action-foreground"
            >
              <Check className="size-4" strokeWidth={3} />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-body font-semibold text-ink">{step.title}</h3>
              <p className="text-compact text-muted">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="border-t border-border pt-4 text-compact text-muted">{copy.handoverCaution}</p>
    </section>
  )
}

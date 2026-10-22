import { motion } from 'framer-motion'
import { cx } from '@/lib/cx'
import { formatNaira } from '@/lib/money/money'
import { durations, easeOut } from '@/lib/motion/presets'

type GiveLine = { kind: 'item' | 'cash'; title: string; kobo?: number }

type OfferSumProps = {
  /** What the reader gives: their item and/or cash, in order. */
  give: GiveLine[]
  /** What the reader receives; `kobo` when cash comes to them too. */
  receive: { title: string; kobo?: number }
  /** The answer, from payerSentence(). */
  sentence: string
  /** Change against the previous version, shown as a highlighted chip. */
  delta?: { kobo: number; label: string }
  heading?: string
  /** Write the lines in one by one (first appearance only). */
  animateIn?: boolean
  className?: string
}

/**
 * The signature move: a trade written out like an exercise-book sum. Items and cash in the working,
 * the result under a double rule, and the payer sentence as the answer (direction contract).
 */
export function OfferSum({ give, receive, sentence, delta, heading = 'The trade, worked out', animateIn = false, className }: OfferSumProps) {
  const line = (index: number) =>
    animateIn
      ? {
          initial: { opacity: 0, y: 6 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: durations.standard, ease: easeOut, delay: index * 0.04 },
        }
      : {}

  return (
    <section
      aria-label={heading}
      className={cx('relative rounded-card border border-border bg-surface py-3 pr-4 pl-7', className)}
    >
      <span aria-hidden className="absolute top-3 bottom-3 left-4 w-0.5 rounded-full bg-action" />
      <h3 className="text-caption font-semibold text-muted">{heading}</h3>

      <dl className="tabular mt-1">
        {give.map((item, i) => (
          <motion.div key={`${item.kind}-${item.title}`} {...line(i)} className="flex items-baseline gap-2 leading-6">
            <span aria-hidden className="w-3 shrink-0 text-muted">
              {i > 0 ? '+' : ''}
            </span>
            <dt className="min-w-0 flex-1 text-body text-ink">{item.title}</dt>
            <dd className={item.kind === 'cash' ? 'shrink-0 text-body font-semibold text-ink' : 'shrink-0 text-caption text-muted'}>
              {item.kind === 'cash' && item.kobo !== undefined ? formatNaira(item.kobo) : 'item'}
            </dd>
          </motion.div>
        ))}

        <motion.div
          {...line(give.length)}
          className="mt-1 flex items-baseline gap-2 border-t-[3px] border-double border-ink pt-1 leading-6"
        >
          <span aria-hidden className="w-3 shrink-0 text-muted">
            =
          </span>
          <dt className="sr-only">You receive</dt>
          <dd className="min-w-0 flex-1 text-body font-bold text-ink">
            {receive.title}
            {receive.kobo !== undefined && receive.kobo > 0 && <> + {formatNaira(receive.kobo)}</>}
          </dd>
        </motion.div>
      </dl>

      <motion.p {...line(give.length + 1)} className="mt-1 text-compact font-semibold text-action">
        {sentence}
      </motion.p>

      {delta && (
        <motion.p
          initial={animateIn ? { opacity: 0, scale: 0.96 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: durations.standard, ease: easeOut, delay: animateIn ? (give.length + 2) * 0.04 : 0 }}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-mint px-2.5 py-0.5 text-caption text-ink"
        >
          <span className="tabular font-bold text-action">
            {delta.kobo >= 0 ? '+' : '−'}
            {formatNaira(Math.abs(delta.kobo))}
          </span>
          <span>{delta.label}</span>
        </motion.p>
      )}
    </section>
  )
}

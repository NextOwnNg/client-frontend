import { AnimatePresence, m } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useId } from 'react'
import { partsOf, tradeSentence, type TermsChange, type Viewer } from '@/features/offers/offer-terms'
import { transitions } from '@/lib/motion/presets'
import { cx } from '@/lib/cx'
import { formatWAT } from '@/lib/time/time'
import type { Offer } from '@/types/api'

/**
 * Before and after, side by side (FE-OFF-12). The old value is struck through, the new one is bold and
 * highlighted once, and the note under each row says what it means for the reader in words.
 */
export function TermsDiff({ changes, caption }: { changes: TermsChange[]; caption: string }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 id={headingId} className="text-h3 text-ink">
          What changed
        </h2>
        <p className="text-compact text-muted">{caption}</p>
      </div>
      {changes.length === 0 ? (
        <p className="text-body text-ink">The terms are the same as before.</p>
      ) : (
        <dl className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface">
          {changes.map((change) => (
            <div key={change.field} className="flex flex-col gap-1 px-4 py-3">
              <dt className="text-caption font-semibold text-muted">{change.label}</dt>
              <dd className="tabular flex flex-wrap items-center gap-x-2 gap-y-1 text-body">
                <span className="text-muted line-through decoration-muted/60">
                  <span className="sr-only">Before: </span>
                  {change.before}
                </span>
                <ArrowRight aria-hidden className="size-4 shrink-0 text-muted" />
                <span className="animate-pop rounded-small bg-mint px-1.5 font-bold text-ink">
                  <span className="sr-only">Now: </span>
                  {change.after}
                </span>
              </dd>
              {change.note && <dd className="text-compact font-semibold text-action">{change.note}</dd>}
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}

/**
 * Every version as it was sent, oldest first, along the teal margin rule (FE-OFF-07). History is read-only;
 * new versions slide in when they arrive, and the latest is marked.
 */
export function VersionTimeline({ offer, viewerId }: { offer: Offer; viewerId: string }) {
  const headingId = useId()
  const viewer: Viewer = offer.viewerRole
  const nameOf = (id: string) =>
    id === viewerId ? 'You' : id === offer.offerer.id ? offer.offerer.displayName : offer.owner.displayName

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="text-h3 text-ink">
        Offer history
      </h2>
      <ol className="relative flex flex-col gap-6 pl-8">
        <span aria-hidden className="absolute top-3 bottom-3 left-[11px] w-0.5 rounded-full bg-action/30" />
        <AnimatePresence initial={false}>
          {offer.versions.map((version, i) => {
            const latest = i === offer.versions.length - 1
            return (
              <m.li
                key={version.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: transitions.slow }}
                className="relative flex flex-col gap-1"
              >
                <span
                  aria-hidden
                  className={cx(
                    'absolute top-0.5 -left-8 flex size-6 items-center justify-center rounded-full border-2 bg-surface',
                    latest ? 'border-action' : 'border-border',
                  )}
                >
                  {latest && <span className="size-2.5 rounded-full bg-action" />}
                </span>
                <p className="flex flex-wrap items-center gap-2">
                  <span className={cx('text-body', latest ? 'font-semibold text-ink' : 'text-ink')}>
                    Version {version.number} · {nameOf(version.authorId)}{' '}
                    {version.number === 1 ? 'offered' : 'countered'}
                  </span>
                  {latest && (
                    <span className="rounded-full bg-mint px-2 py-0.5 text-caption font-semibold text-action">
                      Latest
                    </span>
                  )}
                </p>
                <p className="tabular text-caption text-muted">{formatWAT(version.createdAt)}</p>
                <p className={cx('max-w-prose text-compact', latest ? 'text-ink' : 'text-muted')}>
                  {tradeSentence(partsOf(offer, version), viewer)}
                </p>
                {version.note && (
                  <blockquote className="mt-1 max-w-prose rounded-control border border-border bg-surface px-3 py-2 text-compact text-ink">
                    <span className="sr-only">Note: </span>“{version.note}”
                  </blockquote>
                )}
              </m.li>
            )
          })}
        </AnimatePresence>
      </ol>
    </section>
  )
}

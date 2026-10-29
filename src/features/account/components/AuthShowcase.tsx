import { ArrowLeftRight } from 'lucide-react'
import { OfferSum } from '@/components/domain/OfferSum'
import { payerSentence } from '@/components/domain/payer-sentence'
import { copy } from '@/lib/copy/copy'
import { cx } from '@/lib/cx'
import { savesData } from '@/lib/network/save-data'

const CASH_KOBO = 150_000_00

const photos = {
  give: { src: '/brand/auth/switch.webp', alt: 'A Nintendo Switch with its dock and controllers', ratio: '480 / 275' },
  get: { src: '/brand/auth/macbook.webp', alt: 'An open MacBook Air M1', ratio: '480 / 320' },
}

/** One item photo on a white card, tilted slightly as if laid on a table. Settles in once. */
function PhotoCard({
  photo,
  label,
  tilt,
  delay,
  compact,
}: {
  photo: (typeof photos)['give']
  label: string
  tilt: string
  delay: number
  compact?: boolean
}) {
  return (
    <div className="min-w-0 flex-1 animate-rise" style={{ animationDelay: `${delay}ms` }}>
      <figure
        className={cx('rounded-card border border-border bg-surface shadow-card', compact ? 'p-1.5' : 'p-2', tilt)}
      >
        <img
          src={photo.src}
          alt={photo.alt}
          decoding="async"
          className={cx('w-full rounded-control object-contain', compact && 'h-16')}
          style={compact ? undefined : { aspectRatio: photo.ratio }}
        />
        <figcaption className="px-1 pt-1.5 text-caption font-semibold text-muted">{label}</figcaption>
      </figure>
    </div>
  )
}

function Photos({ compact }: { compact?: boolean }) {
  return (
    <div className={cx('flex items-center', compact ? 'gap-2' : 'gap-3')}>
      <PhotoCard photo={photos.give} label="You give" tilt="-rotate-2" delay={0} compact={compact} />
      <span
        aria-hidden
        className={cx(
          'flex shrink-0 animate-rise items-center justify-center rounded-full bg-action text-action-foreground shadow-card',
          compact ? 'size-8' : 'size-10',
        )}
        style={{ animationDelay: '80ms' }}
      >
        <ArrowLeftRight className={compact ? 'size-4' : 'size-5'} />
      </span>
      <PhotoCard photo={photos.get} label="You get" tilt="rotate-2" delay={120} compact={compact} />
    </div>
  )
}

/**
 * Beside the sign-in form: what NextOwn does, shown with one example trade instead of a decorative background.
 * The full panel from 1024px; a short card above the form on phones. Photos are skipped under Save-Data.
 */
export function AuthShowcase({ variant }: { variant: 'panel' | 'card' }) {
  const photosOn = !savesData()

  if (variant === 'card') {
    return (
      <figure aria-label="Example trade" className="flex flex-col gap-2 rounded-card bg-mint/60 p-3 desktop:hidden">
        {photosOn && <Photos compact />}
        <figcaption className="px-1 text-compact text-ink">
          Swap a Switch, add ₦150,000, take home a MacBook.
        </figcaption>
      </figure>
    )
  }

  return (
    <section
      aria-label="How trading on NextOwn works"
      className="hidden flex-col justify-center gap-8 rounded-feature bg-mint/60 p-10 desktop:flex"
    >
      <div className="flex flex-col gap-2">
        <p className="text-h2 text-balance text-ink">{copy.primaryModes}</p>
        <p className="max-w-md text-body text-muted">{copy.supportingLine}</p>
      </div>
      {photosOn && (
        <div className="max-w-md px-2">
          <Photos />
        </div>
      )}
      <figure className="flex max-w-md flex-col gap-2">
        <OfferSum
          heading="Example: a swap with cash added"
          give={[
            { kind: 'item', title: 'Your Nintendo Switch' },
            { kind: 'cash', title: 'Cash from you', kobo: CASH_KOBO },
          ]}
          receive={{ title: 'MacBook Air M1' }}
          sentence={payerSentence({ viewer: 'offerer', direction: 'OFFERER_PAYS_OWNER', kobo: CASH_KOBO })}
          animateIn
          className="shadow-card"
        />
        <figcaption className="px-1 text-caption text-muted">
          Every offer is written out like this, so both people see who gives what.
        </figcaption>
      </figure>
    </section>
  )
}

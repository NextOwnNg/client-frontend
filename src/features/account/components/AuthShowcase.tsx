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
}: {
  photo: (typeof photos)['give']
  label: string
  tilt: string
  delay: number
}) {
  return (
    <div className="min-w-0 flex-1 animate-rise" style={{ animationDelay: `${delay}ms` }}>
      <figure className={cx('rounded-card border border-border bg-surface p-1.5 shadow-card tablet:p-2', tilt)}>
        <img
          src={photo.src}
          alt={photo.alt}
          decoding="async"
          className="w-full rounded-control object-contain"
          style={{ aspectRatio: photo.ratio }}
        />
        <figcaption className="px-1 pt-1.5 text-caption font-semibold text-muted">{label}</figcaption>
      </figure>
    </div>
  )
}

/**
 * Beside the sign-in form: what NextOwn does, shown with one example trade instead of a decorative background.
 * The same words and example on every screen, scaled down on phones. Photos are skipped under Save-Data.
 */
export function AuthShowcase() {
  const photosOn = !savesData()

  return (
    <section
      aria-label="How trading on NextOwn works"
      className="flex flex-col justify-center gap-6 rounded-card bg-mint/60 p-5 tablet:p-8 desktop:h-full desktop:gap-8 desktop:rounded-feature desktop:p-10"
    >
      <div className="flex flex-col gap-2">
        <p className="text-h3 text-balance text-ink desktop:text-h2">{copy.primaryModes}</p>
        <p className="max-w-md text-compact text-muted tablet:text-body">{copy.supportingLine}</p>
      </div>
      {photosOn && (
        <div className="flex max-w-md items-center gap-2 px-1 tablet:gap-3 tablet:px-2">
          <PhotoCard photo={photos.give} label="You give" tilt="-rotate-2" delay={0} />
          <span
            aria-hidden
            className="flex size-8 shrink-0 animate-rise items-center justify-center rounded-full bg-action text-action-foreground shadow-card tablet:size-10"
            style={{ animationDelay: '80ms' }}
          >
            <ArrowLeftRight className="size-4 tablet:size-5" />
          </span>
          <PhotoCard photo={photos.get} label="You get" tilt="rotate-2" delay={120} />
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

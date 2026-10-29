import { Eye, PartyPopper, PencilLine } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { Banner } from '@/components/ui/Banner'
import { ButtonLink } from '@/components/ui/Button'
import { ListingView, type ListingSection } from '@/features/listings/components/ListingView'
import { inputToDetail, type WizardStep } from '@/features/selling/listing-input'
import { useNow } from '@/hooks/useNow'
import { copy } from '@/lib/copy/copy'
import { PolicyLinks } from '@/features/trust/components/PolicyLinks'
import type { ListingInput, OwnListing, PublicSeller, RuntimeConfig } from '@/types/api'

const sectionStep: Record<ListingSection, { step: WizardStep; label: string }> = {
  photos: { step: 'basics', label: 'Edit photos' },
  trade: { step: 'trade', label: 'Edit price and trade options' },
  condition: { step: 'condition', label: 'Edit condition and defects' },
  details: { step: 'basics', label: 'Edit title and details' },
}

type PreviewStepProps = {
  input: ListingInput
  listing: OwnListing | undefined
  seller: PublicSeller
  config: RuntimeConfig
  stepHref: (step: WizardStep) => string
  /** "Publish listing" for drafts, "Save changes" for published listings. */
  action: ReactNode
  problems: ReactNode
}

/**
 * UX-13 preview: the real listing detail (FE-LST-06), as buyers will see it, with an Edit link per section and
 * the facts a seller should know before publishing.
 */
export function PreviewStep({ input, listing, seller, config, stepHref, action, problems }: PreviewStepProps) {
  const now = useNow()
  const detail = inputToDetail(input, {
    id: listing?.id ?? 'preview',
    slug: listing?.slug ?? 'preview',
    // Shown as buyers will see it once live
    status: 'ACTIVE',
    publishedAt: listing?.publishedAt ?? new Date(now).toISOString(),
    urgencyEndsAt:
      input.quickSell && input.quickSellHours
        ? new Date(now + input.quickSellHours * 3_600_000).toISOString()
        : listing?.urgencyEndsAt,
    seller,
    config,
  })
  const area = config.areas.find((a) => a.id === input.areaId)?.name ?? config.cityName

  return (
    <div className="flex flex-col gap-6">
      <Banner tone="info" title="Preview: this is how buyers will see your listing">
        Check the photos, price and defects. Use the Edit links to change anything.
      </Banner>
      {problems}
      <div className="rounded-feature border border-dashed border-border p-3 tablet:p-5">
        <ListingView
          listing={detail}
          titleAs="h2"
          panel={<div className="hidden desktop:flex desktop:flex-col desktop:gap-3">{action}</div>}
          editLink={(section) => (
            <Link
              to={stepHref(sectionStep[section].step)}
              className="inline-flex min-h-11 items-center gap-1.5 self-start text-compact font-semibold text-action underline-offset-4 hover:underline"
            >
              <PencilLine aria-hidden className="size-4" />
              {sectionStep[section].label}
            </Link>
          )}
        />
      </div>
      <section
        aria-labelledby="before-publish"
        className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4"
      >
        <h2 id="before-publish" className="text-h3 text-ink">
          Before you publish
        </h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-compact text-muted">
          <li>Buyers see {area}, never your address or phone number.</li>
          <li>{copy.phoneBadgeExplainer}</li>
          <li>You can edit or close this listing at any time from My listings.</li>
          <li>It must follow the community rules and can’t be a prohibited item.</li>
        </ul>
        <PolicyLinks />
      </section>
    </div>
  )
}

/** After publishing (FE-LST-07): under review or live, each with what happens next. */
export function PublishResult({ listing }: { listing: OwnListing }) {
  const live = listing.status === 'ACTIVE'
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-10 text-center">
      <Seo title={live ? 'Listing live' : 'Listing under review'} noindex />
      <span className="flex size-14 items-center justify-center rounded-full bg-mint text-action">
        {live ? <PartyPopper aria-hidden className="size-7" /> : <Eye aria-hidden className="size-7" />}
      </span>
      <h1 className="text-h2 text-ink tablet:text-h1">
        {live ? 'Your listing is live' : 'Your listing is being reviewed'}
      </h1>
      <p className="text-body text-muted">
        {live
          ? 'People can now find it on Explore and make offers. We’ll let you know when one arrives.'
          : 'We check new listings against the community rules, usually within a few hours, and text you when it’s live. You can still edit or close it.'}
      </p>
      <div className="mt-2 flex w-full flex-col gap-2 tablet:w-auto tablet:flex-row">
        {live ? (
          <ButtonLink to={`/listings/${listing.slug}`} className="w-full tablet:w-auto">
            View listing
          </ButtonLink>
        ) : (
          <ButtonLink to="/me/listings?tab=active" className="w-full tablet:w-auto">
            Go to My listings
          </ButtonLink>
        )}
        <ButtonLink
          to={live ? '/me/listings?tab=active' : '/listings/new'}
          variant="secondary"
          className="w-full tablet:w-auto"
        >
          {live ? 'Go to My listings' : 'List another item'}
        </ButtonLink>
      </div>
    </div>
  )
}

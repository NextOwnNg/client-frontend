import { Button, toast } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { Ban, Handshake, LoaderCircle, PackageX, SearchX, ShieldAlert, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { Banner } from '@/components/ui/Banner'
import { ButtonLink } from '@/components/ui/Button'
import { ErrorSummary } from '@/components/ui/ErrorSummary'
import { focusField } from '@/components/ui/focus-field'
import { ErrorState } from '@/components/ui/States'
import { StepFooter, StepMeter } from '@/components/ui/StepFlow'
import { useRuntimeConfig } from '@/features/config/api'
import { useListing } from '@/features/listings/api'
import { unavailableMessage } from '@/features/listings/copy'
import { offerKeys, useMyItems, useOffers, useSendOffer } from '@/features/offers/api'
import { ItemStep, ReviewStep, TermsStep, TypeStep } from '@/features/offers/components/ComposerSteps'
import { ListingPin, OfferBlocked } from '@/features/offers/components/OfferParts'
import {
  composerSteps,
  draftTerms,
  offerStepErrors,
  stepOfOfferField,
  useOfferDraft,
  type ComposerStep,
} from '@/features/offers/use-offer-draft'
import type { FieldErrors } from '@/features/selling/listing-input'
import { isApiError } from '@/lib/api/api-error'
import { apiClient } from '@/lib/api/client'
import { copy } from '@/lib/copy/copy'
import { isAvailable } from '@/lib/copy/status'
import { useSessionStore } from '@/stores/session'
import type { ListingDetail, Offer, RuntimeConfig } from '@/types/api'

/** UX-14..18: `/offers/new?listing=:id&step=…`. Blocked states explain themselves before anything is typed. */
export function OfferComposerPage() {
  const [params] = useSearchParams()
  const listingId = params.get('listing') ?? ''
  const userId = useSessionStore((s) => s.userId)
  const restricted = useSessionStore((s) => s.restricted)
  const { data: config } = useRuntimeConfig()
  const listing = useListing(listingId)
  const offers = useOffers()

  const loaded = listing.data && !listing.isPlaceholderData
  if (!listingId || (listing.isError && !listing.data)) {
    if (listingId && !(isApiError(listing.error) && listing.error.status === 404)) {
      return <ErrorState title="We couldn't load this item" onRetry={() => void listing.refetch()} />
    }
    return (
      <OfferBlocked
        icon={SearchX}
        title="We couldn’t find that item"
        actions={<ButtonLink to="/explore">Explore items</ButtonLink>}
      >
        It may have been removed. Find something else to make an offer on.
      </OfferBlocked>
    )
  }
  if (!loaded || !config || (offers.isPending && !offers.isError)) {
    return (
      <div aria-busy="true" aria-label="Loading" className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div className="h-24 animate-pulse rounded-card bg-cloud" />
        <div className="h-64 animate-pulse rounded-card bg-cloud" />
      </div>
    )
  }

  const item = listing.data
  const pin = <ListingPin listing={item} ownerName={item.seller.displayName} />
  const openOffer = offers.data?.find(
    (o) => o.listing.id === item.id && o.viewerRole === 'offerer' && o.status === 'PENDING',
  )

  if (userId === item.seller.id) {
    return (
      <Blocked
        icon={Handshake}
        title="This is your listing"
        pin={pin}
        actions={<ButtonLink to={`/listings/${item.id}/edit`}>Manage listing</ButtonLink>}
      >
        Offers on your listing arrive in your offers inbox.
      </Blocked>
    )
  }
  if (restricted) {
    return (
      <Blocked
        icon={ShieldAlert}
        title="Your account can’t make offers right now"
        pin={pin}
        actions={<ButtonLink to="/support?topic=appeal">Ask for a review</ButtonLink>}
      >
        While your account is restricted you can’t send offers. Offers and deals you already have stay available.
      </Blocked>
    )
  }
  if (!isAvailable(item.status)) {
    return (
      <Blocked
        icon={PackageX}
        title="This item isn’t taking offers"
        pin={pin}
        actions={<ButtonLink to={`/explore?category=${item.categoryId}`}>See similar items</ButtonLink>}
      >
        {unavailableMessage(item.status)}
      </Blocked>
    )
  }
  if (openOffer) {
    return (
      <Blocked
        icon={Ban}
        title="You already have an offer on this item"
        pin={pin}
        actions={<ButtonLink to={`/offers/${openOffer.id}`}>Go to your offer</ButtonLink>}
      >
        You can counter or withdraw it from the offer itself. One open offer per item keeps things clear for the owner.
      </Blocked>
    )
  }

  return <Composer listing={item} config={config} userId={userId} pin={pin} />
}

function Blocked(props: Parameters<typeof OfferBlocked>[0]) {
  return (
    <>
      <Seo title="Make an offer" noindex />
      <OfferBlocked {...props} />
    </>
  )
}

type Outcome =
  | { kind: 'checking' }
  | { kind: 'not-sent' }
  | { kind: 'unknown' }
  | { kind: 'unavailable' }
  | { kind: 'exists'; offerId: string }
  | { kind: 'refused' }

/** Long enough to read, so a quick answer doesn't flash past (PRD §7.4 read-before-retry). */
const MIN_CHECK_MS = 500

function Composer({
  listing,
  config,
  userId,
  pin,
}: {
  listing: ListingDetail
  config: RuntimeConfig
  userId: string | null
  pin: React.ReactNode
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const { draft, change, sendKey, clear } = useOfferDraft(userId, listing.id)
  const myItems = useMyItems()
  const send = useSendOffer()
  const [shown, setShown] = useState<Partial<Record<ComposerStep, boolean>>>({})
  const [serverErrors, setServerErrors] = useState<FieldErrors>({})
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const steps = composerSteps(draft.mode)
  const requested = params.get('step') as ComposerStep | null
  // A step that doesn't belong to the chosen kind of offer (or a review with nothing chosen) starts at the top
  const step: ComposerStep = requested && steps.some((s) => s.id === requested) && draft.mode ? requested : 'type'
  const index = steps.findIndex((s) => s.id === step)
  const items = myItems.data ?? []
  const item = items.find((i) => i.id === draft.offeredItemId)

  const stepHref = (target: ComposerStep) => {
    const next = new URLSearchParams(params)
    if (target === 'type') next.delete('step')
    else next.set('step', target)
    return `${location.pathname}?${next.toString()}`
  }
  const goTo = (target: ComposerStep) => void navigate(stepHref(target))

  const stepErrors = offerStepErrors(step, draft, listing.acceptedModes)
  if (step === 'item' && item && !item.available) stepErrors.offeredItemId = `${item.title}: ${item.unavailableReason}.`
  const visible: FieldErrors = {
    ...(shown[step] ? stepErrors : {}),
    ...Object.fromEntries(Object.entries(serverErrors).filter(([f]) => stepOfOfferField(f) === step)),
  }

  const update = (changes: Parameters<typeof change>[0]) => {
    setOutcome(null)
    if (Object.keys(serverErrors).length) {
      setServerErrors((errors) => Object.fromEntries(Object.entries(errors).filter(([f]) => !(f in changes))))
    }
    change(changes)
  }

  function next() {
    if (Object.keys(stepErrors).length) return setShown((s) => ({ ...s, [step]: true }))
    goTo(steps[index + 1]!.id)
  }

  function finish(offer: Offer) {
    clear()
    void queryClient.invalidateQueries({ queryKey: offerKeys.list() })
    toast.success('Offer sent.')
    void navigate(`/offers/${offer.id}`, { replace: true })
  }

  /** The answer was lost: look for the offer before saying anything (PRD §7.4, QA-21). */
  async function check() {
    setOutcome({ kind: 'checking' })
    try {
      // Read directly: writing the inbox cache here would swap this page for "you already have an offer"
      const [offers] = await Promise.all([
        apiClient.get<Offer[]>('/offers').then((r) => r.data),
        new Promise((resolve) => setTimeout(resolve, MIN_CHECK_MS)),
      ])
      const sent = offers.find(
        (o) => o.listing.id === listing.id && o.viewerRole === 'offerer' && o.status === 'PENDING',
      )
      if (sent) finish(sent)
      else setOutcome({ kind: 'not-sent' })
    } catch {
      setOutcome({ kind: 'unknown' })
    }
  }

  async function submit() {
    const errors = offerStepErrors('review', draft, listing.acceptedModes)
    if (Object.keys(errors).length) {
      setServerErrors(errors)
      return
    }
    setOutcome(null)
    try {
      const offer = await send.mutateAsync({
        offer: { listingId: listing.id, ...draftTerms(draft) },
        idempotencyKey: sendKey(),
      })
      finish(offer)
    } catch (error) {
      if (!isApiError(error)) return setOutcome({ kind: 'not-sent' })
      if (error.isOutcomeUnknown) return void check()
      if (error.code === 'ITEM_UNAVAILABLE') return setOutcome({ kind: 'unavailable' })
      if (error.code === 'OFFER_EXISTS' && typeof error.details?.offerId === 'string') {
        return setOutcome({ kind: 'exists', offerId: error.details.offerId })
      }
      if (error.code === 'VALIDATION_ERROR' && error.fieldErrors) {
        void myItems.refetch()
        return setServerErrors(error.fieldErrors)
      }
      // Signing in again is handled by the session prompt; the draft stays put
      if (error.code === 'AUTH_REQUIRED') return
      if (error.code === 'FORBIDDEN') return setOutcome({ kind: 'refused' })
      setOutcome({ kind: 'not-sent' })
    }
  }

  const sending = send.isPending || outcome?.kind === 'checking'
  const summary =
    step === 'review'
      ? Object.entries(serverErrors).map(([field, message]) => ({
          message,
          onSelect: () => {
            goTo(stepOfOfferField(field))
            setTimeout(() => focusField(field), 50)
          },
        }))
      : Object.entries(visible).map(([field, message]) => ({ message, onSelect: () => focusField(field) }))

  const stepProps = { listing, draft, change: update, errors: visible }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 pb-36 desktop:pb-0">
      <Seo title="Make an offer" noindex />
      <Link
        to={`/listings/${listing.slug}`}
        className="-ml-2 inline-flex min-h-11 items-center gap-1.5 self-start rounded-control px-2 text-compact font-semibold text-muted transition-colors duration-120 hover:bg-cloud hover:text-ink"
      >
        <X aria-hidden className="size-4" />
        Back to the item
      </Link>
      {pin}
      <StepMeter label="Offer steps" steps={steps} current={step} href={stepHref} />
      <h1 className="text-h2 text-ink tablet:text-h1">Make an offer</h1>

      <ErrorSummary title="Check these before you continue" items={summary} />

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (step === 'review') void submit()
          else next()
        }}
      >
        {step === 'type' && <TypeStep {...stepProps} />}
        {step === 'item' && (
          <ItemStep
            {...stepProps}
            items={items}
            itemsState={myItems.isPending ? 'pending' : myItems.isError ? 'error' : 'ready'}
            userId={userId}
            config={config}
          />
        )}
        {step === 'terms' && (
          <TermsStep
            {...stepProps}
            item={item}
            onSwitchToSwap={() => {
              update({ mode: 'SWAP', cashKobo: null, cashDirection: 'NONE' })
              goTo('review')
            }}
          />
        )}
        {step === 'review' && (
          <ReviewStep
            {...stepProps}
            item={item}
            lifetimeHours={config.offerLifetimeHours}
            status={<SendStatus outcome={outcome} listing={listing} onCheck={() => void check()} />}
          />
        )}

        <StepFooter>
          {index > 0 && (
            <Button
              variant="tertiary"
              isDisabled={sending}
              onPress={() => goTo(steps[index - 1]!.id)}
              className="shrink-0"
            >
              Back
            </Button>
          )}
          <Button
            type="submit"
            isPending={sending}
            isDisabled={step === 'review' && outcome?.kind === 'unavailable'}
            className="flex-1 tablet:ml-auto tablet:flex-none tablet:px-8"
          >
            {step === 'review' ? 'Send offer' : 'Continue'}
          </Button>
        </StepFooter>
      </form>
    </div>
  )
}

function SendStatus({
  outcome,
  listing,
  onCheck,
}: {
  outcome: Outcome | null
  listing: ListingDetail
  onCheck: () => void
}) {
  if (!outcome) return null
  switch (outcome.kind) {
    case 'checking':
      return (
        <div role="status" className="flex items-center gap-3 rounded-control bg-mint p-4 text-body text-ink">
          <LoaderCircle aria-hidden className="size-5 shrink-0 animate-spin text-action" />
          Checking the latest status…
        </div>
      )
    case 'not-sent':
      return (
        <Banner tone="warning" title="Your offer wasn’t sent">
          Nothing reached {listing.seller.displayName}. Check your connection and send it again; your offer is saved
          here.
        </Banner>
      )
    case 'unknown':
      return (
        <Banner
          tone="warning"
          title="We couldn’t confirm whether your offer was sent"
          action={
            <Button variant="secondary" size="sm" onPress={onCheck}>
              Check again
            </Button>
          }
        >
          Check your connection, then check again. Sending again can’t create a second offer.
        </Banner>
      )
    case 'unavailable':
      return (
        <Banner
          tone="warning"
          title={copy.unavailable}
          action={
            <ButtonLink to={`/explore?category=${listing.categoryId}`} variant="secondary" size="sm">
              See similar items
            </ButtonLink>
          }
        >
          Your offer is saved here in case it becomes available again.
        </Banner>
      )
    case 'exists':
      return (
        <Banner
          tone="info"
          title="You already have an offer on this item"
          action={
            <ButtonLink to={`/offers/${outcome.offerId}`} variant="secondary" size="sm">
              Go to your offer
            </ButtonLink>
          }
        />
      )
    case 'refused':
      return (
        <Banner tone="danger" title="This action isn’t available.">
          Your account may have changed. Reload the page to see what you can do.
        </Banner>
      )
  }
}

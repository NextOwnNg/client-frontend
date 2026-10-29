import { zodResolver } from '@hookform/resolvers/zod'
import { Button, toast } from '@heroui/react'
import { CircleCheck, CloudOff, LoaderCircle, SearchX, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { Banner } from '@/components/ui/Banner'
import { ButtonLink } from '@/components/ui/Button'
import { ErrorSummary, type SummaryItem } from '@/components/ui/ErrorSummary'
import { StepFooter, StepMeter } from '@/components/ui/StepFlow'
import { focusField } from '@/components/ui/focus-field'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { useMe } from '@/features/account/api'
import { useMeProfile } from '@/features/account/use-me-profile'
import { useRuntimeConfig } from '@/features/config/api'
import { useListingAction, useOwnListing } from '@/features/selling/api'
import { PreviewStep, PublishResult } from '@/features/selling/components/PreviewStep'
import { BasicsStep } from '@/features/selling/components/BasicsStep'
import { ConditionStep } from '@/features/selling/components/ConditionStep'
import { TradeStep } from '@/features/selling/components/TradeStep'
import {
  emptyListingInput,
  ownToInput,
  stepOfField,
  tabOf,
  wizardSteps,
  type FieldErrors,
  type WizardStep,
} from '@/features/selling/listing-input'
import { fieldsOfStep, listingSchema } from '@/features/selling/listing-schema'
import { draftKey, moveDraft, useListingDraft } from '@/features/selling/use-listing-draft'
import { toApiError } from '@/lib/api/api-error'
import { errorMessage, fieldErrorsOf, isNotFound } from '@/lib/api/error-message'
import { flattenErrors } from '@/lib/forms/form-errors'
import { cx } from '@/lib/cx'
import { useSessionStore } from '@/stores/session'
import type { ListingInput, Me, OwnListing, PublicSeller, RuntimeConfig } from '@/types/api'

const parseStep = (raw: string | null): WizardStep => wizardSteps.find((s) => s.id === raw)?.id ?? 'basics'

/** UX-10..13: `/listings/new` and `/listings/:id/edit`. Restricted members get an explanation instead. */
export function ListingWizardPage() {
  const { id } = useParams()
  const restricted = useSessionStore((s) => s.restricted)
  const userId = useSessionStore((s) => s.userId)
  const { data: config } = useRuntimeConfig()
  const { data: me } = useMe()
  const own = useOwnListing(id)
  // A draft created on this page keeps the same wizard through the URL change, so uploads in progress carry on
  const [createdHere, setCreatedHere] = useState<string | null>(null)

  if (restricted) {
    return (
      <div className="mx-auto max-w-2xl">
        <Seo title="List an item" noindex />
        <Banner
          tone="warning"
          title="Your account can’t list items right now"
          action={
            <ButtonLink to="/appeal" variant="secondary">
              Ask for a review
            </ButtonLink>
          }
        >
          While your account is restricted you can’t publish or edit listings. Your existing offers and deals stay
          available.
        </Banner>
      </div>
    )
  }
  if (id && own.isError && !own.data) {
    if (isNotFound(own.error)) {
      return (
        <EmptyState
          icon={SearchX}
          title="We couldn't find that listing"
          body="It may have been discarded, or it belongs to another account."
          action={<ButtonLink to="/me/listings">Go to My listings</ButtonLink>}
        />
      )
    }
    return <ErrorState title="We couldn't load this listing" onRetry={() => void own.refetch()} />
  }
  if (!config || !me || (id && !own.data)) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading listing"
        className="mx-auto h-96 max-w-2xl animate-pulse rounded-card bg-cloud"
      />
    )
  }

  return (
    <Wizard
      key={id && id !== createdHere ? id : 'new'}
      id={id}
      listing={own.data}
      config={config}
      me={me}
      userId={userId}
      onCreated={setCreatedHere}
    />
  )
}

type WizardProps = {
  id?: string
  listing?: OwnListing
  config: RuntimeConfig
  me: Me
  userId: string | null
  onCreated: (id: string) => void
}

function Wizard({ id, listing, config, me, userId, onCreated }: WizardProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const step = parseStep(params.get('step'))
  const stepIndex = wizardSteps.findIndex((s) => s.id === step)
  const published = Boolean(listing && listing.status !== 'DRAFT')
  const profile = useMeProfile()
  const action = useListingAction()
  const [uploading, setUploading] = useState(false)
  const [waitForPhotos, setWaitForPhotos] = useState(false)
  const [duplicate, setDuplicate] = useState<{ slug: string; id: string } | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [result, setResult] = useState<OwnListing | null>(null)

  const draft = useListingDraft({
    id,
    userId,
    initial: listing ? ownToInput(listing) : { ...emptyListingInput, areaId: me.areaId },
    autosave: !published,
    onCreated: (created, latest) => {
      onCreated(created.id)
      moveDraft(draftKey(userId, undefined), draftKey(userId, created.id), latest)
      void navigate(`/listings/${created.id}/edit${location.search}`, { replace: true })
    },
  })
  const schema = useMemo(() => listingSchema(config), [config])
  const { watch, setValue, trigger, setError, formState } = useForm<ListingInput>({
    resolver: zodResolver(schema),
    defaultValues: draft.input,
  })
  const input = watch()
  const { change: saveDraft } = draft

  // Every change goes to the draft, which autosaves it (published listings save on request)
  useEffect(() => {
    const subscription = watch((values) => saveDraft(values as ListingInput))
    return () => subscription.unsubscribe()
  }, [watch, saveDraft])

  if (result) return <PublishResult listing={result} />

  const stepHref = (target: WizardStep) => {
    const next = new URLSearchParams(params)
    if (target === 'basics') next.delete('step')
    else next.set('step', target)
    const query = next.toString()
    return `${location.pathname}${query ? `?${query}` : ''}`
  }
  const goTo = (target: WizardStep) => {
    setWaitForPhotos(false)
    void navigate(stepHref(target))
  }

  const errorMessages = flattenErrors(formState.errors)
  const visibleErrors = Object.fromEntries(Object.entries(errorMessages).filter(([f]) => stepOfField(f) === step))

  // A field that is showing a problem is checked again as it changes, so the message goes once it's fixed
  const change = (changes: Partial<ListingInput>) => {
    for (const [field, value] of Object.entries(changes) as [keyof ListingInput, never][]) {
      const showing = Object.keys(errorMessages).some((f) => f === field || f.startsWith(`${field}.`))
      setValue(field, value, { shouldDirty: true, shouldValidate: showing })
    }
  }

  async function next() {
    if (step === 'basics' && uploading) return setWaitForPhotos(true)
    if (await trigger(fieldsOfStep(step))) goTo(wizardSteps[stepIndex + 1]!.id)
  }

  const showServerErrors = (fields: Record<string, string>) => {
    for (const [field, message] of Object.entries(fields)) setError(field as keyof ListingInput, { message })
  }

  /** Everything that blocks publishing, each linked to its step. */
  const allProblems = (errors: FieldErrors): SummaryItem[] =>
    Object.entries(errors).map(([field, message]) => {
      const owner = stepOfField(field)
      return {
        message: `${wizardSteps.find((s) => s.id === owner)!.label}: ${message}`,
        onSelect: () => {
          goTo(owner)
          setTimeout(() => focusField(field), 50)
        },
      }
    })

  async function submit() {
    setFailure(null)
    setDuplicate(null)
    if (!(await trigger())) return
    try {
      await draft.flush()
    } catch (error) {
      const fields = fieldErrorsOf(error)
      if (fields) return showServerErrors(fields)
      return setFailure(errorMessage(error, 'We couldn’t save your changes.'))
    }
    if (published) {
      draft.discardLocal()
      toast.success('Changes saved.')
      void navigate(`/me/listings?tab=${tabOf(listing!.status)}`)
      return
    }
    action.mutate(
      { id: id!, action: 'publish' },
      {
        onSuccess: (listing) => {
          draft.discardLocal()
          window.scrollTo(0, 0)
          setResult(listing)
        },
        onError: (error) => {
          const fields = fieldErrorsOf(error)
          if (fields) return showServerErrors(fields)
          // A likely duplicate opens its own panel linking to the existing listing
          const { code, details } = toApiError(error)
          if (code === 'DUPLICATE_ITEM') {
            const { existingSlug, existingId } = details ?? {}
            return setDuplicate({
              slug: typeof existingSlug === 'string' ? existingSlug : '',
              id: typeof existingId === 'string' ? existingId : '',
            })
          }
          setFailure(`${errorMessage(error, 'We couldn’t publish your listing.')} Your draft is saved.`)
        },
      },
    )
  }

  const submitLabel = published ? 'Save changes' : 'Publish listing'
  const submitting = action.isPending || draft.state === 'saving'
  const submitButton = (
    <Button fullWidth isPending={submitting} isDisabled={!id && !published} onPress={() => void submit()}>
      {submitLabel}
    </Button>
  )

  const summaryItems: SummaryItem[] =
    step === 'preview'
      ? allProblems(errorMessages)
      : [
          ...(waitForPhotos
            ? [{ message: 'Wait for your photos to finish uploading.', onSelect: () => focusField('photos') }]
            : []),
          ...Object.entries(visibleErrors).map(([field, message]) => ({ message, onSelect: () => focusField(field) })),
        ]

  const stepProps = { input, change, errors: visibleErrors, config }
  const seller: PublicSeller = profile
    ? (({ memberSince: _memberSince, ...rest }) => rest)(profile)
    : {
        id: me.id,
        displayName: me.displayName ?? 'You',
        phoneConfirmed: true,
        reviewCount: 0,
        areaName: config.cityName,
      }

  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-col gap-6 pb-36 data-[preview=true]:max-w-content desktop:pb-0"
      data-preview={step === 'preview'}
    >
      <Seo title={published ? 'Edit listing' : 'List an item'} noindex />
      <div className="flex items-center justify-between gap-3">
        <Link
          to={`/me/listings?tab=${listing ? tabOf(listing.status) : 'draft'}`}
          className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-compact font-semibold text-muted transition-colors duration-120 hover:bg-cloud hover:text-ink"
        >
          <X aria-hidden className="size-4" />
          My listings
        </Link>
        <SaveIndicator
          published={published}
          hasId={Boolean(id)}
          dirty={draft.dirty}
          state={draft.state}
          onRetry={draft.retry}
        />
      </div>

      <StepMeter label="Listing steps" steps={wizardSteps} current={step} href={stepHref} />
      <h1 className="text-h2 text-ink tablet:text-h1">{published ? 'Edit listing' : 'List an item'}</h1>

      {listing?.status === 'RESERVED' && (
        <Banner tone="warning" title="This item is reserved">
          Changes you make here won’t change the terms already agreed with the other person.
        </Banner>
      )}

      {step !== 'preview' && <ErrorSummary title="Check these before you continue" items={summaryItems} />}

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (step !== 'preview') void next()
        }}
      >
        {step === 'basics' && <BasicsStep {...stepProps} onUploadingChange={setUploading} />}
        {step === 'condition' && <ConditionStep {...stepProps} />}
        {step === 'trade' && <TradeStep {...stepProps} published={published} />}
        {step === 'preview' && (
          <PreviewStep
            input={input}
            listing={listing}
            seller={seller}
            config={config}
            stepHref={stepHref}
            action={submitButton}
            problems={
              <>
                <ErrorSummary title="Finish these before publishing" items={summaryItems} />
                {duplicate && (
                  <Banner
                    tone="warning"
                    title="You already have this item listed"
                    action={
                      <div className="flex flex-wrap gap-x-4">
                        <Link
                          to={`/listings/${duplicate.slug}`}
                          className="inline-flex min-h-11 items-center font-semibold text-action underline-offset-4 hover:underline"
                        >
                          See that listing
                        </Link>
                        <Link
                          to={`/listings/${duplicate.id}/edit`}
                          className="inline-flex min-h-11 items-center font-semibold text-action underline-offset-4 hover:underline"
                        >
                          Edit it instead
                        </Link>
                      </div>
                    }
                  >
                    Each item can have one active listing. Edit or close the existing one, or change this draft if it’s
                    a different item.
                  </Banner>
                )}
                {failure && <Banner tone="danger" title={failure} />}
              </>
            }
          />
        )}

        <StepFooter>
          {stepIndex > 0 && (
            <Button variant="tertiary" onPress={() => goTo(wizardSteps[stepIndex - 1]!.id)} className="shrink-0">
              Back
            </Button>
          )}
          {step === 'preview' ? (
            <div className="flex-1 desktop:hidden">{submitButton}</div>
          ) : (
            <Button type="submit" className="flex-1 tablet:ml-auto tablet:flex-none tablet:px-8">
              Continue
            </Button>
          )}
        </StepFooter>
      </form>
    </div>
  )
}

function SaveIndicator({
  published,
  hasId,
  dirty,
  state,
  onRetry,
}: {
  published: boolean
  hasId: boolean
  dirty: boolean
  state: string
  onRetry: () => void
}) {
  const base = 'inline-flex items-center gap-1.5 text-compact'
  if (state === 'saving') {
    return (
      <p role="status" className={cx(base, 'text-muted')}>
        <LoaderCircle aria-hidden className="size-4 animate-spin" />
        Saving…
      </p>
    )
  }
  if (state === 'error') {
    return (
      <p role="status" className={cx(base, 'text-danger')}>
        <CloudOff aria-hidden className="size-4" />
        Couldn’t save
        <button
          type="button"
          onClick={onRetry}
          aria-label="Retry save"
          className="ml-1 font-semibold text-action underline underline-offset-4"
        >
          Retry
        </button>
      </p>
    )
  }
  if (published) {
    return dirty ? (
      <p role="status" className={cx(base, 'text-muted')}>
        Unsaved changes
      </p>
    ) : null
  }
  if (!hasId || dirty) return null
  return (
    <p role="status" className={cx(base, 'text-muted')}>
      <CircleCheck aria-hidden className="size-4 text-success" />
      Draft saved
    </p>
  )
}

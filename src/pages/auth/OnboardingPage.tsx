import { zodResolver } from '@hookform/resolvers/zod'
import { Button, toast } from '@heroui/react'
import { useEffect, useId } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Link, Navigate, useLocation, useSearchParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { Banner } from '@/components/ui/Banner'
import { Checkbox } from '@/components/ui/Checkbox'
import { CheckList } from '@/components/ui/ChoiceList'
import { TextField } from '@/components/ui/TextField'
import { useUpdateMe } from '@/features/account/api'
import { InterestPicker } from '@/features/account/components/InterestPicker'
import { TERMS_VERSION } from '@/features/account/policy'
import { displayNameSchema } from '@/features/account/profile-schema'
import { RestrictedBanner } from '@/features/account/RestrictedBanner'
import { useRuntimeConfig } from '@/features/config/api'
import { errorMessage, fieldError, isSignedOut } from '@/lib/api/error-message'
import { safeNext } from '@/lib/auth/next'
import { copy } from '@/lib/copy/copy'
import { cx } from '@/lib/cx'
import { useFormDraft } from '@/stores/drafts'
import { useSessionStore } from '@/stores/session'
import { useUiStore } from '@/stores/ui'

const UNLISTED = 'unlisted'

const onboardingSchema = z.object({
  displayName: displayNameSchema,
  areaId: z.string().nullable(),
  interests: z.array(z.string()),
  terms: z.boolean().refine(Boolean, 'Agree to the Terms and Privacy Policy to continue.'),
  adult: z.boolean().refine(Boolean, 'Confirm you’re 18 or older to trade on NextOwn.'),
  marketing: z.boolean(),
})

type OnboardingForm = z.infer<typeof onboardingSchema>

const emptyForm: OnboardingForm = {
  displayName: '',
  areaId: null,
  interests: [],
  terms: false,
  adult: false,
  marketing: false,
}

/**
 * UX-09: two short steps, then back to where the person was going. The step lives in the URL so the browser's
 * Back works, and the answers are a draft so a reload or an expired session loses nothing.
 */
export function OnboardingPage() {
  const [params, setParams] = useSearchParams()
  const next = safeNext(params.get('next'))
  const step = params.get('step') === '2' ? 2 : 1
  const confirmed = (useLocation().state as { confirmed?: boolean } | null)?.confirmed
  const userId = useSessionStore((s) => s.userId)
  const onboarded = useSessionStore((s) => s.onboarded)
  const [draft, saveDraft, clearDraft] = useFormDraft<OnboardingForm>(`onboarding:${userId}`, emptyForm)
  const { control, handleSubmit, trigger, setError, watch } = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: draft,
  })
  const update = useUpdateMe()
  const setAreaIds = useUiStore((s) => s.setAreaIds)
  const { data: config } = useRuntimeConfig()
  const interestsLabel = useId()
  const areaId = watch('areaId')

  // The answers are a draft as they're typed, so a reload or an expired session loses nothing
  useEffect(() => {
    const subscription = watch((values) => saveDraft(values as OnboardingForm))
    return () => subscription.unsubscribe()
  }, [watch, saveDraft])

  if (onboarded) return <Navigate to={next} replace />

  const city = config?.cityName ?? 'the pilot city'

  function goToStep(target: 1 | 2) {
    const nextParams = new URLSearchParams(params)
    if (target === 2) nextParams.set('step', '2')
    else nextParams.delete('step')
    setParams(nextParams)
  }

  // Step 1 checks only its own fields; the rest are checked when the whole form is sent
  async function submitStepOne() {
    if (await trigger('displayName')) goToStep(2)
  }

  const submitStepTwo = handleSubmit(
    async (values) => {
      const area = values.areaId === UNLISTED ? null : values.areaId
      try {
        await update.mutateAsync({
          displayName: values.displayName,
          areaId: area,
          interests: values.interests,
          marketingOptIn: values.marketing,
          acceptTerms: { version: TERMS_VERSION, adult: values.adult },
        })
        clearDraft()
        if (area) setAreaIds([area])
        toast.success('You’re all set.')
      } catch (error) {
        const message = fieldError(error, 'displayName')
        if (message) {
          setError('displayName', { message })
          goToStep(1)
        }
      }
    },
    // A name that became invalid (for example, edited in another tab) sends the person back to fix it
    (errors) => errors.displayName && goToStep(1),
  )

  return (
    <>
      <Seo title="Set up your profile" noindex />
      <StepMeter step={step} />
      <h1 className="mt-3 text-h2 text-ink tablet:text-h1">Set up your profile</h1>
      {confirmed && step === 1 && <Banner tone="success" title={copy.phoneBadgeExplainer} className="mt-4" />}
      <RestrictedBanner className="mt-4" />

      {step === 1 ? (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            void submitStepOne()
          }}
          className="mt-6 flex flex-col gap-6"
        >
          <Controller
            control={control}
            name="displayName"
            render={({ field, fieldState }) => (
              <TextField
                label="Display name"
                hint="Shown on your listings and offers. A first name and an initial works well, like “Ada O.”"
                autoComplete="nickname"
                maxLength={40}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <div className="flex flex-col gap-2">
            <Controller
              control={control}
              name="areaId"
              render={({ field }) => (
                <CheckList
                  label="Your area"
                  options={[
                    ...(config?.areas ?? []).map((a) => ({ value: a.id, label: a.name })),
                    { value: UNLISTED, label: 'My area isn’t listed' },
                  ]}
                  value={field.value ? [field.value] : []}
                  onChange={([chosen]) => field.onChange(chosen ?? null)}
                  single
                />
              )}
            />
            <p className="text-compact text-muted">
              {areaId === UNLISTED
                ? `That’s fine. You’ll see items from across ${city}, and you can choose an area later.`
                : `The part of ${city} where you usually meet to trade. We never ask for your address.`}
            </p>
          </div>
          <Button type="submit" fullWidth>
            Continue
          </Button>
        </form>
      ) : (
        <form noValidate onSubmit={(e) => void submitStepTwo(e)} className="mt-6 flex flex-col gap-6">
          {/* The name has its own field on step 1; an ended session gets the sign-in prompt */}
          {update.error && !fieldError(update.error, 'displayName') && !isSignedOut(update.error) && (
            <Banner tone="danger" title="We couldn't save your profile">
              {errorMessage(update.error)} Your answers are kept.
            </Banner>
          )}
          <div className="flex flex-col gap-2">
            <p id={interestsLabel} className="text-compact font-semibold text-ink">
              What are you interested in? <span className="font-normal text-muted">Optional</span>
            </p>
            <Controller
              control={control}
              name="interests"
              render={({ field }) => (
                <InterestPicker
                  categories={config?.categories ?? []}
                  value={field.value}
                  onChange={field.onChange}
                  labelledBy={interestsLabel}
                />
              )}
            />
            <p className="text-compact text-muted">We show these first. You’ll still see everything else.</p>
          </div>

          <fieldset className="flex flex-col">
            <legend className="mb-1 text-compact font-semibold text-ink">Before you trade</legend>
            <Controller
              control={control}
              name="terms"
              render={({ field, fieldState }) => (
                <Checkbox checked={field.value} onChange={field.onChange} error={fieldState.error?.message}>
                  I agree to the Terms and the Privacy Policy
                </Checkbox>
              )}
            />
            <p className="pb-1 pl-9 text-compact text-muted">
              Read the{' '}
              <Link to="/terms" className="font-semibold text-action underline-offset-4 hover:underline">
                Terms
              </Link>{' '}
              and the{' '}
              <Link to="/privacy" className="font-semibold text-action underline-offset-4 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
            <Controller
              control={control}
              name="adult"
              render={({ field, fieldState }) => (
                <Checkbox checked={field.value} onChange={field.onChange} error={fieldState.error?.message}>
                  I’m 18 or older
                </Checkbox>
              )}
            />
          </fieldset>

          <fieldset className="flex flex-col rounded-control border border-border p-3 pt-1">
            <legend className="px-1 text-compact font-semibold text-ink">Optional</legend>
            <Controller
              control={control}
              name="marketing"
              render={({ field }) => (
                <Checkbox checked={field.value} onChange={field.onChange}>
                  Text me occasional tips and news from NextOwn
                </Checkbox>
              )}
            />
            <p className="pl-9 text-compact text-muted">
              Messages about your account and your trades are always sent. You can change this in Settings.
            </p>
          </fieldset>

          <div className="flex flex-col-reverse gap-2 tablet:flex-row">
            <Button variant="tertiary" onPress={() => goToStep(1)} className="tablet:w-auto">
              Back
            </Button>
            <Button type="submit" fullWidth isPending={update.isPending} className="tablet:flex-1">
              Continue to marketplace
            </Button>
          </div>
        </form>
      )}
    </>
  )
}

function StepMeter({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption font-semibold text-muted">Step {step} of 2</p>
      <div aria-hidden className="grid grid-cols-2 gap-1.5">
        {[1, 2].map((n) => (
          <span
            key={n}
            className={cx('h-1 rounded-full transition-colors duration-200', n <= step ? 'bg-action' : 'bg-border')}
          />
        ))}
      </div>
    </div>
  )
}

import { Button, toast } from '@heroui/react'
import { useId, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useSearchParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { Banner } from '@/components/ui/Banner'
import { Checkbox } from '@/components/ui/Checkbox'
import { CheckList } from '@/components/ui/ChoiceList'
import { TextField } from '@/components/ui/TextField'
import { useUpdateMe } from '@/features/account/api'
import { InterestPicker } from '@/features/account/components/InterestPicker'
import { TERMS_VERSION } from '@/features/account/policy'
import { RestrictedBanner } from '@/features/account/RestrictedBanner'
import { useRuntimeConfig } from '@/features/config/api'
import { isApiError } from '@/lib/api/api-error'
import { safeNext } from '@/lib/auth/next'
import { copy } from '@/lib/copy/copy'
import { cx } from '@/lib/cx'
import { useFormDraft } from '@/stores/drafts'
import { useSessionStore } from '@/stores/session'
import { useUiStore } from '@/stores/ui'

const UNLISTED = 'unlisted'

type OnboardingForm = {
  displayName: string
  areaId: string | null
  interests: string[]
  terms: boolean
  adult: boolean
  marketing: boolean
}

const emptyForm: OnboardingForm = {
  displayName: '',
  areaId: null,
  interests: [],
  terms: false,
  adult: false,
  marketing: false,
}

const validName = (name: string) => name.trim().length >= 2 && name.trim().length <= 40

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
  const [form, setForm, clearForm] = useFormDraft<OnboardingForm>(`onboarding:${userId}`, emptyForm)
  // Which step's submit was tried, so errors show only after Continue
  const [attempted, setAttempted] = useState<0 | 1 | 2>(0)
  const update = useUpdateMe()
  const setAreaIds = useUiStore((s) => s.setAreaIds)
  const { data: config } = useRuntimeConfig()
  const interestsLabel = useId()

  if (onboarded) return <Navigate to={next} replace />

  const change = (changes: Partial<OnboardingForm>) => setForm({ ...form, ...changes })
  const city = config?.cityName ?? 'the pilot city'
  const nameError =
    (attempted === 1 && !validName(form.displayName) ? 'Enter a name between 2 and 40 characters.' : null) ??
    (isApiError(update.error) ? (update.error.fieldErrors?.displayName ?? null) : null)
  const showConsentErrors = attempted === 2

  function goToStep(target: 1 | 2) {
    const nextParams = new URLSearchParams(params)
    if (target === 2) nextParams.set('step', '2')
    else nextParams.delete('step')
    setParams(nextParams)
  }

  function submitStepOne(event: FormEvent) {
    event.preventDefault()
    if (!validName(form.displayName)) return setAttempted(1)
    setAttempted(0)
    goToStep(2)
  }

  function submitStepTwo(event: FormEvent) {
    event.preventDefault()
    if (!form.terms || !form.adult) return setAttempted(2)
    const areaId = form.areaId === UNLISTED ? null : form.areaId
    update.mutate(
      {
        displayName: form.displayName.trim(),
        areaId,
        interests: form.interests,
        marketingOptIn: form.marketing,
        acceptTerms: { version: TERMS_VERSION, adult: form.adult },
      },
      {
        onSuccess: () => {
          clearForm()
          if (areaId) setAreaIds([areaId])
          toast.success('You’re all set.')
        },
        onError: (error) => {
          if (isApiError(error) && error.fieldErrors?.displayName) goToStep(1)
        },
      },
    )
  }

  return (
    <>
      <Seo title="Set up your profile" noindex />
      <StepMeter step={step} />
      <h1 className="mt-3 text-h1 text-ink">Set up your profile</h1>
      {confirmed && step === 1 && <Banner tone="success" title={copy.phoneBadgeExplainer} className="mt-4" />}
      <RestrictedBanner className="mt-4" />

      {step === 1 ? (
        <form noValidate onSubmit={submitStepOne} className="mt-6 flex flex-col gap-6">
          <TextField
            label="Display name"
            hint="Shown on your listings and offers. A first name and an initial works well, like “Ada O.”"
            autoComplete="nickname"
            maxLength={40}
            value={form.displayName}
            onChange={(e) => change({ displayName: e.target.value })}
            error={nameError}
          />
          <div className="flex flex-col gap-2">
            <CheckList
              label="Your area"
              options={[
                ...(config?.areas ?? []).map((a) => ({ value: a.id, label: a.name })),
                { value: UNLISTED, label: 'My area isn’t listed' },
              ]}
              value={form.areaId ? [form.areaId] : []}
              onChange={([areaId]) => change({ areaId: areaId ?? null })}
              single
            />
            <p className="text-compact text-muted">
              {form.areaId === UNLISTED
                ? `That’s fine. You’ll see items from across ${city}, and you can choose an area later.`
                : `The part of ${city} where you usually meet to trade. We never ask for your address.`}
            </p>
          </div>
          <Button type="submit" fullWidth>
            Continue
          </Button>
        </form>
      ) : (
        <form noValidate onSubmit={submitStepTwo} className="mt-6 flex flex-col gap-6">
          {update.error && !isApiError(update.error) && (
            <Banner tone="danger" title="We couldn't save your profile">
              Check your connection and try again. Your answers are kept.
            </Banner>
          )}
          <div className="flex flex-col gap-2">
            <p id={interestsLabel} className="text-compact font-semibold text-ink">
              What are you interested in? <span className="font-normal text-muted">Optional</span>
            </p>
            <InterestPicker
              categories={config?.categories ?? []}
              value={form.interests}
              onChange={(interests) => change({ interests })}
              labelledBy={interestsLabel}
            />
            <p className="text-compact text-muted">We show these first. You’ll still see everything else.</p>
          </div>

          <fieldset className="flex flex-col">
            <legend className="mb-1 text-compact font-semibold text-ink">Before you trade</legend>
            <Checkbox
              checked={form.terms}
              onChange={(terms) => change({ terms })}
              error={showConsentErrors && !form.terms ? 'Agree to the Terms and Privacy Policy to continue.' : null}
            >
              I agree to the Terms and the Privacy Policy
            </Checkbox>
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
            <Checkbox
              checked={form.adult}
              onChange={(adult) => change({ adult })}
              error={showConsentErrors && !form.adult ? 'Confirm you’re 18 or older to trade on NextOwn.' : null}
            >
              I’m 18 or older
            </Checkbox>
          </fieldset>

          <fieldset className="flex flex-col rounded-control border border-border p-3 pt-1">
            <legend className="px-1 text-compact font-semibold text-ink">Optional</legend>
            <Checkbox checked={form.marketing} onChange={(marketing) => change({ marketing })}>
              Text me occasional tips and news from NextOwn
            </Checkbox>
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

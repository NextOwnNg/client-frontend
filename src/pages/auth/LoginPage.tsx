import { Button } from '@heroui/react'
import { Info } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { Banner } from '@/components/ui/Banner'
import { PhoneField } from '@/components/ui/PhoneField'
import { useRequestCode } from '@/features/account/api'
import { authCopy, waitText } from '@/features/account/copy'
import { isApiError } from '@/lib/api/api-error'
import { safeNext } from '@/lib/auth/next'
import { normalisePhone } from '@/lib/phone/phone'

export type VerifyState = { phone: string; resendAt: number }

/** UX-07: one flow for signing in and creating an account. The phone moves on in router state, never storage. */
export function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  // "Change number" on the code step brings the number back to edit
  const returning = (useLocation().state as { phone?: string } | null)?.phone
  const [phone, setPhone] = useState<string | null>(returning && normalisePhone(returning).ok ? returning : null)
  const [attempted, setAttempted] = useState(false)
  const request = useRequestCode()

  const serverPhoneError =
    isApiError(request.error) && request.error.code === 'VALIDATION_ERROR' ? authCopy.invalidPhone : null
  const phoneError = (attempted && !phone ? authCopy.invalidPhone : null) ?? serverPhoneError

  function submit(event: FormEvent) {
    event.preventDefault()
    setAttempted(true)
    if (!phone) return
    request.mutate(phone, {
      onSuccess: ({ resendAfterSeconds }) => {
        const state: VerifyState = { phone, resendAt: Date.now() + resendAfterSeconds * 1000 }
        void navigate(`/verify?next=${encodeURIComponent(next)}`, { state })
      },
    })
  }

  return (
    <>
      <Seo title="Sign in" noindex />
      <h1 className="text-h1 text-ink">Sign in or create an account</h1>
      <p className="mt-2 text-body text-muted">Enter your phone number and we’ll text you a 6-digit code.</p>

      <form noValidate onSubmit={submit} className="mt-6 flex flex-col gap-5">
        <RequestError error={request.error} />
        <PhoneField
          value={returning ? returning.replace(/^\+234/, '') : ''}
          onChange={setPhone}
          error={phoneError}
          hint={null}
        />
        <div className="flex gap-3 rounded-control border border-border bg-surface p-4">
          <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-action" />
          <div className="flex flex-col gap-1">
            <p className="text-compact font-semibold text-ink">{authCopy.whyPhoneTitle}</p>
            <p className="text-compact text-muted">{authCopy.whyPhone}</p>
          </div>
        </div>
        <Button type="submit" fullWidth isPending={request.isPending}>
          Send code
        </Button>
      </form>

      <p className="mt-6 text-compact text-muted">
        New here? You’ll set up your profile after confirming your number. Read our{' '}
        <Link to="/terms" className="font-semibold text-action underline-offset-4 hover:underline">
          Terms
        </Link>{' '}
        and{' '}
        <Link to="/privacy" className="font-semibold text-action underline-offset-4 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </>
  )
}

function RequestError({ error }: { error: Error | null }) {
  if (!error || (isApiError(error) && error.code === 'VALIDATION_ERROR')) return null
  if (isApiError(error) && error.code === 'RATE_LIMITED') {
    return (
      <Banner tone="warning" title="Please wait before asking for another code">
        Try again in {waitText(error.retryAfterSeconds)}.
      </Banner>
    )
  }
  return (
    <Banner tone="danger" title="We couldn't send the code">
      Check your connection and try again.
    </Banner>
  )
}

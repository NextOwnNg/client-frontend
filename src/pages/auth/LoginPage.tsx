import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@heroui/react'
import { Info } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { Banner } from '@/components/ui/Banner'
import { PhoneField } from '@/components/ui/PhoneField'
import { useRequestCode } from '@/features/account/api'
import { authCopy } from '@/features/account/copy'
import { errorReason, fieldError, fieldErrorsOf, waitSeconds } from '@/lib/api/error-message'
import { safeNext } from '@/lib/auth/next'
import { normalisePhone } from '@/lib/phone/phone'

export type VerifyState = { phone: string; resendAt: number }

/** `PhoneField` reports a normalised number, or null while what's typed isn't a Nigerian mobile. */
const phoneSchema = z.object({
  phone: z
    .string()
    .nullable()
    .refine((phone) => phone !== null, authCopy.invalidPhone),
})

type PhoneInput = z.input<typeof phoneSchema>
type PhoneForm = z.output<typeof phoneSchema>

/** UX-07: one flow for signing in and creating an account. The phone moves on in router state, never storage. */
export function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  // "Change number" on the code step brings the number back to edit
  const returning = (useLocation().state as { phone?: string } | null)?.phone
  const valid = returning && normalisePhone(returning)
  const request = useRequestCode()
  const { control, handleSubmit, setError } = useForm<PhoneInput, unknown, PhoneForm>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: valid && valid.ok ? valid.e164 : null },
  })

  const submit = handleSubmit(async ({ phone }) => {
    try {
      const { resendAfterSeconds } = await request.mutateAsync(phone)
      const state: VerifyState = { phone, resendAt: Date.now() + resendAfterSeconds * 1000 }
      void navigate(`/verify?next=${encodeURIComponent(next)}`, { state })
    } catch (error) {
      // A rejected number shows on the field; anything else is the banner above the form
      const message = fieldError(error, 'phone')
      if (message) setError('phone', { message })
    }
  })

  return (
    <>
      <Seo title="Sign in" noindex />
      <h1 className="text-h2 text-ink tablet:text-h1">Sign in or create an account</h1>
      <p className="mt-2 text-body text-muted">Enter your phone number and we’ll text you a 6-digit code.</p>

      <form noValidate onSubmit={(e) => void submit(e)} className="mt-6 flex flex-col gap-5">
        <RequestError error={request.error} />
        <Controller
          control={control}
          name="phone"
          render={({ field, fieldState }) => (
            <PhoneField
              value={returning ? returning.replace(/^\+234/, '') : ''}
              onChange={field.onChange}
              error={fieldState.error?.message}
              hint={null}
            />
          )}
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
  // A rejected number shows on the field instead
  if (!error || fieldErrorsOf(error)) return null
  const waiting = waitSeconds(error) !== undefined
  return (
    <Banner
      tone={waiting ? 'warning' : 'danger'}
      title={waiting ? 'Please wait before asking for another code' : "We couldn't send the code"}
    >
      {errorReason(error)}
    </Banner>
  )
}

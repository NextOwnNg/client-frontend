import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@heroui/react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { Banner } from '@/components/ui/Banner'
import { TextField } from '@/components/ui/TextField'
import { useForgotPassword } from '@/features/account/api'
import { emailSchema } from '@/features/account/auth-schema'
import { errorReason, fieldError, fieldErrorsOf, waitSeconds } from '@/lib/api/error-message'
import { loginPath, resetPasswordPath, safeNext } from '@/lib/auth/next'
import type { AuthState } from '@/pages/auth/LoginPage'

export type ResetState = { email: string; resendAt: number }

const forgotSchema = z.object({ email: emailSchema })

type ForgotInput = z.input<typeof forgotSchema>
type ForgotForm = z.output<typeof forgotSchema>

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const carried = (useLocation().state as AuthState | null)?.email ?? ''
  const forgot = useForgotPassword()
  const { control, handleSubmit, setError, watch } = useForm<ForgotInput, unknown, ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: carried },
  })
  const email = watch('email')

  const submit = handleSubmit(async (values) => {
    try {
      const { resendAfterSeconds } = await forgot.mutateAsync(values.email)
      const state: ResetState = { email: values.email, resendAt: Date.now() + resendAfterSeconds * 1000 }
      void navigate(resetPasswordPath(next), { state })
    } catch (error) {
      const message = fieldError(error, 'email')
      if (message) setError('email', { message })
    }
  })

  return (
    <>
      <Seo title="Reset your password" noindex />
      <h1 className="text-h2 text-ink tablet:text-h1">Reset your password</h1>
      <p className="mt-2 text-body text-muted">
        Enter the email you signed up with. If it has an account, we’ll email you a 6-digit code.
      </p>

      <form noValidate onSubmit={(e) => void submit(e)} className="mt-6 flex flex-col gap-5">
        {forgot.error && !fieldErrorsOf(forgot.error) && (
          <Banner
            tone={waitSeconds(forgot.error) !== undefined ? 'warning' : 'danger'}
            title={
              waitSeconds(forgot.error) !== undefined
                ? 'Please wait before asking for another code'
                : "We couldn't send the code"
            }
          >
            {errorReason(forgot.error)}
          </Banner>
        )}
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <TextField
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <Button type="submit" fullWidth isPending={forgot.isPending}>
          Send code
        </Button>
      </form>

      <p className="mt-6 text-compact text-muted">
        Remembered it?{' '}
        <Link
          to={loginPath(next)}
          state={{ email: email.trim() } satisfies AuthState}
          className="font-semibold text-action underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </>
  )
}

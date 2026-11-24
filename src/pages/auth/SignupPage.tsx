import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@heroui/react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { Banner } from '@/components/ui/Banner'
import { PasswordField } from '@/components/ui/PasswordField'
import { TextField } from '@/components/ui/TextField'
import { useSignUp } from '@/features/account/api'
import { emailSchema, newPasswordSchema, PASSWORD_MAX } from '@/features/account/auth-schema'
import { PasswordStrengthMeter } from '@/features/account/components/PasswordStrengthMeter'
import { errorReason, fieldError, fieldErrorsOf, waitSeconds } from '@/lib/api/error-message'
import { loginPath, safeNext, verifyPath } from '@/lib/auth/next'
import type { AuthState, VerifyState } from '@/pages/auth/LoginPage'

const signUpSchema = z.object({ email: emailSchema, password: newPasswordSchema })

type SignUpInput = z.input<typeof signUpSchema>
type SignUpForm = z.output<typeof signUpSchema>

export function SignupPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const carried = (useLocation().state as AuthState | null)?.email ?? ''
  const signUp = useSignUp()
  const { control, handleSubmit, setError, watch } = useForm<SignUpInput, unknown, SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: carried, password: '' },
  })
  const email = watch('email')

  const submit = handleSubmit(async (values) => {
    try {
      const { resendAfterSeconds } = await signUp.mutateAsync(values)
      const state: VerifyState = {
        email: values.email,
        resendAt: Date.now() + resendAfterSeconds * 1000,
        from: 'signup',
      }
      void navigate(verifyPath(next), { state })
    } catch (error) {
      for (const field of ['email', 'password'] as const) {
        const message = fieldError(error, field)
        if (message) setError(field, { message })
      }
    }
  })

  return (
    <>
      <Seo title="Create an account" noindex />
      <h1 className="text-h2 text-ink tablet:text-h1">Create an account</h1>
      <p className="mt-2 text-body text-muted">We’ll email you a 6-digit code to confirm it’s you.</p>

      <form noValidate onSubmit={(e) => void submit(e)} className="mt-6 flex flex-col gap-5">
        <SignUpError error={signUp.error} />
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <TextField
              label="Email"
              hint="Never shown on your profile, listings or offers."
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
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <PasswordField
              autoComplete="new-password"
              hint={field.value ? <PasswordStrengthMeter password={field.value} /> : undefined}
              maxLength={PASSWORD_MAX}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <Button type="submit" fullWidth isPending={signUp.isPending}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-compact text-muted">
        Already have an account?{' '}
        <Link
          to={loginPath(next)}
          state={{ email: email.trim() } satisfies AuthState}
          className="font-semibold text-action underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
      <p className="mt-2 text-compact text-muted">
        You’ll set up your profile after confirming your email. Read our{' '}
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

function SignUpError({ error }: { error: Error | null }) {
  // A rejected email or password shows on its field instead
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

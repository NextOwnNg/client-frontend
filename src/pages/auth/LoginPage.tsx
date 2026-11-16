import { zodResolver } from '@hookform/resolvers/zod'
import { Button, toast } from '@heroui/react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { Banner } from '@/components/ui/Banner'
import { PasswordField } from '@/components/ui/PasswordField'
import { TextField } from '@/components/ui/TextField'
import { useResendEmailCode, useSignIn } from '@/features/account/api'
import { emailSchema } from '@/features/account/auth-schema'
import { authCopy } from '@/features/account/copy'
import { toApiError } from '@/lib/api/api-error'
import { errorReason, fieldError, fieldErrorsOf, inputProblem, waitSeconds } from '@/lib/api/error-message'
import { forgotPasswordPath, onboardingPath, safeNext, signupPath, verifyPath } from '@/lib/auth/next'

export type AuthState = { email?: string }

export type VerifyState = { email: string; resendAt: number; from: 'login' | 'signup' }

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, authCopy.enterPassword),
})

type SignInInput = z.input<typeof signInSchema>
type SignInForm = z.output<typeof signInSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const carried = (useLocation().state as AuthState | null)?.email ?? ''
  const signIn = useSignIn()
  const resend = useResendEmailCode()
  const { control, handleSubmit, setError, watch } = useForm<SignInInput, unknown, SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: carried, password: '' },
  })
  const email = watch('email')

  const submit = handleSubmit(async (values) => {
    try {
      const { user } = await signIn.mutateAsync(values)
      if (!user.onboarded) {
        void navigate(onboardingPath(next), { replace: true })
        return
      }
      toast.success('Welcome back.')
      void navigate(next, { replace: true })
    } catch (error) {
      if (toApiError(error).code === 'EMAIL_UNVERIFIED') return confirmEmailFirst(values.email)
      for (const field of ['email', 'password'] as const) {
        const message = fieldError(error, field)
        if (message) setError(field, { message })
      }
    }
  })

  // The password was right but the email was never confirmed: send a fresh code and finish that first
  async function confirmEmailFirst(address: string) {
    try {
      const { resendAfterSeconds } = await resend.mutateAsync(address)
      const state: VerifyState = { email: address, resendAt: Date.now() + resendAfterSeconds * 1000, from: 'login' }
      void navigate(verifyPath(next), { state })
    } catch {
      // Shown by the banner
    }
  }

  const carry: AuthState = { email: email.trim() }

  return (
    <>
      <Seo title="Sign in" noindex />
      <h1 className="text-h2 text-ink tablet:text-h1">Sign in</h1>
      <p className="mt-2 text-body text-muted">Welcome back. Sign in with your email and password.</p>

      <form noValidate onSubmit={(e) => void submit(e)} className="mt-6 flex flex-col gap-5">
        <SignInError error={signIn.error ?? resend.error} />
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
        <div className="flex flex-col gap-1">
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <PasswordField
                autoComplete="current-password"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Link
            to={forgotPasswordPath(next)}
            state={carry}
            className="inline-flex min-h-11 items-center self-start text-compact font-semibold text-action underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" fullWidth isPending={signIn.isPending || resend.isPending}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-compact text-muted">
        New to NextOwn?{' '}
        <Link
          to={signupPath(next)}
          state={carry}
          className="font-semibold text-action underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </>
  )
}

function SignInError({ error }: { error: Error | null }) {
  // A rejected field shows on the field; an unconfirmed email moves on to the code step instead
  if (!error || fieldErrorsOf(error) || toApiError(error).code === 'EMAIL_UNVERIFIED') return null
  const waiting = waitSeconds(error) !== undefined
  const wrong = toApiError(error).code === 'INVALID_CREDENTIALS'
  return (
    <Banner
      tone={waiting ? 'warning' : 'danger'}
      title={waiting ? 'Too many tries' : wrong ? 'Check your email and password' : "We couldn't sign you in"}
    >
      {inputProblem(error) ?? errorReason(error)}
    </Banner>
  )
}

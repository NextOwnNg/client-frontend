import { zodResolver } from '@hookform/resolvers/zod'
import { Button, toast } from '@heroui/react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { Banner } from '@/components/ui/Banner'
import { PasswordField } from '@/components/ui/PasswordField'
import { useForgotPassword, useResetPassword } from '@/features/account/api'
import { codeSchema, newPasswordSchema, PASSWORD_MAX } from '@/features/account/auth-schema'
import { CodeField } from '@/features/account/components/CodeField'
import { ResendCode } from '@/features/account/components/ResendCode'
import { authCopy } from '@/features/account/copy'
import { useCountdown } from '@/features/account/use-countdown'
import { toApiError } from '@/lib/api/api-error'
import { errorReason, fieldError, inputProblem, waitSeconds } from '@/lib/api/error-message'
import { forgotPasswordPath, onboardingPath, safeNext } from '@/lib/auth/next'
import type { ResetState } from '@/pages/auth/ForgotPasswordPage'
import type { AuthState } from '@/pages/auth/LoginPage'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const state = useLocation().state as ResetState | null

  if (!state?.email) return <Navigate to={forgotPasswordPath(next)} replace />
  return <ResetStep email={state.email} initialResendAt={state.resendAt} next={next} />
}

const resetSchema = z.object({ code: codeSchema, password: newPasswordSchema })

type ResetForm = z.infer<typeof resetSchema>

type BannerProblem = { title: string; body: string }

function ResetStep({ email, initialResendAt, next }: { email: string; initialResendAt: number; next: string }) {
  const navigate = useNavigate()
  const [resendAt, setResendAt] = useState(initialResendAt)
  const [banner, setBanner] = useState<BannerProblem | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const { control, handleSubmit, setError, resetField } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: '', password: '' },
  })
  const reset = useResetPassword()
  const resend = useForgotPassword()
  const secondsLeft = useCountdown(resendAt)

  const submit = handleSubmit(async (values) => {
    setNotice(null)
    setBanner(null)
    try {
      const { user } = await reset.mutateAsync({ email, ...values })
      toast.success('Password changed. You’re signed in.')
      void navigate(user.onboarded ? next : onboardingPath(next), { replace: true })
    } catch (error) {
      const wait = waitSeconds(error)
      if (wait !== undefined) {
        setResendAt(Date.now() + wait * 1000)
        return setBanner({ title: 'Too many tries', body: errorReason(error) })
      }
      const password = fieldError(error, 'password')
      if (password) setError('password', { message: password })
      const code = inputProblem(error, 'code')
      if (code && toApiError(error).code === 'OTP_EXPIRED') setResendAt(0)
      if (code) setError('code', { message: code })
      if (!password && !code) setBanner({ title: "We couldn't change your password", body: errorReason(error) })
    }
  })

  function sendAgain() {
    setNotice(null)
    resend.mutate(email, {
      onSuccess: ({ resendAfterSeconds }) => {
        resetField('code')
        setBanner(null)
        setResendAt(Date.now() + resendAfterSeconds * 1000)
        setNotice(authCopy.codeResent)
      },
      onError: (error) => {
        const wait = waitSeconds(error)
        if (wait !== undefined) setResendAt(Date.now() + wait * 1000)
        setBanner({
          title: wait !== undefined ? 'Please wait before asking for another code' : "We couldn't send a new code",
          body: errorReason(error),
        })
      },
    })
  }

  return (
    <>
      <Seo title="Choose a new password" noindex />
      <h1 className="text-h2 text-ink tablet:text-h1">Choose a new password</h1>
      <p className="mt-2 text-body text-muted">
        If <span className="font-semibold break-all text-ink">{email}</span> has an account, we sent it a 6-digit code.
      </p>
      <Link
        to={forgotPasswordPath(next)}
        state={{ email } satisfies AuthState}
        replace
        className="mt-1 inline-flex min-h-11 items-center text-compact font-semibold text-action underline-offset-4 hover:underline"
      >
        Use a different email
      </Link>

      <form noValidate onSubmit={(e) => void submit(e)} className="mt-4 flex flex-col gap-5">
        {banner && (
          <Banner tone="warning" title={banner.title}>
            {banner.body}
          </Banner>
        )}
        <Controller
          control={control}
          name="code"
          render={({ field, fieldState }) => (
            <CodeField value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <PasswordField
              label="New password"
              autoComplete="new-password"
              hint="At least 8 characters."
              maxLength={PASSWORD_MAX}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <Button type="submit" fullWidth isPending={reset.isPending}>
          Change password
        </Button>
      </form>

      <ResendCode secondsLeft={secondsLeft} isPending={resend.isPending} onSend={sendAgain} notice={notice} />
    </>
  )
}

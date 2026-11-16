import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@heroui/react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { Banner } from '@/components/ui/Banner'
import { useResendEmailCode, useVerifyEmail } from '@/features/account/api'
import { codeSchema } from '@/features/account/auth-schema'
import { CodeField } from '@/features/account/components/CodeField'
import { ResendCode } from '@/features/account/components/ResendCode'
import { authCopy } from '@/features/account/copy'
import { useCountdown } from '@/features/account/use-countdown'
import { toApiError } from '@/lib/api/api-error'
import { errorReason, inputProblem, waitSeconds } from '@/lib/api/error-message'
import { loginPath, onboardingPath, safeNext, signupPath } from '@/lib/auth/next'
import type { AuthState, VerifyState } from '@/pages/auth/LoginPage'

export function VerifyPage() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const state = useLocation().state as VerifyState | null

  if (!state?.email) return <Navigate to={signupPath(next)} replace />
  return <CodeStep email={state.email} initialResendAt={state.resendAt} from={state.from} next={next} />
}

const codeFormSchema = z.object({ code: codeSchema })

type CodeForm = z.infer<typeof codeFormSchema>

type BannerProblem = { title: string; body: string }

type CodeStepProps = { email: string; initialResendAt: number; from: VerifyState['from']; next: string }

function CodeStep({ email, initialResendAt, from, next }: CodeStepProps) {
  const navigate = useNavigate()
  const [resendAt, setResendAt] = useState(initialResendAt)
  const [banner, setBanner] = useState<BannerProblem | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const { control, handleSubmit, setError, reset } = useForm<CodeForm>({
    resolver: zodResolver(codeFormSchema),
    defaultValues: { code: '' },
  })
  const verify = useVerifyEmail()
  const resend = useResendEmailCode()
  const secondsLeft = useCountdown(resendAt)

  const submit = handleSubmit(async ({ code }) => {
    setNotice(null)
    setBanner(null)
    try {
      const { user } = await verify.mutateAsync({ email, code })
      // A confirmed email always has its profile to set up, unless this was an older account finishing up
      void navigate(user.onboarded ? next : onboardingPath(next), { replace: true, state: { confirmed: true } })
    } catch (error) {
      const wait = waitSeconds(error)
      if (wait !== undefined) {
        setResendAt(Date.now() + wait * 1000)
        return setBanner({ title: 'Too many tries', body: errorReason(error) })
      }
      const field = inputProblem(error)
      if (!field) return setBanner({ title: "We couldn't check the code", body: errorReason(error) })
      // An expired code can't be fixed by retyping it, so a new one can be sent straight away
      if (toApiError(error).code === 'OTP_EXPIRED') setResendAt(0)
      setError('code', { message: field })
    }
  })

  function sendAgain() {
    setNotice(null)
    resend.mutate(email, {
      onSuccess: ({ resendAfterSeconds }) => {
        reset()
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
      <Seo title="Confirm your email" noindex />
      <h1 className="text-h2 text-ink tablet:text-h1">Check your email</h1>
      <p className="mt-2 text-body text-muted">
        We sent a 6-digit code to <span className="font-semibold break-all text-ink">{email}</span>
      </p>
      <Link
        to={from === 'login' ? loginPath(next) : signupPath(next)}
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
        <Button type="submit" fullWidth isPending={verify.isPending}>
          Confirm email
        </Button>
      </form>

      <ResendCode secondsLeft={secondsLeft} isPending={resend.isPending} onSend={sendAgain} notice={notice} />
    </>
  )
}

import { Button, toast } from '@heroui/react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { Banner } from '@/components/ui/Banner'
import { useRequestCode, useVerifyCode } from '@/features/account/api'
import { CodeField } from '@/features/account/components/CodeField'
import { authCopy, waitText } from '@/features/account/copy'
import { formatCountdown, useCountdown } from '@/features/account/use-countdown'
import { isApiError } from '@/lib/api/api-error'
import { loginPath, onboardingPath, safeNext } from '@/lib/auth/next'
import { useMockApi } from '@/lib/env'
import { formatPhoneDisplay } from '@/lib/phone/phone'
import { SAMPLE_CODE } from '@/mocks/sample-code'
import type { VerifyState } from '@/pages/auth/LoginPage'

/** UX-08. Without a phone in progress (opened directly, or the history entry was lost) it starts again at sign-in. */
export function VerifyPage() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const state = useLocation().state as VerifyState | null

  if (!state?.phone) return <Navigate to={loginPath(next)} replace />
  return <CodeStep phone={state.phone} initialResendAt={state.resendAt} next={next} />
}

type Problem = { field?: string; banner?: { title: string; body: string } }

function CodeStep({ phone, initialResendAt, next }: { phone: string; initialResendAt: number; next: string }) {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [resendAt, setResendAt] = useState(initialResendAt)
  const [problem, setProblem] = useState<Problem>({})
  const [notice, setNotice] = useState<string | null>(null)
  const verify = useVerifyCode()
  const resend = useRequestCode()
  const secondsLeft = useCountdown(resendAt)

  function submit(event: FormEvent) {
    event.preventDefault()
    setNotice(null)
    if (code.length !== 6) return setProblem({ field: authCopy.incompleteCode })
    setProblem({})
    verify.mutate(
      { phone, code },
      {
        onSuccess: ({ user }) => {
          if (!user.onboarded) {
            void navigate(onboardingPath(next), { replace: true, state: { confirmed: true } })
            return
          }
          toast.success(`${authCopy.phoneConfirmed}. Welcome back.`)
          void navigate(next, { replace: true })
        },
        onError: (error) => {
          if (!isApiError(error)) return setProblem({ banner: networkProblem })
          if (error.code === 'OTP_INVALID') return setProblem({ field: authCopy.wrongCode })
          if (error.code === 'OTP_EXPIRED') {
            setResendAt(0)
            return setProblem({ field: authCopy.expiredCode })
          }
          if (error.code === 'RATE_LIMITED') {
            const wait = error.retryAfterSeconds ?? 600
            setResendAt(Date.now() + wait * 1000)
            return setProblem({
              banner: {
                title: 'Too many tries',
                body: `For your security, wait ${waitText(wait)}, then send a new code.`,
              },
            })
          }
          setProblem({ banner: networkProblem })
        },
      },
    )
  }

  function sendAgain() {
    setNotice(null)
    resend.mutate(phone, {
      onSuccess: ({ resendAfterSeconds }) => {
        setCode('')
        setProblem({})
        setResendAt(Date.now() + resendAfterSeconds * 1000)
        setNotice(authCopy.codeResent)
      },
      onError: (error) => {
        if (isApiError(error) && error.code === 'RATE_LIMITED') {
          setResendAt(Date.now() + (error.retryAfterSeconds ?? 60) * 1000)
          return setProblem({
            banner: {
              title: 'Please wait before asking for another code',
              body: `Try again in ${waitText(error.retryAfterSeconds)}.`,
            },
          })
        }
        setProblem({ banner: { title: "We couldn't send a new code", body: 'Check your connection and try again.' } })
      },
    })
  }

  return (
    <>
      <Seo title="Confirm your phone" noindex />
      <h1 className="text-h2 text-ink tablet:text-h1">Enter the code</h1>
      <p className="mt-2 text-body text-muted">
        We sent a 6-digit code by text message to{' '}
        <span className="tabular font-semibold whitespace-nowrap text-ink">{formatPhoneDisplay(phone)}</span>
      </p>
      <Link
        to={loginPath(next)}
        state={{ phone }}
        replace
        className="mt-1 inline-flex min-h-11 items-center text-compact font-semibold text-action underline-offset-4 hover:underline"
      >
        Change number
      </Link>

      <form noValidate onSubmit={submit} className="mt-4 flex flex-col gap-5">
        {problem.banner && (
          <Banner tone="warning" title={problem.banner.title}>
            {problem.banner.body}
          </Banner>
        )}
        <CodeField value={code} onChange={setCode} error={problem.field} />
        <Button type="submit" fullWidth isPending={verify.isPending}>
          Confirm phone
        </Button>
      </form>

      <div className="mt-5 flex flex-col items-start gap-1">
        <Button
          variant="tertiary"
          isDisabled={secondsLeft > 0}
          isPending={resend.isPending}
          onPress={sendAgain}
          className="tabular -ml-3"
        >
          {secondsLeft > 0 ? `Send a new code in ${formatCountdown(secondsLeft)}` : 'Send a new code'}
        </Button>
        <p role="status" className="text-compact text-success empty:hidden">
          {notice}
        </p>
        <p className="text-compact text-muted">
          Codes can take a minute to arrive. Still nothing? Check the number above, or{' '}
          <Link to="/support" className="font-semibold text-action underline-offset-4 hover:underline">
            get help
          </Link>
          .
        </p>
        {(import.meta.env.DEV || useMockApi) && (
          <p className="mt-3 rounded-control border border-dashed border-border px-3 py-2 text-caption text-muted">
            Sample data: the code is <span className="tabular font-semibold text-ink">{SAMPLE_CODE}</span>
          </p>
        )}
      </div>
    </>
  )
}

const networkProblem = { title: "We couldn't check the code", body: 'Check your connection and try again.' }

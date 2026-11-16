import { Button } from '@heroui/react'
import { Link } from 'react-router'
import { formatCountdown } from '@/features/account/use-countdown'
import { useMockApi } from '@/lib/env'
import { SAMPLE_CODE } from '@/mocks/sample-code'

type ResendCodeProps = {
  secondsLeft: number
  isPending: boolean
  onSend: () => void
  /** "We sent a new code." after a resend, announced politely. */
  notice: string | null
}

/** Under an emailed-code form: send another code once the wait is over, and where to look if none arrives. */
export function ResendCode({ secondsLeft, isPending, onSend, notice }: ResendCodeProps) {
  return (
    <div className="mt-5 flex flex-col items-start gap-1">
      <Button
        variant="tertiary"
        isDisabled={secondsLeft > 0}
        isPending={isPending}
        onPress={onSend}
        className="tabular -ml-3"
      >
        {secondsLeft > 0 ? `Send a new code in ${formatCountdown(secondsLeft)}` : 'Send a new code'}
      </Button>
      <p role="status" className="text-compact text-success empty:hidden">
        {notice}
      </p>
      <p className="text-compact text-muted">
        Codes can take a minute to arrive. Check your spam or promotions folder too. Still nothing?{' '}
        <Link to="/support" className="font-semibold text-action underline-offset-4 hover:underline">
          Get help
        </Link>
        .
      </p>
      {(import.meta.env.DEV || useMockApi) && (
        <p className="mt-3 rounded-control border border-dashed border-border px-3 py-2 text-caption text-muted">
          Sample data: the code is <span className="tabular font-semibold text-ink">{SAMPLE_CODE}</span>
        </p>
      )}
    </div>
  )
}

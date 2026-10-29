import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@heroui/react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Seo } from '@/components/seo/Seo'
import { Banner } from '@/components/ui/Banner'
import { ButtonLink } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TextAreaField } from '@/components/ui/TextAreaField'
import { useMe } from '@/features/account/api'
import { useSendAppeal } from '@/features/trust/api'
import { reportStatuses } from '@/features/trust/copy'
import { errorMessage, fieldError } from '@/lib/api/error-message'
import { formatWAT } from '@/lib/time/time'
import type { Appeal } from '@/types/api'

const MESSAGE_MAX = 2000

const appealSchema = z.object({
  message: z
    .string()
    .trim()
    .min(20, 'Tell us a little more, in a sentence or two.')
    .max(MESSAGE_MAX, `Keep it under ${MESSAGE_MAX} characters.`),
})

type AppealForm = z.infer<typeof appealSchema>

/** Ruling R7-5: `/appeal`. A restricted member asks for a review once, then sees where it stands. */
export function AppealPage() {
  const { data: me } = useMe()
  const open = me?.appeal && me.appeal.status !== 'DECIDED' ? me.appeal : null

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <Seo title="Ask for a review" noindex />
      <div className="flex flex-col gap-1">
        <h1 className="text-h2 text-ink tablet:text-h1">Ask for a review</h1>
        <p className="text-body text-muted">
          If you think your account was restricted by mistake, a person from the safety team will look at it again.
        </p>
      </div>
      {!me ? (
        <div aria-busy="true" aria-label="Loading" className="h-48 animate-pulse rounded-card bg-cloud" />
      ) : open ? (
        <AppealStatus appeal={open} />
      ) : me.restricted ? (
        <AppealForm reason={me.restriction?.reason} />
      ) : (
        <div className="flex flex-col items-start gap-4">
          <p className="text-body text-ink">Your account isn’t restricted, so there’s nothing to review.</p>
          <ButtonLink to="/me" variant="secondary">
            Back to your profile
          </ButtonLink>
        </div>
      )}
    </div>
  )
}

function AppealStatus({ appeal }: { appeal: Appeal }) {
  const status = reportStatuses[appeal.status === 'IN_REVIEW' ? 'IN_REVIEW' : 'RECEIVED']
  return (
    <div className="flex flex-col gap-4">
      <div role="status" className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
        <p className="text-body font-semibold text-ink">
          We received your request. Your case reference is {appeal.caseRef}.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={status.tone} icon={status.icon}>
            {status.label}
          </StatusBadge>
          <span className="text-caption text-muted">Sent {formatWAT(appeal.createdAt, { withTime: false })}</span>
        </div>
      </div>
      <p className="text-compact text-muted">
        Check back here for its status. Until there’s a decision, your offers, deals and messages stay available, and
        you can still report problems.
      </p>
      <ButtonLink to="/me" variant="secondary" className="self-start">
        Back to your profile
      </ButtonLink>
    </div>
  )
}

function AppealForm({ reason }: { reason?: string }) {
  const send = useSendAppeal()
  const { control, handleSubmit, setError, formState } = useForm<AppealForm>({
    resolver: zodResolver(appealSchema),
    defaultValues: { message: '' },
  })

  const submit = handleSubmit(async ({ message }) => {
    try {
      await send.mutateAsync(message)
    } catch (error) {
      const field = fieldError(error, 'message')
      if (field) setError('message', { message: field })
      else setError('root', { message: errorMessage(error, 'Your request wasn’t sent.') })
    }
  })

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <Banner tone="warning" title="Why your account is restricted">
        {reason ?? 'Our team is reviewing recent activity on your account.'}
      </Banner>
      <Controller
        control={control}
        name="message"
        render={({ field, fieldState }) => (
          <TextAreaField
            label="What should we know?"
            hint="Explain what happened in your own words. Facts like dates and listing names help."
            rows={5}
            maxLength={MESSAGE_MAX}
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      {formState.errors.root && <Banner tone="danger" title={formState.errors.root.message ?? ''} />}
      <Button type="submit" isPending={formState.isSubmitting} className="self-start px-8">
        Ask for a review
      </Button>
    </form>
  )
}

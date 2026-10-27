import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@heroui/react'
import { Phone } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Banner } from '@/components/ui/Banner'
import { Checkbox } from '@/components/ui/Checkbox'
import { RadioCards } from '@/components/ui/RadioCards'
import { TextAreaField } from '@/components/ui/TextAreaField'
import { PhotoUploader } from '@/features/selling/components/PhotoUploader'
import { useSendReport } from '@/features/trust/api'
import { blockEffect, reportReasons } from '@/features/trust/copy'
import {
  DESCRIPTION_MAX,
  emptyReport,
  EVIDENCE_MAX,
  reportSchema,
  type ReportForm as ReportValues,
  type ReportInput,
} from '@/features/trust/report-schema'
import { PolicyLinks } from '@/features/trust/components/PolicyLinks'
import { errorMessage, fieldErrorsOf } from '@/lib/api/error-message'
import { copy } from '@/lib/copy/copy'
import type { ReportReceipt, ReportTarget } from '@/types/api'

const fields = ['reason', 'description', 'evidence'] as const

const evidenceHint = 'Optional. Screenshots or photos that show the problem help the safety team.'

/**
 * FE-TRU-01: why, in the person's own words, with optional photos. Danger guidance comes first, and what
 * support can and can't do is stated before sending (ruling R7-2).
 */
export function ReportForm({
  target,
  canBlock,
  onDone,
}: {
  target: ReportTarget
  /** The author can be blocked in the same step: someone else, not already blocked. */
  canBlock: boolean
  onDone: (receipt: ReportReceipt, blocked: boolean) => void
}) {
  const send = useSendReport()
  const [uploading, setUploading] = useState(false)
  const { control, handleSubmit, setError, formState } = useForm<ReportInput, unknown, ReportValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: emptyReport,
  })
  const { errors } = formState

  const submit = handleSubmit(async ({ reason, description, evidence, alsoBlock }) => {
    try {
      const receipt = await send.mutateAsync({
        targetType: target.type,
        targetId: target.id,
        reason,
        description,
        evidenceIds: evidence.map((p) => p.id),
        alsoBlock: canBlock && alsoBlock,
      })
      onDone(receipt, canBlock && alsoBlock)
    } catch (error) {
      const server = fieldErrorsOf(error)
      if (!server) return setError('root', { message: errorMessage(error, 'Your report wasn’t sent.') })
      for (const [name, message] of Object.entries(server)) {
        const field = fields.find((f) => f === name || (f === 'evidence' && name === 'evidenceIds'))
        setError(field ?? 'root', { message })
      }
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
      <Banner tone="warning" title="If you’re in danger now, contact local emergency services first.">
        Then tell us what happened here.
      </Banner>
      <Controller
        control={control}
        name="reason"
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-1">
            <RadioCards label="What’s wrong?" options={reportReasons} value={field.value} onChange={field.onChange} />
            {fieldState.error && <p className="text-compact text-danger">{fieldState.error.message}</p>}
          </div>
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field, fieldState }) => (
          <TextAreaField
            label="What happened?"
            hint="Optional, unless you chose Something else. Dates, times and what was said help the safety team. Stick to the facts."
            rows={4}
            maxLength={DESCRIPTION_MAX}
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
        name="evidence"
        render={({ field, fieldState }) => (
          <PhotoUploader
            value={field.value}
            onChange={field.onChange}
            limits={{ min: 0, max: EVIDENCE_MAX }}
            itemName="evidence"
            error={fieldState.error?.message}
            onBusyChange={setUploading}
            hint={evidenceHint}
          />
        )}
      />
      {canBlock && target.author && (
        <Controller
          control={control}
          name="alsoBlock"
          render={({ field }) => (
            <Checkbox checked={field.value} onChange={field.onChange}>
              <span className="flex flex-col gap-0.5">
                <span className="text-body text-ink">Also block {target.author!.displayName}</span>
                <span className="text-compact text-muted">{blockEffect(target.author!.displayName)}</span>
              </span>
            </Checkbox>
          )}
        />
      )}
      <div className="flex flex-col gap-2 rounded-control border border-border bg-surface px-4 py-3">
        <p className="text-compact text-ink">{copy.supportLimit}</p>
        <p className="flex items-start gap-2 text-compact text-muted">
          <Phone aria-hidden className="mt-0.5 size-4 shrink-0" />
          We don’t tell anyone who reported them. Support may contact you through the app, and never asks for your PIN
          or a one-time code.
        </p>
      </div>
      <PolicyLinks />
      {errors.root && <Banner tone="danger" title={errors.root.message ?? ''} />}
      <Button type="submit" isPending={formState.isSubmitting} isDisabled={uploading} className="self-start px-8">
        Send report
      </Button>
    </form>
  )
}

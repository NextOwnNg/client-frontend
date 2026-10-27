import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@heroui/react'
import { Phone } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Banner } from '@/components/ui/Banner'
import { RadioCards } from '@/components/ui/RadioCards'
import { Sheet } from '@/components/ui/Sheet'
import { TextAreaField } from '@/components/ui/TextAreaField'
import { useRuntimeConfig } from '@/features/config/api'
import { PhotoUploader } from '@/features/selling/components/PhotoUploader'
import type { FieldErrors } from '@/features/selling/listing-input'
import { footer, wide } from '@/features/transactions/components/sheet-styles'
import { copy, disputeRecorded } from '@/lib/copy/copy'
import type { DisputeCategory, MediaRef } from '@/types/api'

const concerns: { value: DisputeCategory; title: string }[] = [
  { value: 'CONDITION', title: 'The item isn’t as described' },
  { value: 'NO_SHOW', title: 'They didn’t show up' },
  { value: 'PAYMENT', title: 'We disagree about the payment' },
  { value: 'UNSAFE', title: 'I felt unsafe or was threatened' },
  { value: 'OTHER', title: 'Something else' },
]

/** The same rules as the server: what went wrong, and a sentence or two about it. */
const problemSchema = z.object({
  category: z
    .enum(['CONDITION', 'NO_SHOW', 'PAYMENT', 'UNSAFE', 'OTHER'])
    .nullable()
    .transform((category, ctx) => {
      if (category) return category
      ctx.addIssue({ code: 'custom', message: 'Choose what went wrong.' })
      return z.NEVER
    }),
  description: z.string().trim().min(10, 'Describe what happened in a sentence or two.').max(2000),
  evidence: z.array(z.custom<MediaRef>()),
})

type ProblemInput = z.input<typeof problemSchema>
type ProblemForm = z.output<typeof problemSchema>

/**
 * Report a problem (FE-TRX-08, UX-23): what went wrong, in the person's own words, with optional photos and
 * what support can and can't do. The case reference appears as soon as it's recorded.
 */
export function ReportSheet({
  open,
  pending,
  caseRef,
  serverErrors,
  failure,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  pending: boolean
  /** Set once the report is recorded: the sheet then shows the confirmation. */
  caseRef: string | null
  serverErrors: FieldErrors
  failure: string | null
  onOpenChange: (open: boolean) => void
  onSubmit: (report: { category: DisputeCategory; description: string; evidence: MediaRef[] }) => void
}) {
  const { data: config } = useRuntimeConfig()
  const [uploading, setUploading] = useState(false)
  const { control, handleSubmit } = useForm<ProblemInput, unknown, ProblemForm>({
    resolver: zodResolver(problemSchema),
    defaultValues: { category: null, description: '', evidence: [] },
  })
  const submit = handleSubmit((report) => onSubmit(report))

  if (caseRef) {
    return (
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        title="Report a problem"
        footer={
          <Button onPress={() => onOpenChange(false)} className="w-full tablet:w-auto">
            Done
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-body font-semibold text-ink">{disputeRecorded(caseRef)}</p>
          <p className="text-compact text-muted">{copy.supportLimit}</p>
          <p className="text-compact text-muted">
            While support looks into it, confirming and reviews are paused for both of you.
          </p>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !pending && onOpenChange(next)}
      title="Report a problem"
      footer={
        <div className={footer}>
          <Button variant="tertiary" isDisabled={pending} onPress={() => onOpenChange(false)} className={wide}>
            Cancel
          </Button>
          <Button isPending={pending} isDisabled={uploading} onPress={() => void submit()} className={wide}>
            Send report
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Banner tone="warning" title="If you’re in danger now, contact local emergency services first.">
          Then come back and tell us what happened.
        </Banner>
        <Controller
          control={control}
          name="category"
          render={({ field, fieldState }) => {
            const problem = fieldState.error?.message ?? serverErrors.category
            return (
              <div className="flex flex-col gap-1">
                <RadioCards<DisputeCategory>
                  label="What went wrong?"
                  options={concerns}
                  value={field.value}
                  onChange={field.onChange}
                />
                {problem && <p className="text-compact text-danger">{problem}</p>}
              </div>
            )
          }}
        />
        <Controller
          control={control}
          name="description"
          render={({ field, fieldState }) => (
            <TextAreaField
              label="What happened?"
              hint="Dates, times and what was said help support understand. Stick to the facts."
              rows={4}
              maxLength={2000}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message ?? serverErrors.description}
            />
          )}
        />
        {config && (
          <Controller
            control={control}
            name="evidence"
            render={({ field }) => (
              <PhotoUploader
                value={field.value}
                onChange={field.onChange}
                limits={{ min: 0, max: 4 }}
                itemName="evidence"
                onBusyChange={setUploading}
                hint="Optional. Photos of the item or screenshots that show the problem help support."
              />
            )}
          />
        )}
        <p className="flex items-start gap-2 text-compact text-muted">
          <Phone aria-hidden className="mt-0.5 size-4 shrink-0" />
          Support may contact you through the app. We never ask for your PIN or a one-time code.
        </p>
        {failure && <Banner tone="danger" title={failure} />}
      </div>
    </Sheet>
  )
}

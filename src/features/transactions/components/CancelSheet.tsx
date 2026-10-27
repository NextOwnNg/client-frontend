import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@heroui/react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { RadioCards } from '@/components/ui/RadioCards'
import { Sheet } from '@/components/ui/Sheet'
import { TextAreaField } from '@/components/ui/TextAreaField'
import type { FieldErrors } from '@/features/selling/listing-input'
import { footer, wide } from '@/features/transactions/components/sheet-styles'
import { cancelReasons } from '@/features/transactions/transaction-view'
import type { CancelReason } from '@/types/api'

const NOTE_MAX = 300

const cancelSchema = z.object({
  // Nothing is chosen at first; the transform turns "nothing" into the message and narrows the type
  reason: z
    .enum(['CHANGED_MIND', 'CANT_MEET', 'ITEM_PROBLEM', 'OTHER'])
    .nullable()
    .transform((reason, ctx) => {
      if (reason) return reason
      ctx.addIssue({ code: 'custom', message: 'Choose a reason.' })
      return z.NEVER
    }),
  note: z.string().max(NOTE_MAX),
})

type CancelInput = z.input<typeof cancelSchema>
type CancelForm = z.output<typeof cancelSchema>

/** Ask to cancel (FE-TRX-08, ruling R5-3): the other person has to agree, and the deal stays on until then. */
export function CancelSheet({
  otherName,
  open,
  pending,
  errors,
  onOpenChange,
  onSubmit,
}: {
  otherName: string
  open: boolean
  pending: boolean
  /** Field errors the server sent back for the last attempt. */
  errors: FieldErrors
  onOpenChange: (open: boolean) => void
  onSubmit: (reason: CancelReason, note: string) => void
}) {
  const { control, handleSubmit } = useForm<CancelInput, unknown, CancelForm>({
    resolver: zodResolver(cancelSchema),
    defaultValues: { reason: null, note: '' },
  })
  const submit = handleSubmit(({ reason, note }) => onSubmit(reason, note))

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !pending && onOpenChange(next)}
      title="Ask to cancel?"
      footer={
        <div className={footer}>
          <Button variant="tertiary" isDisabled={pending} onPress={() => onOpenChange(false)} className={wide}>
            Keep the deal
          </Button>
          <Button isPending={pending} onPress={() => void submit()} className={wide}>
            Send request
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink">
          {otherName} has to agree. Until then the deal stays on and both items stay reserved.
        </p>
        <Controller
          control={control}
          name="reason"
          render={({ field, fieldState }) => {
            const problem = fieldState.error?.message ?? errors.reason
            return (
              <div className="flex flex-col gap-1">
                <RadioCards<CancelReason>
                  label="Why do you want to cancel?"
                  options={cancelReasons}
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
          name="note"
          render={({ field }) => (
            <TextAreaField
              label="Anything to add? (optional)"
              rows={2}
              maxLength={NOTE_MAX}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.note}
            />
          )}
        />
      </div>
    </Sheet>
  )
}

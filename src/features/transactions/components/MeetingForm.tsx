import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@heroui/react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { TextAreaField } from '@/components/ui/TextAreaField'
import { TextField } from '@/components/ui/TextField'
import type { FieldErrors } from '@/features/selling/listing-input'
import type { Meeting } from '@/types/api'

/** `2026-10-30T15:00` in West Africa Time, for a datetime-local field (WAT is UTC+1 all year). */
function toLocalInput(iso: string) {
  return new Date(Date.parse(iso) + 3_600_000).toISOString().slice(0, 16)
}
const fromLocalInput = (value: string) => new Date(`${value}:00+01:00`).toISOString()

const meetingSchema = z.object({
  place: z.string().trim().min(1, 'Say where you’ll meet.').max(120),
  time: z.string().min(1, 'Choose a date and time.'),
  note: z.string().trim().max(300),
})

type MeetingFields = z.infer<typeof meetingSchema>

/** Suggest where and when (ruling R5-2). The place and time start from the current suggestion, if any. */
export function MeetingForm({
  meeting,
  pending,
  errors,
  onPropose,
  onCancel,
}: {
  meeting: Meeting | null
  pending: boolean
  /** Field errors the server sent back for the last suggestion. */
  errors: FieldErrors
  onPropose: (meeting: { place: string; time: string; note: string }) => Promise<boolean>
  onCancel: () => void
}) {
  const { control, handleSubmit } = useForm<MeetingFields>({
    resolver: zodResolver(meetingSchema),
    defaultValues: { place: meeting?.place ?? '', time: meeting ? toLocalInput(meeting.time) : '', note: '' },
  })

  const submit = handleSubmit(async ({ place, time, note }) => {
    if (await onPropose({ place, time: fromLocalInput(time), note })) onCancel()
  })

  return (
    <>
      <div className="flex flex-col gap-4">
        <Controller
          control={control}
          name="place"
          render={({ field, fieldState }) => (
            <TextField
              label="Place"
              hint="A public spot you both know, e.g. a mall entrance or bank hall."
              maxLength={120}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message ?? errors.place}
            />
          )}
        />
        <Controller
          control={control}
          name="time"
          render={({ field, fieldState }) => (
            <TextField
              label="Date and time"
              hint="West Africa Time."
              type="datetime-local"
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message ?? errors.time}
            />
          )}
        />
        <Controller
          control={control}
          name="note"
          render={({ field }) => (
            <TextAreaField
              label="Note (optional)"
              rows={2}
              maxLength={300}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button isPending={pending} onPress={() => void submit()}>
          Send suggestion
        </Button>
        <Button variant="tertiary" isDisabled={pending} onPress={onCancel}>
          Cancel
        </Button>
      </div>
    </>
  )
}

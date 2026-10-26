import { Button } from '@heroui/react'
import { CalendarClock, Lock, MapPin, MessageCircle } from 'lucide-react'
import { useId, useState } from 'react'
import { Link } from 'react-router'
import { TextAreaField } from '@/components/ui/TextAreaField'
import { TextField } from '@/components/ui/TextField'
import type { FieldErrors } from '@/features/selling/listing-input'
import { formatWAT } from '@/lib/time/time'
import type { Meeting } from '@/types/api'

/** `2026-10-30T15:00` in West Africa Time, for a datetime-local field (WAT is UTC+1 all year). */
function toLocalInput(iso: string) {
  return new Date(Date.parse(iso) + 3_600_000).toISOString().slice(0, 16)
}
const fromLocalInput = (value: string) => (value ? new Date(`${value}:00+01:00`).toISOString() : '')

/**
 * Where and when to meet (FE-TRX-03, ruling R5-2). Private to the two people, never printed or shared.
 * Either person suggests; the other agrees or suggests a change, which needs agreeing again.
 */
export function MeetingSection({
  meeting,
  viewerId,
  otherName,
  open,
  pending,
  errors,
  transactionId,
  onPropose,
  onAgree,
}: {
  meeting: Meeting | null
  viewerId: string
  otherName: string
  open: boolean
  pending: boolean
  errors: FieldErrors
  transactionId: string
  onPropose: (meeting: { place: string; time: string; note: string }) => Promise<boolean>
  onAgree: () => void
}) {
  const headingId = useId()
  const [editing, setEditing] = useState(false)
  const [place, setPlace] = useState(meeting?.place ?? '')
  const [time, setTime] = useState(meeting ? toLocalInput(meeting.time) : '')
  const [note, setNote] = useState('')
  const [local, setLocal] = useState<FieldErrors>({})
  const agreedByBoth = Boolean(meeting && meeting.agreedBy.length >= 2)
  const shown = { ...errors, ...local }

  async function submit() {
    const problems: FieldErrors = {}
    if (!place.trim()) problems.place = 'Say where you’ll meet.'
    if (!time) problems.time = 'Choose a date and time.'
    setLocal(problems)
    if (Object.keys(problems).length) return
    if (await onPropose({ place: place.trim(), time: fromLocalInput(time), note: note.trim() })) setEditing(false)
  }

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 print:hidden"
    >
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="text-h3 text-ink">
          Meeting
        </h2>
        <p className="flex items-center gap-1.5 text-caption text-muted">
          <Lock aria-hidden className="size-3.5" />
          Only the two of you can see this.
        </p>
      </div>

      {meeting && !editing && (
        <div className="flex flex-col gap-2">
          <p className="flex items-start gap-2 text-body text-ink">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
            <span>{meeting.place}</span>
          </p>
          <p className="tabular flex items-start gap-2 text-body text-ink">
            <CalendarClock aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
            {formatWAT(meeting.time)}
          </p>
          {meeting.note && <p className="text-compact text-muted">“{meeting.note}”</p>}
          <p className="text-compact font-semibold text-ink">
            {agreedByBoth
              ? 'Agreed by both of you'
              : meeting.proposedBy === viewerId
                ? `Waiting for ${otherName} to agree.`
                : `${otherName} suggested this.`}
          </p>
        </div>
      )}
      {!meeting && !editing && (
        <p className="text-body text-ink">
          Agree where and when to meet. Choose a busy public place, in daylight if you can.
        </p>
      )}

      {editing && (
        <div className="flex flex-col gap-4">
          <TextField
            label="Place"
            hint="A public spot you both know, e.g. a mall entrance or bank hall."
            value={place}
            maxLength={120}
            onChange={(e) => setPlace(e.target.value)}
            error={shown.place}
          />
          <TextField
            label="Date and time"
            hint="West Africa Time."
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            error={shown.time}
          />
          <TextAreaField
            label="Note (optional)"
            rows={2}
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      )}

      {open && (
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <Button isPending={pending} onPress={() => void submit()}>
                Send suggestion
              </Button>
              <Button variant="tertiary" isDisabled={pending} onPress={() => setEditing(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              {meeting && !agreedByBoth && meeting.proposedBy !== viewerId && (
                <Button isPending={pending} onPress={onAgree}>
                  Agree to this
                </Button>
              )}
              <Button
                variant={meeting ? 'tertiary' : 'secondary'}
                isDisabled={pending}
                onPress={() => setEditing(true)}
              >
                {meeting
                  ? meeting.proposedBy === viewerId && !agreedByBoth
                    ? 'Change'
                    : 'Suggest a change'
                  : 'Suggest a time and place'}
              </Button>
            </>
          )}
        </div>
      )}

      <Link
        to={`/messages?transaction=${transactionId}`}
        className="inline-flex min-h-11 items-center gap-1.5 self-start text-compact font-semibold text-action underline-offset-4 hover:underline"
      >
        <MessageCircle aria-hidden className="size-4" />
        Message {otherName}
      </Link>
    </section>
  )
}

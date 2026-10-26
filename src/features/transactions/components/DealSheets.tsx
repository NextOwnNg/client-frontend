import { Button } from '@heroui/react'
import { Phone } from 'lucide-react'
import { useState } from 'react'
import { Banner } from '@/components/ui/Banner'
import { Checkbox } from '@/components/ui/Checkbox'
import { RadioCards } from '@/components/ui/RadioCards'
import { Sheet } from '@/components/ui/Sheet'
import { TextAreaField } from '@/components/ui/TextAreaField'
import { useRuntimeConfig } from '@/features/config/api'
import { PhotoUploader } from '@/features/selling/components/PhotoUploader'
import type { FieldErrors } from '@/features/selling/listing-input'
import { cancelReasons, requiredChecks, sidesOf } from '@/features/transactions/transaction-view'
import { copy, disputeRecorded } from '@/lib/copy/copy'
import { formatNaira } from '@/lib/money/money'
import type { CancelReason, ConfirmCheck, DisputeCategory, MediaRef, Transaction } from '@/types/api'

const footer = 'flex w-full flex-col-reverse gap-2 tablet:flex-row tablet:justify-end'
const wide = 'w-full tablet:w-auto'

/**
 * Confirm my side (FE-TRX-05, UX-22): one box per statement that applies, each ticked on purpose. It's a
 * self-report, said plainly, and nothing here suggests the payment was checked.
 */
export function ConfirmSheet({
  tx,
  open,
  pending,
  onOpenChange,
  onConfirm,
}: {
  tx: Transaction
  open: boolean
  pending: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (checks: ConfirmCheck[]) => void
}) {
  const [ticked, setTicked] = useState<ConfirmCheck[]>([])
  const needed = requiredChecks(tx.agreement, tx.viewerRole)
  const sides = sidesOf(tx.agreement, tx.viewerRole)
  const other = tx.viewerRole === 'offerer' ? tx.owner : tx.offerer
  const amount = formatNaira(sides.cashKobo)
  const labels: Record<ConfirmCheck, string> = {
    received: `I inspected and received ${sides.theirs?.title ?? 'the item'}`,
    gave: `I handed over ${sides.mine?.title ?? 'my item'}`,
    cash: sides.iPayCash
      ? `I paid ${amount} to ${other.displayName}`
      : `I received ${amount} from ${other.displayName}`,
  }
  const ready = needed.every((c) => ticked.includes(c))
  const toggle = (check: ConfirmCheck, on: boolean) =>
    setTicked((list) => (on ? [...list, check] : list.filter((c) => c !== check)))

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !pending && onOpenChange(next)}
      title="Confirm your side"
      footer={
        <div className={footer}>
          <Button variant="tertiary" isDisabled={pending} onPress={() => onOpenChange(false)} className={wide}>
            Not yet
          </Button>
          <Button isDisabled={!ready} isPending={pending} onPress={() => onConfirm(needed)} className={wide}>
            Confirm my side of exchange
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-body text-ink">Tick each one that’s true. {other.displayName} confirms separately.</p>
        <div className="flex flex-col">
          {needed.map((check) => (
            <Checkbox key={check} checked={ticked.includes(check)} onChange={(on) => toggle(check, on)}>
              {labels[check]}
            </Checkbox>
          ))}
        </div>
        {needed.includes('cash') && (
          <p className="text-compact text-muted">Tick the cash only if you saw it change hands yourself.</p>
        )}
        <p className="rounded-control border border-border p-3 text-compact text-ink">
          This is your own statement. NextOwn doesn’t see or check the exchange or the payment.
        </p>
      </div>
    </Sheet>
  )
}

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
  errors: FieldErrors
  onOpenChange: (open: boolean) => void
  onSubmit: (reason: CancelReason, note: string) => void
}) {
  const [reason, setReason] = useState<CancelReason | null>(null)
  const [note, setNote] = useState('')
  const [shown, setShown] = useState(false)
  const reasonError = (shown && !reason ? 'Choose a reason.' : undefined) ?? errors.reason

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
          <Button
            isPending={pending}
            onPress={() => (reason ? onSubmit(reason, note) : setShown(true))}
            className={wide}
          >
            Send request
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink">
          {otherName} has to agree. Until then the deal stays on and both items stay reserved.
        </p>
        <div className="flex flex-col gap-1">
          <RadioCards<CancelReason>
            label="Why do you want to cancel?"
            options={cancelReasons}
            value={reason}
            onChange={setReason}
          />
          {reasonError && <p className="text-compact text-danger">{reasonError}</p>}
        </div>
        <TextAreaField
          label="Anything to add? (optional)"
          rows={2}
          maxLength={300}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </Sheet>
  )
}

const concerns: { value: DisputeCategory; title: string }[] = [
  { value: 'CONDITION', title: 'The item isn’t as described' },
  { value: 'NO_SHOW', title: 'They didn’t show up' },
  { value: 'PAYMENT', title: 'We disagree about the payment' },
  { value: 'UNSAFE', title: 'I felt unsafe or was threatened' },
  { value: 'OTHER', title: 'Something else' },
]

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
  const [category, setCategory] = useState<DisputeCategory | null>(null)
  const [description, setDescription] = useState('')
  const [evidence, setEvidence] = useState<MediaRef[]>([])
  const [uploading, setUploading] = useState(false)
  const [shown, setShown] = useState(false)
  const errors: FieldErrors = { ...serverErrors }
  if (shown && !category) errors.category = 'Choose what went wrong.'
  if (shown && description.trim().length < 10) errors.description = 'Describe what happened in a sentence or two.'

  function submit() {
    setShown(true)
    if (!category || description.trim().length < 10) return
    onSubmit({ category, description: description.trim(), evidence })
  }

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
          <Button isPending={pending} isDisabled={uploading} onPress={submit} className={wide}>
            Send report
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Banner tone="warning" title="If you’re in danger now, contact local emergency services first.">
          Then come back and tell us what happened.
        </Banner>
        <div className="flex flex-col gap-1">
          <RadioCards<DisputeCategory>
            label="What went wrong?"
            options={concerns}
            value={category}
            onChange={setCategory}
          />
          {errors.category && <p className="text-compact text-danger">{errors.category}</p>}
        </div>
        <TextAreaField
          label="What happened?"
          hint="Dates, times and what was said help support understand. Stick to the facts."
          rows={4}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={errors.description}
        />
        {config && (
          <PhotoUploader
            value={evidence}
            onChange={setEvidence}
            limits={{ min: 0, max: 4 }}
            itemName="evidence"
            onBusyChange={setUploading}
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

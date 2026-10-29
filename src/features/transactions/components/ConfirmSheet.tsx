import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@heroui/react'
import { useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Checkbox } from '@/components/ui/Checkbox'
import { Sheet } from '@/components/ui/Sheet'
import { requiredChecks, sidesOf } from '@/features/transactions/transaction-view'
import { footer, wide } from '@/features/transactions/components/sheet-styles'
import { formatNaira } from '@/lib/money/money'
import type { ConfirmCheck, Transaction } from '@/types/api'

/** Every statement that applies must be ticked on purpose; the button stays off until they are. */
const confirmSchema = (needed: ConfirmCheck[]) =>
  z.object({
    ticked: z
      .array(z.enum(['received', 'gave', 'cash']))
      .refine((ticked) => needed.every((c) => ticked.includes(c)), 'Tick each statement that’s true.'),
  })

type ConfirmForm = z.infer<ReturnType<typeof confirmSchema>>

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
  const needed = useMemo(() => requiredChecks(tx.agreement, tx.viewerRole), [tx.agreement, tx.viewerRole])
  const schema = useMemo(() => confirmSchema(needed), [needed])
  const { control, handleSubmit, watch } = useForm<ConfirmForm>({
    resolver: zodResolver(schema),
    defaultValues: { ticked: [] },
  })
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
  const ticked = watch('ticked')
  const ready = needed.every((c) => ticked.includes(c))
  const submit = handleSubmit(() => onConfirm(needed))

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
          <Button isDisabled={!ready} isPending={pending} onPress={() => void submit()} className={wide}>
            Confirm my side of exchange
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-body text-ink">Tick each one that’s true. {other.displayName} confirms separately.</p>
        <Controller
          control={control}
          name="ticked"
          render={({ field }) => (
            <div className="flex flex-col">
              {needed.map((check) => (
                <Checkbox
                  key={check}
                  checked={field.value.includes(check)}
                  onChange={(on) =>
                    field.onChange(on ? [...field.value, check] : field.value.filter((c) => c !== check))
                  }
                >
                  {labels[check]}
                </Checkbox>
              ))}
            </div>
          )}
        />
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

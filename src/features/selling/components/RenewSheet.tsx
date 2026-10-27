import { zodResolver } from '@hookform/resolvers/zod'
import { Button, toast } from '@heroui/react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { RadioCards } from '@/components/ui/RadioCards'
import { Sheet } from '@/components/ui/Sheet'
import { useListingAction } from '@/features/selling/api'
import { quickSellLabel } from '@/features/selling/listing-input'
import { errorMessage } from '@/lib/api/error-message'
import { copy } from '@/lib/copy/copy'
import type { OwnListing } from '@/types/api'

const NONE = 'none'

const renewSchema = z.object({ run: z.string() })

type RenewForm = z.infer<typeof renewSchema>

/** Expired listings come back with or without a fresh Quick Sell deadline (LST-04, QA-10). */
export function RenewSheet({
  listing,
  options,
  open,
  onOpenChange,
}: {
  listing: OwnListing
  options: number[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const renew = useListingAction()
  const { control, handleSubmit } = useForm<RenewForm>({
    resolver: zodResolver(renewSchema),
    defaultValues: { run: NONE },
  })

  const submit = handleSubmit(async ({ run }) => {
    try {
      await renew.mutateAsync({ id: listing.id, action: 'renew', quickSellHours: run === NONE ? null : Number(run) })
      toast.success('Listing renewed. It’s back on Explore.')
      onOpenChange(false)
    } catch {
      // Shown under the button from the mutation's error
    }
  })

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Renew listing"
      footer={
        <div className="flex w-full flex-col gap-2">
          {renew.isError && (
            <p role="alert" className="text-compact text-danger">
              {errorMessage(renew.error, 'We couldn’t renew it.')}
            </p>
          )}
          <Button fullWidth isPending={renew.isPending} onPress={() => void submit()}>
            Renew listing
          </Button>
        </div>
      }
    >
      <p className="mb-4 text-body text-ink">
        “{listing.title}” goes back on Explore and can take offers again. Check the price and details are still right.
      </p>
      <Controller
        control={control}
        name="run"
        render={({ field }) => (
          <RadioCards
            label="How should it run?"
            value={field.value}
            onChange={field.onChange}
            options={[
              { value: NONE, title: 'Without Quick Sell', description: 'Listed until you close it.' },
              ...options.map((hours) => ({
                value: String(hours),
                title: `Quick Sell for ${quickSellLabel(hours)}`,
                description: 'Your deadline shows on the listing.',
              })),
            ]}
          />
        )}
      />
      <p className="mt-3 text-compact text-muted">{copy.quickSellNote}</p>
    </Sheet>
  )
}

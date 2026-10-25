import { Button, toast } from '@heroui/react'
import { useState } from 'react'
import { RadioCards } from '@/components/ui/RadioCards'
import { Sheet } from '@/components/ui/Sheet'
import { useListingAction } from '@/features/selling/api'
import { quickSellLabel } from '@/features/selling/listing-input'
import { copy } from '@/lib/copy/copy'
import type { OwnListing } from '@/types/api'

const NONE = 'none'

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
  const [choice, setChoice] = useState<string>(NONE)
  const renew = useListingAction()

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Renew listing"
      footer={
        <div className="flex w-full flex-col gap-2">
          {renew.isError && (
            <p role="alert" className="text-compact text-danger">
              We couldn’t renew it. Check your connection and try again.
            </p>
          )}
          <Button
            fullWidth
            isPending={renew.isPending}
            onPress={() =>
              renew.mutate(
                { id: listing.id, action: 'renew', quickSellHours: choice === NONE ? null : Number(choice) },
                {
                  onSuccess: () => {
                    toast.success('Listing renewed. It’s back on Explore.')
                    onOpenChange(false)
                  },
                },
              )
            }
          >
            Renew listing
          </Button>
        </div>
      }
    >
      <p className="mb-4 text-body text-ink">
        “{listing.title}” goes back on Explore and can take offers again. Check the price and details are still right.
      </p>
      <RadioCards
        label="How should it run?"
        value={choice}
        onChange={setChoice}
        options={[
          { value: NONE, title: 'Without Quick Sell', description: 'Listed until you close it.' },
          ...options.map((hours) => ({
            value: String(hours),
            title: `Quick Sell for ${quickSellLabel(hours)}`,
            description: 'Your deadline shows on the listing.',
          })),
        ]}
      />
      <p className="mt-3 text-compact text-muted">{copy.quickSellNote}</p>
    </Sheet>
  )
}

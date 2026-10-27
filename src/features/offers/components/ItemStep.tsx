import { Plus } from 'lucide-react'
import { useState } from 'react'
import { PlainButton } from '@/components/ui/Button'
import { RadioCards } from '@/components/ui/RadioCards'
import { OfferItemForm } from '@/features/offers/components/OfferItemForm'
import { ItemThumb } from '@/features/offers/components/OfferParts'
import { conditionLabel } from '@/lib/copy/status'
import type { RuntimeConfig, SwapItem } from '@/types/api'
import { type StepProps, stepHeading } from '@/features/offers/components/composer-step'
import { FieldAnchor } from '@/components/ui/FieldAnchor'
import { FieldError } from '@/features/offers/components/FieldError'

export function ItemStep({
  draft,
  change,
  errors,
  items,
  itemsState,
  userId,
  config,
}: StepProps & {
  items: SwapItem[]
  itemsState: 'pending' | 'error' | 'ready'
  userId: string | null
  config: RuntimeConfig
}) {
  const [adding, setAdding] = useState(false)
  const none = itemsState === 'ready' && items.length === 0
  const formOpen = adding || none

  return (
    <div className="flex flex-col gap-4">
      <h2 className={stepHeading}>Which item are you offering?</h2>
      <p className="text-compact text-muted">You can offer one item. The other person sees its photos and details.</p>

      <FieldAnchor className="flex flex-col gap-1" name="offeredItemId">
        {itemsState === 'pending' ? (
          <div aria-busy="true" aria-label="Loading your items" className="flex flex-col gap-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-control bg-cloud" />
            ))}
          </div>
        ) : itemsState === 'error' ? (
          <p className="text-compact text-muted">
            We couldn’t load your items. You can still add one below, or go back and try again.
          </p>
        ) : none ? (
          <p className="text-body text-ink">
            You don’t have an item to offer yet. Add the one you’d like to swap: it stays private to this offer.
          </p>
        ) : (
          <RadioCards<string>
            label="Your items"
            hideLabel
            options={items.map((item) => ({
              value: item.id,
              title: item.title,
              description: (
                <>
                  <span>{item.source === 'listing' ? 'Listed' : 'Only visible in offers'}</span> ·{' '}
                  {conditionLabel(item.condition)} condition
                </>
              ),
              icon: <ItemThumb url={item.photos[0]?.url} size="sm" />,
              disabled: !item.available,
              disabledReason: item.unavailableReason,
            }))}
            value={draft.offeredItemId}
            onChange={(offeredItemId) => change({ offeredItemId })}
          />
        )}
        <FieldError message={errors.offeredItemId} />
      </FieldAnchor>

      {formOpen ? (
        <OfferItemForm
          userId={userId}
          config={config}
          onCreated={(item) => {
            change({ offeredItemId: item.id })
            setAdding(false)
          }}
          onCancel={none ? undefined : () => setAdding(false)}
        />
      ) : (
        <PlainButton variant="secondary" onClick={() => setAdding(true)} className="self-start">
          <Plus aria-hidden className="size-5" />
          Add an item
        </PlainButton>
      )}
    </div>
  )
}

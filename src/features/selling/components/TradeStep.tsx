import { ArrowLeftRight, Banknote, Repeat } from 'lucide-react'
import { useId } from 'react'
import { Label, Radio, RadioGroup } from 'react-aria-components'
import { Checkbox } from '@/components/ui/Checkbox'
import { CheckList } from '@/components/ui/ChoiceList'
import { chipBase, chipOff, chipOn } from '@/components/ui/control-styles'
import { MoneyField } from '@/components/ui/MoneyField'
import { RadioCards } from '@/components/ui/RadioCards'
import { TextAreaField } from '@/components/ui/TextAreaField'
import { quickSellLabel } from '@/features/selling/listing-input'
import { useNow } from '@/hooks/useNow'
import { copy } from '@/lib/copy/copy'
import { cx } from '@/lib/cx'
import { formatWAT } from '@/lib/time/time'
import type { TradeMode } from '@/types/api'
import type { StepProps } from '@/features/selling/components/wizard-step'
import { FieldAnchor } from '@/components/ui/FieldAnchor'

type ModeChoice = 'CASH' | 'SWAP' | 'BOTH'

const toChoice = (modes: TradeMode[]): ModeChoice | null =>
  modes.length === 2 ? 'BOTH' : modes[0] === 'CASH' ? 'CASH' : modes[0] === 'SWAP' ? 'SWAP' : null

const fromChoice = (choice: ModeChoice): TradeMode[] => (choice === 'BOTH' ? ['CASH', 'SWAP'] : [choice])

export function TradeStep({ input, change, errors, config, published }: StepProps & { published: boolean }) {
  const quickSellId = useId()
  const now = useNow()
  const cash = input.modes.includes('CASH')
  const swap = input.modes.includes('SWAP')
  const endsAt = input.quickSellHours ? new Date(now + input.quickSellHours * 3_600_000).toISOString() : null

  return (
    <div className="flex flex-col gap-8">
      <FieldAnchor name="modes">
        <RadioCards<ModeChoice>
          label="How do you want to trade?"
          options={[
            {
              value: 'CASH',
              title: 'Sell for cash',
              description: 'People offer money.',
              icon: <Banknote aria-hidden className="size-5" />,
            },
            {
              value: 'SWAP',
              title: 'Swap',
              description: 'People offer an item, and can add cash.',
              icon: <ArrowLeftRight aria-hidden className="size-5" />,
            },
            {
              value: 'BOTH',
              title: 'Sell or swap',
              description: 'Take whichever offer works best.',
              icon: <Repeat aria-hidden className="size-5" />,
            },
          ]}
          value={toChoice(input.modes)}
          onChange={(choice) => change({ modes: fromChoice(choice) })}
        />
        {errors.modes && <p className="mt-1 text-compact text-danger">{errors.modes}</p>}
      </FieldAnchor>

      {cash && (
        <FieldAnchor name="askingKobo">
          <MoneyField
            label="Asking price"
            hint="People can still offer a different amount."
            value={input.askingKobo}
            onChange={(askingKobo) => change({ askingKobo })}
            error={errors.askingKobo}
          />
        </FieldAnchor>
      )}

      {swap && (
        <FieldAnchor name="desiredSwap" className="flex flex-col gap-2">
          {!input.openToOffers && (
            <TextAreaField
              label="What would you like in a swap?"
              hint="Be specific, like “A laptop with 8GB RAM, or a PS5 plus cash from me”."
              rows={2}
              value={input.desiredSwap}
              onChange={(e) => change({ desiredSwap: e.target.value })}
              error={errors.desiredSwap}
            />
          )}
          <Checkbox checked={input.openToOffers} onChange={(openToOffers) => change({ openToOffers })}>
            Open to offers: I’ll consider anything
          </Checkbox>
          {input.openToOffers && errors.desiredSwap && <p className="text-compact text-danger">{errors.desiredSwap}</p>}
        </FieldAnchor>
      )}

      <FieldAnchor name="areaId" className="flex flex-col gap-1">
        <CheckList
          label="Where will you meet?"
          options={config.areas.map((a) => ({ value: a.id, label: a.name }))}
          value={input.areaId ? [input.areaId] : []}
          onChange={([areaId]) => change({ areaId: areaId ?? null })}
          single
        />
        <p className="text-compact text-muted">Buyers see the area only, never your address.</p>
        {errors.areaId && <p className="text-compact text-danger">{errors.areaId}</p>}
      </FieldAnchor>

      <FieldAnchor
        name="quickSellHours"
        className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
      >
        <Checkbox
          checked={input.quickSell}
          onChange={(quickSell) => change({ quickSell, quickSellHours: quickSell ? input.quickSellHours : null })}
        >
          Use Quick Sell
        </Checkbox>
        <p className="text-compact text-muted">{copy.quickSellNote}</p>
        {input.quickSell && (
          <RadioGroup
            aria-labelledby={quickSellId}
            value={input.quickSellHours ? String(input.quickSellHours) : null}
            onChange={(value) => change({ quickSellHours: Number(value) })}
            className="flex flex-col gap-2"
          >
            <Label id={quickSellId} className="text-compact font-semibold text-ink">
              How long should it run?
            </Label>
            <div className="flex flex-wrap gap-2">
              {config.quickSellOptionsHours.map((hours) => (
                <Radio
                  key={hours}
                  value={String(hours)}
                  className={({ isSelected, isFocusVisible }) =>
                    cx(chipBase, isSelected ? chipOn : chipOff, isFocusVisible && 'ring-2 ring-focus ring-offset-2')
                  }
                >
                  {quickSellLabel(hours)}
                </Radio>
              ))}
            </div>
            {endsAt && (
              <p className="tabular text-compact font-semibold text-ink">
                {`${published ? 'Saving starts a new deadline: it ends' : 'If you publish now, it ends'} ${formatWAT(endsAt)}.`}
              </p>
            )}
            {errors.quickSellHours && <p className="text-compact text-danger">{errors.quickSellHours}</p>}
          </RadioGroup>
        )}
      </FieldAnchor>
    </div>
  )
}

import { ArrowLeftRight, Banknote, Repeat } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Label, Radio, RadioGroup } from 'react-aria-components'
import { Checkbox } from '@/components/ui/Checkbox'
import { CheckList } from '@/components/ui/ChoiceList'
import { chipBase, chipOff, chipOn } from '@/components/ui/control-styles'
import { MoneyField } from '@/components/ui/MoneyField'
import { RadioCards } from '@/components/ui/RadioCards'
import { SelectField } from '@/components/ui/SelectField'
import { TextAreaField } from '@/components/ui/TextAreaField'
import { TextField } from '@/components/ui/TextField'
import { PhotoUploader } from '@/features/selling/components/PhotoUploader'
import { quickSellLabel, UNKNOWN, type FieldErrors } from '@/features/selling/listing-input'
import { useNow } from '@/hooks/useNow'
import { copy } from '@/lib/copy/copy'
import { conditionHelp } from '@/lib/copy/labels'
import { conditionLabel } from '@/lib/copy/status'
import { cx } from '@/lib/cx'
import { formatWAT } from '@/lib/time/time'
import type { Category, ItemCondition, ListingInput, RuntimeConfig, TradeMode } from '@/types/api'

export type StepProps = {
  input: ListingInput
  change: (changes: Partial<ListingInput>) => void
  errors: FieldErrors
  config: RuntimeConfig
}

/** Wraps a field so the error summary can scroll to it. */
function Anchor({ name, children, className }: { name: string; children: ReactNode; className?: string }) {
  return (
    <div id={`field-${name}`} className={cx('scroll-mt-24', className)}>
      {children}
    </div>
  )
}

/* ---------- Step 1: photos and basics (UX-10) ---------- */

export function BasicsStep({
  input,
  change,
  errors,
  config,
  onUploadingChange,
}: StepProps & { onUploadingChange: (busy: boolean) => void }) {
  const category = config.categories.find((c) => c.id === input.categoryId)

  return (
    <div className="flex flex-col gap-8">
      <Anchor name="photos">
        <PhotoUploader
          value={input.photos}
          onChange={(photos) => change({ photos })}
          limits={config.photoLimits}
          itemName={input.title}
          error={errors.photos}
          onBusyChange={onUploadingChange}
        />
      </Anchor>
      <Anchor name="title">
        <TextField
          label="Title"
          hint="Say what it is, with the model and size, like “iPhone 12 Pro · 128GB”."
          maxLength={80}
          value={input.title}
          onChange={(e) => change({ title: e.target.value })}
          error={errors.title}
        />
      </Anchor>
      <Anchor name="categoryId">
        <RadioCards
          label="Category"
          columns={2}
          options={config.categories.map((c) => ({ value: c.id, title: c.name }))}
          value={input.categoryId}
          onChange={(categoryId) => change({ categoryId })}
        />
        {errors.categoryId && <p className="mt-1 text-compact text-danger">{errors.categoryId}</p>}
      </Anchor>
      {category && <CategoryFields category={category} input={input} change={change} errors={errors} />}
      <Anchor name="description">
        <TextAreaField
          label="Description (optional)"
          hint="How you used it, why you’re selling, anything a buyer should know."
          maxLength={1000}
          value={input.description}
          onChange={(e) => change({ description: e.target.value })}
          error={errors.description}
        />
      </Anchor>
    </div>
  )
}

/** The chosen category's own details (FE-LST-09). Fields come only from config, so swapping it needs no code. */
function CategoryFields({
  category,
  input,
  change,
  errors,
}: {
  category: Category
  input: ListingInput
  change: StepProps['change']
  errors: FieldErrors
}) {
  const set = (id: string, value: string) => change({ categoryFields: { ...input.categoryFields, [id]: value } })

  return (
    <fieldset className="flex flex-col gap-5 rounded-card border border-border bg-surface p-4">
      <legend className="px-1 text-compact font-semibold text-ink">{category.name} details</legend>
      {category.fields.map((field) => {
        const value = input.categoryFields[field.id] ?? ''
        const error = errors[`categoryFields.${field.id}`]
        if (field.type === 'select') {
          return (
            <Anchor key={field.id} name={`categoryFields.${field.id}`}>
              <SelectField
                label={field.label}
                options={[
                  ...(field.options ?? []).map((o) => ({ value: o, label: o })),
                  ...(field.allowUnknown ? [{ value: UNKNOWN, label: 'Not known' }] : []),
                ]}
                value={value}
                onChange={(e) => set(field.id, e.target.value)}
                error={error}
              />
            </Anchor>
          )
        }
        if (field.type === 'percent') {
          const unknown = value === UNKNOWN
          return (
            <Anchor key={field.id} name={`categoryFields.${field.id}`} className="flex flex-col gap-1">
              {!unknown && (
                <TextField
                  label={field.label}
                  hint="Usually under Settings › Battery. A number from 1 to 100."
                  inputMode="numeric"
                  maxLength={3}
                  value={value}
                  onChange={(e) => set(field.id, e.target.value.replace(/\D/g, ''))}
                  error={error}
                  className="tabular"
                />
              )}
              {field.allowUnknown && (
                <Checkbox checked={unknown} onChange={(on) => set(field.id, on ? UNKNOWN : '')}>
                  {unknown ? `${field.label}: not known` : 'Not known'}
                </Checkbox>
              )}
            </Anchor>
          )
        }
        return (
          <Anchor key={field.id} name={`categoryFields.${field.id}`}>
            <TextField
              label={`${field.label} (optional)`}
              value={value}
              onChange={(e) => set(field.id, e.target.value)}
              error={error}
            />
          </Anchor>
        )
      })}
    </fieldset>
  )
}

/* ---------- Step 2: condition (UX-11) ---------- */

export function ConditionStep({ input, change, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-8">
      <Anchor name="condition">
        <RadioCards
          label="Condition"
          columns={2}
          options={(Object.keys(conditionHelp) as ItemCondition[]).map((value) => ({
            value,
            title: conditionLabel(value),
            description: conditionHelp[value],
          }))}
          value={input.condition}
          onChange={(condition) => change({ condition })}
        />
        {errors.condition && <p className="mt-1 text-compact text-danger">{errors.condition}</p>}
      </Anchor>

      <Anchor name="defects" className="flex flex-col gap-2">
        {!input.noDefects && (
          <TextAreaField
            label="Defects"
            hint="One per line: scratches, dents, faults, missing parts. Buyers see these before the offer button."
            value={input.defects.join('\n')}
            onChange={(e) => change({ defects: e.target.value.split('\n') })}
            error={errors.defects}
          />
        )}
        <Checkbox checked={input.noDefects} onChange={(noDefects) => change({ noDefects })}>
          No defects to disclose
        </Checkbox>
        {input.noDefects && errors.defects && <p className="text-compact text-danger">{errors.defects}</p>}
      </Anchor>

      <Anchor name="repairs">
        <TextAreaField
          label="Repairs"
          hint="Anything replaced or fixed, and who did it. Write “None” if it has never been repaired."
          rows={2}
          maxLength={500}
          value={input.repairs}
          onChange={(e) => change({ repairs: e.target.value })}
          error={errors.repairs}
        />
      </Anchor>
      <Anchor name="accessories">
        <TextField
          label="What’s included"
          hint="Box, charger, case. Write “None” if it’s just the item."
          value={input.accessories}
          onChange={(e) => change({ accessories: e.target.value })}
          error={errors.accessories}
        />
      </Anchor>
      <Anchor name="ownershipConfirmed">
        <Checkbox
          checked={input.ownershipConfirmed}
          onChange={(ownershipConfirmed) => change({ ownershipConfirmed })}
          error={errors.ownershipConfirmed}
        >
          This item belongs to me, and I’m free to sell or swap it
        </Checkbox>
      </Anchor>
    </div>
  )
}

/* ---------- Step 3: trade options and Quick Sell (UX-12) ---------- */

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
      <Anchor name="modes">
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
      </Anchor>

      {cash && (
        <Anchor name="askingKobo">
          <MoneyField
            label="Asking price"
            hint="People can still offer a different amount."
            value={input.askingKobo}
            onChange={(askingKobo) => change({ askingKobo })}
            error={errors.askingKobo}
          />
        </Anchor>
      )}

      {swap && (
        <Anchor name="desiredSwap" className="flex flex-col gap-2">
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
        </Anchor>
      )}

      <Anchor name="areaId" className="flex flex-col gap-1">
        <CheckList
          label="Where will you meet?"
          options={config.areas.map((a) => ({ value: a.id, label: a.name }))}
          value={input.areaId ? [input.areaId] : []}
          onChange={([areaId]) => change({ areaId: areaId ?? null })}
          single
        />
        <p className="text-compact text-muted">Buyers see the area only, never your address.</p>
        {errors.areaId && <p className="text-compact text-danger">{errors.areaId}</p>}
      </Anchor>

      <Anchor name="quickSellHours" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
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
      </Anchor>
    </div>
  )
}

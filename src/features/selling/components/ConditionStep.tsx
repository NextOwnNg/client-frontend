import { Checkbox } from '@/components/ui/Checkbox'
import { RadioCards } from '@/components/ui/RadioCards'
import { TextAreaField } from '@/components/ui/TextAreaField'
import { TextField } from '@/components/ui/TextField'
import { conditionHelp } from '@/lib/copy/labels'
import { conditionLabel } from '@/lib/copy/status'
import type { ItemCondition } from '@/types/api'
import type { StepProps } from '@/features/selling/components/wizard-step'
import { FieldAnchor } from '@/components/ui/FieldAnchor'

export function ConditionStep({ input, change, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-8">
      <FieldAnchor name="condition">
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
      </FieldAnchor>

      <FieldAnchor name="defects" className="flex flex-col gap-2">
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
      </FieldAnchor>

      <FieldAnchor name="repairs">
        <TextAreaField
          label="Repairs"
          hint="Anything replaced or fixed, and who did it. Write “None” if it has never been repaired."
          rows={2}
          maxLength={500}
          value={input.repairs}
          onChange={(e) => change({ repairs: e.target.value })}
          error={errors.repairs}
        />
      </FieldAnchor>
      <FieldAnchor name="accessories">
        <TextField
          label="What’s included"
          hint="Box, charger, case. Write “None” if it’s just the item."
          value={input.accessories}
          onChange={(e) => change({ accessories: e.target.value })}
          error={errors.accessories}
        />
      </FieldAnchor>
      <FieldAnchor name="ownershipConfirmed">
        <Checkbox
          checked={input.ownershipConfirmed}
          onChange={(ownershipConfirmed) => change({ ownershipConfirmed })}
          error={errors.ownershipConfirmed}
        >
          This item belongs to me, and I’m free to sell or swap it
        </Checkbox>
      </FieldAnchor>
    </div>
  )
}

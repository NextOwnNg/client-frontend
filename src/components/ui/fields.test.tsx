import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MoneyField } from '@/components/ui/MoneyField'
import { PhoneField } from '@/components/ui/PhoneField'
import { RadioCards } from '@/components/ui/RadioCards'

function ControlledMoney({ onChange }: { onChange: (kobo: number | null) => void }) {
  const [value, setValue] = useState<number | null>(null)
  return (
    <MoneyField
      label="Your offer"
      value={value}
      onChange={(kobo) => {
        setValue(kobo)
        onChange(kobo)
      }}
    />
  )
}

describe('MoneyField', () => {
  it('reports kobo and groups the amount on blur', async () => {
    const onChange = vi.fn()
    render(<ControlledMoney onChange={onChange} />)
    const input = screen.getByLabelText('Your offer')

    await userEvent.type(input, '1200000')
    await userEvent.tab()

    expect(onChange).toHaveBeenLastCalledWith(120_000_000)
    expect(input).toHaveValue('1,200,000')
  })

  it('explains decimals instead of rounding them', async () => {
    const onChange = vi.fn()
    render(<ControlledMoney onChange={onChange} />)
    const input = screen.getByLabelText('Your offer')

    await userEvent.type(input, '12.5')
    await userEvent.tab()

    expect(onChange).toHaveBeenLastCalledWith(null)
    expect(screen.getByText('Use whole naira, without kobo.')).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(/Use whole naira/)
  })
})

describe('PhoneField', () => {
  it('normalises a local number to E.164', async () => {
    const onChange = vi.fn()
    render(<PhoneField value="" onChange={onChange} />)

    await userEvent.type(screen.getByLabelText('Phone number'), '08031234567')

    expect(onChange).toHaveBeenLastCalledWith('+2348031234567')
  })
})

describe('RadioCards', () => {
  it('is a keyboard-operable radio group', async () => {
    const onChange = vi.fn()
    render(
      <RadioCards
        label="How do you want to trade?"
        value="CASH"
        onChange={onChange}
        options={[
          { value: 'CASH', title: 'Cash offer' },
          { value: 'SWAP', title: 'Swap an item' },
          { value: 'MIXED', title: 'Swap + cash', disabled: true, disabledReason: 'The seller only accepts cash.' },
        ]}
      />,
    )

    expect(screen.getByRole('radiogroup', { name: 'How do you want to trade?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('radio', { name: /Cash offer/ }))
    await userEvent.keyboard('{ArrowDown}')

    expect(onChange).toHaveBeenLastCalledWith('SWAP')
    expect(screen.getByRole('radio', { name: /Swap \+ cash/ })).toBeDisabled()
    expect(screen.getByText('The seller only accepts cash.')).toBeInTheDocument()
  })
})

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

  it('spaces the digits like the placeholder as they are typed', async () => {
    render(<PhoneField value="" onChange={vi.fn()} />)
    const input = screen.getByLabelText('Phone number')

    await userEvent.type(input, '8031234567')
    expect(input).toHaveValue('803 123 4567')

    await userEvent.clear(input)
    await userEvent.type(input, '08031234567')
    expect(input).toHaveValue('0803 123 4567')
  })

  it('formats a pasted number, dropping +234', async () => {
    const onChange = vi.fn()
    render(<PhoneField value="" onChange={onChange} />)
    const input = screen.getByLabelText('Phone number')

    await userEvent.click(input)
    await userEvent.paste('+234 803 123 4567')

    expect(input).toHaveValue('803 123 4567')
    expect(onChange).toHaveBeenLastCalledWith('+2348031234567')
  })

  it('deletes the digit before a space on Backspace, instead of getting stuck', async () => {
    render(<PhoneField value="" onChange={vi.fn()} />)
    const input = screen.getByLabelText('Phone number')

    await userEvent.type(input, '8031')
    expect(input).toHaveValue('803 1')
    await userEvent.type(input, '{Backspace}{Backspace}')

    expect(input).toHaveValue('80')
  })

  it('keeps the caret where the person is editing', async () => {
    render(<PhoneField value="" onChange={vi.fn()} />)
    const input = screen.getByLabelText<HTMLInputElement>('Phone number')
    await userEvent.type(input, '803123456')

    // Fix a digit in the middle: after "80", type "9" → "809 312 3456", caret right after the 9
    input.setSelectionRange(2, 2)
    await userEvent.type(input, '9', { initialSelectionStart: 2, initialSelectionEnd: 2 })

    expect(input).toHaveValue('809 312 3456')
    expect(input.selectionStart).toBe(3)
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

  it('shows the not-allowed cursor on options that can’t be chosen, and the pointer on the rest', () => {
    render(
      <RadioCards
        label="How do you want to trade?"
        value={null}
        onChange={vi.fn()}
        options={[
          { value: 'CASH', title: 'Cash offer' },
          { value: 'MIXED', title: 'Swap + cash', disabled: true, disabledReason: 'The seller only accepts cash.' },
        ]}
      />,
    )
    const card = (name: RegExp) => screen.getByRole('radio', { name }).closest('label')!

    expect(card(/Swap \+ cash/)).toHaveClass('cursor-not-allowed')
    expect(card(/Swap \+ cash/)).not.toHaveClass('cursor-pointer')
    expect(card(/Cash offer/)).toHaveClass('cursor-pointer')
  })
})

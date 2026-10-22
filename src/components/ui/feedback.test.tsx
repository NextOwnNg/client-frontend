import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { ProgressLine } from '@/components/ui/ProgressLine'

describe('ConfirmModal', () => {
  it('confirms once even when clicked twice while pending', async () => {
    let resolve: () => void = () => {}
    const onConfirm = vi.fn(() => new Promise<void>((r) => (resolve = r)))

    render(
      <ConfirmModal
        open
        onOpenChange={() => {}}
        title="Accept this offer?"
        body="Both items will be reserved."
        confirmLabel="Accept offer"
        onConfirm={onConfirm}
      />,
    )

    const dialog = await screen.findByRole('dialog', { name: 'Accept this offer?' })
    const confirm = within(dialog).getByRole('button', { name: 'Accept offer' })
    await userEvent.click(confirm)
    await userEvent.click(confirm)
    resolve()

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})

describe('ProgressLine', () => {
  it('names each step with its state', () => {
    render(
      <ProgressLine
        label="Handover progress"
        steps={[
          { id: 'terms', label: 'Check terms', state: 'done' },
          { id: 'meet', label: 'Arrange meeting', state: 'current' },
          { id: 'confirm', label: 'Both confirm', state: 'todo' },
        ]}
      />,
    )

    const list = screen.getByRole('list', { name: 'Handover progress' })
    const items = within(list).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      'Check terms, done',
      'Arrange meeting, current step',
      'Both confirm, not started',
    ])
    expect(items[1]).toHaveAttribute('aria-current', 'step')
  })
})

import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { copy } from '@/lib/copy/copy'
import { AuthShowcase } from '@/features/account/components/AuthShowcase'
import { renderWithProviders } from '@/test/utils'

function setSaveData(on: boolean | undefined) {
  Object.defineProperty(navigator, 'connection', {
    value: on === undefined ? undefined : { saveData: on },
    configurable: true,
  })
}

afterEach(() => setSaveData(undefined))

describe('Sign-in showcase', () => {
  it('shows one example trade, with the same words on every screen, after the form in reading order', async () => {
    renderWithProviders(routes, { initialPath: '/login' })
    const heading = await screen.findByRole('heading', { level: 1, name: 'Sign in or create an account' })

    const panels = screen.getAllByRole('region', { name: 'How trading on NextOwn works' })
    expect(panels).toHaveLength(1)
    expect(panels[0]).toHaveTextContent(copy.primaryModes)
    expect(panels[0]).toHaveTextContent('You pay ₦150,000 directly at the exchange.')
    expect(screen.queryByText('Swap a Switch, add ₦150,000, take home a MacBook.')).not.toBeInTheDocument()
    // Not hidden on phones: only the code step keeps it to wide screens
    expect(panels[0]!.parentElement).not.toHaveClass('hidden')
    // Keyboard and screen-reader users reach the form before the illustration
    expect(heading.compareDocumentPosition(panels[0]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('leaves the photos out when the person saves data, keeping the words', () => {
    setSaveData(true)
    render(<AuthShowcase />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText(copy.primaryModes)).toBeInTheDocument()
    expect(screen.getByText('You pay ₦150,000 directly at the exchange.')).toBeInTheDocument()
  })

  it('names each photo for screen readers', () => {
    render(<AuthShowcase />)

    expect(screen.getByRole('img', { name: 'A Nintendo Switch with its dock and controllers' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'An open MacBook Air M1' })).toBeInTheDocument()
  })
})

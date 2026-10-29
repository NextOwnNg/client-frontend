import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
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
  it('shows an example trade beside the sign-in form, after the form in reading order', async () => {
    renderWithProviders(routes, { initialPath: '/login' })
    const heading = await screen.findByRole('heading', { level: 1, name: 'Sign in or create an account' })

    expect(screen.getByRole('figure', { name: 'Example trade' })).toBeInTheDocument()
    const panel = screen.getByRole('region', { name: 'How trading on NextOwn works' })
    expect(panel).toHaveTextContent('You pay ₦150,000 directly at the exchange.')
    // Keyboard and screen-reader users reach the form before the illustration
    expect(heading.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('leaves the photos out when the person saves data, keeping the words', () => {
    setSaveData(true)
    render(<AuthShowcase variant="card" />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('Swap a Switch, add ₦150,000, take home a MacBook.')).toBeInTheDocument()
  })

  it('names each photo for screen readers', () => {
    render(<AuthShowcase variant="card" />)

    expect(screen.getByRole('img', { name: 'A Nintendo Switch with its dock and controllers' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'An open MacBook Air M1' })).toBeInTheDocument()
  })
})

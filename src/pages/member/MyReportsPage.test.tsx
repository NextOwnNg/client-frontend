import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { renderWithProviders } from '@/test/utils'

async function open(path: string) {
  const utils = renderWithProviders(routes, { initialPath: path })
  await screen.findByRole('heading', { level: 1 })
  return utils
}

beforeEach(() => mockAuth.signInAs(SAMPLE_MEMBER_ID))

describe('My reports (FE-TRU-03)', () => {
  it('lists each case with its reference, what it was about, the reason and a status with an icon', async () => {
    await open('/me/reports')

    const list = await screen.findByRole('list', { name: 'Your reports' })
    const cases = within(list).getAllByRole('listitem')
    expect(cases).toHaveLength(3)
    expect(cases[0]).toHaveTextContent('Vintage GE desk fan')
    expect(cases[0]).toHaveTextContent('NX-000122')
    expect(cases[0]).toHaveTextContent('Prohibited item')
    expect(within(cases[0]!).getByText('In review')).toBeInTheDocument()
    expect(cases[2]).toHaveTextContent('Action taken')
    // Status only: never what moderators wrote
    expect(screen.queryByText(/Stock photos confirmed/)).not.toBeInTheDocument()
  })

  it('has a calm empty state', async () => {
    mockAuth.signInAs('u-amaka')
    await open('/me/reports')

    expect(await screen.findByText('You haven’t reported anything')).toBeInTheDocument()
  })

  it('is linked from the profile hub', async () => {
    await open('/me')

    expect(screen.getByRole('link', { name: /My reports/ })).toHaveAttribute('href', '/me/reports')
  })
})

describe('Appeals (ruling R7-5)', () => {
  it('has nothing to appeal while the account is in good standing', async () => {
    await open('/appeal')

    expect(screen.getByText('Your account isn’t restricted, so there’s nothing to review.')).toBeInTheDocument()
  })

  it('asks for a few sentences, then shows the case reference and status', async () => {
    mockAuth.setRestricted(true)
    await open('/appeal')

    await userEvent.type(screen.getByLabelText('What should we know?'), 'Too short')
    await userEvent.click(screen.getByRole('button', { name: 'Ask for a review' }))
    expect(await screen.findByText('Tell us a little more, in a sentence or two.')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('What should we know?'), ' — the phone in my listing is my own.')
    await userEvent.click(screen.getByRole('button', { name: 'Ask for a review' }))

    expect(
      await screen.findByText(/^We received your request\. Your case reference is NX-\d{6}\.$/),
    ).toBeInTheDocument()
    expect(screen.getByText('Received')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ask for a review' })).not.toBeInTheDocument()
  })

  it('shows the pending appeal on the restricted banner', async () => {
    mockAuth.setRestricted(true)
    const { router } = await open('/appeal')
    await userEvent.type(
      screen.getByLabelText('What should we know?'),
      'Please look again: the listing was my own phone.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Ask for a review' }))
    await screen.findByText(/^We received your request/)

    await router.navigate('/me')
    expect(await screen.findByText(/We’re reviewing your request \(NX-\d{6}\)\./)).toBeInTheDocument()
  })
})

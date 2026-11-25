import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { apiClient } from '@/lib/api/client'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { CHANGES_SAMPLE_ID } from '@/mocks/db/listings'
import { renderWithProviders } from '@/test/utils'

const tools = () => screen.getByRole('region', { name: 'Developer tools' })

beforeEach(() => mockAuth.signInAs(SAMPLE_MEMBER_ID))

describe('Listing review, the whole round through the mock', () => {
  it('asks for changes, lets the seller resubmit, then approves', async () => {
    const user = userEvent.setup()
    await apiClient.post(`/listings/${CHANGES_SAMPLE_ID}/publish`)
    const { router } = renderWithProviders(routes, { initialPath: '/me/listings' })
    await screen.findByRole('heading', { level: 1, name: 'My listings' })

    // A moderator asks for changes
    await user.click(await screen.findByRole('button', { name: 'Sample data' }))
    await user.selectOptions(within(tools()).getByRole('combobox', { name: 'Reason' }), 'Wrong category')
    await user.type(within(tools()).getByRole('textbox', { name: 'Message to seller' }), 'Please move it to Gaming.')
    await user.click(within(tools()).getByRole('button', { name: 'Ask for changes' }))

    // The seller is told, and opens the listing from the alert
    await router.navigate('/notifications')
    const alert = await screen.findByRole('link', { name: /needs a few changes/ })
    expect(alert).toHaveTextContent('Wrong category. Please move it to Gaming.')
    await user.click(alert)
    expect(await screen.findByText('Changes needed: Wrong category')).toBeInTheDocument()

    // They resubmit from the preview step
    await router.navigate(`/listings/${CHANGES_SAMPLE_ID}/edit?step=preview`)
    await user.click((await screen.findAllByRole('button', { name: 'Resubmit for review' }))[0]!)
    expect(await screen.findByRole('heading', { level: 1, name: 'Thanks, we’ll check it again' })).toBeInTheDocument()

    // A moderator approves it
    await user.click(within(tools()).getByRole('button', { name: 'Approve' }))
    await router.navigate('/notifications')
    expect(await screen.findByRole('link', { name: /Your listing is live/ })).toBeInTheDocument()
    await waitFor(async () =>
      expect((await apiClient.get(`/me/listings/${CHANGES_SAMPLE_ID}`)).data).toMatchObject({ status: 'ACTIVE' }),
    )
  })

  it('says when there is nothing under review to decide', async () => {
    const user = userEvent.setup()
    renderWithProviders(routes, { initialPath: '/me/listings' })
    await screen.findByRole('heading', { level: 1, name: 'My listings' })

    await user.click(await screen.findByRole('button', { name: 'Sample data' }))
    await user.click(within(tools()).getByRole('button', { name: 'Approve' }))

    expect(within(tools()).getByText('Nothing of yours is under review. Publish a listing first.')).toBeInTheDocument()
  })
})

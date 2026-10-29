import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { apiClient } from '@/lib/api/client'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { renderWithProviders } from '@/test/utils'
import type { BlockedPerson } from '@/types/api'

async function open(path: string) {
  const utils = renderWithProviders(routes, { initialPath: path })
  await screen.findByRole('heading', { level: 1 })
  return utils
}

const blockedIds = async () => (await apiClient.get<BlockedPerson[]>('/me/blocks')).data.map((p) => p.id)

beforeEach(() => mockAuth.signInAs(SAMPLE_MEMBER_ID))

describe('Blocking (FE-TRU-02, DSC-08)', () => {
  it('asks first from a profile, says what changes, then offers Unblock', async () => {
    await open('/users/u-chidi')

    await userEvent.click(screen.getByRole('button', { name: 'Block Chidi O.' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/won’t be able to message each other/)).toBeInTheDocument()
    expect(within(dialog).getByText(/They aren’t told/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Block' }))

    expect(await screen.findByRole('button', { name: 'Unblock Chidi O.' })).toBeInTheDocument()
    expect(await blockedIds()).toEqual(['u-chidi'])
  })

  it('isn’t offered on your own profile', async () => {
    await open(`/users/${SAMPLE_MEMBER_ID}`)

    expect(screen.queryByRole('button', { name: /^Block/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Report/ })).not.toBeInTheDocument()
  })

  it('turns the chat composer into a notice, with Unblock beside it', async () => {
    await open('/messages/m-xbox')

    await userEvent.click(screen.getByRole('button', { name: 'Block Chidi O.' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Block' }))

    expect(
      await screen.findByText('You blocked Chidi O., so neither of you can send messages here.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Message')).not.toBeInTheDocument()
    // The history stays readable
    expect(screen.getByText(/Both controllers are charged/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Unblock Chidi O.' }))
    expect(await screen.findByLabelText('Message')).toBeInTheDocument()
  })

  it('lists blocked people in Settings, each with Unblock', async () => {
    await apiClient.put('/me/blocks/u-amaka')
    await open('/settings')

    const list = await screen.findByRole('list', { name: 'Blocked people' })
    expect(within(list).getByText('Amaka N.')).toBeInTheDocument()
    await userEvent.click(within(list).getByRole('button', { name: 'Unblock Amaka N.' }))

    expect(await screen.findByText('You haven’t blocked anyone.')).toBeInTheDocument()
    expect(await blockedIds()).toEqual([])
  })

  it('replaces Make an offer on a blocked seller’s listing (ruling R7-4)', async () => {
    await apiClient.put('/me/blocks/u-amaka')
    await open('/listings/ps5-disc-edition')

    expect((await screen.findAllByText(/^You blocked Amaka N\./)).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Make an offer' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Unblock on their profile' })[0]).toHaveAttribute(
      'href',
      '/users/u-amaka',
    )
  })

  it('refuses an offer to someone who blocked you, without saying who blocked whom (QA-18)', async () => {
    mockAuth.signInAs('u-zainab')
    await apiClient.put(`/me/blocks/${SAMPLE_MEMBER_ID}`)
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    await open('/offers/new?listing=l8')

    await userEvent.click(await screen.findByRole('radio', { name: /^Cash offer/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await userEvent.type(await screen.findByLabelText('Your offer'), '200000')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByRole('heading', { name: 'Check your offer' })
    await userEvent.click(screen.getByRole('button', { name: 'Send offer' }))

    expect(await screen.findByText(/You can’t message or make offers with this person\./)).toBeInTheDocument()
  })
})

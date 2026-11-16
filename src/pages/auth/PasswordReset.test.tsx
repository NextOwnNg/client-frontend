import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { apiClient } from '@/lib/api/client'
import { mockAuth, SAMPLE_CODE, SAMPLE_MEMBER_EMAIL } from '@/mocks/db/auth'
import { renderWithProviders } from '@/test/utils'
import type { Me } from '@/types/api'

const path = (router: { state: { location: { pathname: string; search: string } } }) =>
  router.state.location.pathname + router.state.location.search

async function askForCode(email: string) {
  const utils = renderWithProviders(routes, { initialPath: '/forgot-password?next=%2Fme' })
  await userEvent.type(await screen.findByRole('textbox', { name: 'Email' }), email)
  await userEvent.click(screen.getByRole('button', { name: 'Send code' }))
  await screen.findByRole('heading', { level: 1, name: 'Choose a new password' })
  return utils
}

describe('Forgot password', () => {
  it('reaches the reset step from sign in, carrying the typed email', async () => {
    renderWithProviders(routes, { initialPath: '/login?next=%2Fme' })

    await userEvent.type(await screen.findByRole('textbox', { name: 'Email' }), 'ada@example.com')
    await userEvent.click(screen.getByRole('link', { name: 'Forgot password?' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Reset your password' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('ada@example.com')
  })

  it('answers the same way whether or not the email has an account', async () => {
    const { router } = await askForCode('nobody@example.com')

    expect(screen.getByText(/has an account, we sent it a 6-digit code/)).toBeInTheDocument()
    expect(path(router)).toBe('/reset-password?next=%2Fme')
  })

  it('needs the code and a new password of at least 8 characters', async () => {
    await askForCode(SAMPLE_MEMBER_EMAIL)

    await userEvent.type(screen.getByLabelText('New password'), 'short')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))

    expect(screen.getByText('Enter all 6 digits.')).toBeInTheDocument()
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument()
  })

  it('says when the code is wrong', async () => {
    await askForCode(SAMPLE_MEMBER_EMAIL)

    await userEvent.type(screen.getByRole('textbox', { name: '6-digit code' }), '000000')
    await userEvent.type(screen.getByLabelText('New password'), 'a new password')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByText("That code doesn't match. Check the email and try again.")).toBeInTheDocument()
  })

  it('changes the password, signs the member in and lands on next', async () => {
    const { router } = await askForCode(SAMPLE_MEMBER_EMAIL)

    await userEvent.type(screen.getByRole('textbox', { name: '6-digit code' }), SAMPLE_CODE)
    await userEvent.type(screen.getByLabelText('New password'), 'a new password')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))

    await waitFor(() => expect(path(router)).toBe('/me'))
    expect((await apiClient.get<Me>('/me')).data.email).toBe(SAMPLE_MEMBER_EMAIL)

    // The old password no longer works; the new one does
    mockAuth.expireSession()
    await expect(
      apiClient.post('/auth/login', { email: SAMPLE_MEMBER_EMAIL, password: 'nextown-pilot' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    await apiClient.post('/auth/login', { email: SAMPLE_MEMBER_EMAIL, password: 'a new password' })
  })

  it('sends someone without an email in progress back to Forgot password', async () => {
    const { router } = renderWithProviders(routes, { initialPath: '/reset-password?next=%2Fme' })

    await waitFor(() => expect(path(router)).toBe('/forgot-password?next=%2Fme'))
    await act(async () => {})
  })
})

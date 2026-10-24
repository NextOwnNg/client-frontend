import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { isApiError } from '@/lib/api/api-error'
import { apiClient } from '@/lib/api/client'
import { mockAuth, SAMPLE_CODE, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import type { Me } from '@/types/api'

const API = import.meta.env.VITE_API_BASE_URL

async function renderSettings() {
  mockAuth.signInAs(SAMPLE_MEMBER_ID)
  const utils = renderWithProviders(routes, { initialPath: '/settings' })
  await screen.findByRole('heading', { level: 1, name: 'Account settings' })
  return utils
}

const nameInput = () => screen.getByRole('textbox', { name: 'Display name' })
const me = async () => (await apiClient.get<Me>('/me')).data

describe('Account settings', () => {
  it('starts from the saved profile', async () => {
    await renderSettings()

    expect(nameInput()).toHaveValue('Tolu A.')
    expect(screen.getByRole('checkbox', { name: '[Pilot Area] Central' })).toBeChecked()
  })

  it('saves profile changes', async () => {
    await renderSettings()

    await userEvent.clear(nameInput())
    await userEvent.type(nameInput(), 'Tolu Adeyemi')
    await userEvent.click(screen.getByRole('button', { name: 'Phones' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Profile saved.')).toBeInTheDocument()
    expect(await me()).toMatchObject({ displayName: 'Tolu Adeyemi', interests: ['phones'] })
  })

  it('keeps a server validation error on the field', async () => {
    server.use(
      http.patch(`${API}/me`, () =>
        HttpResponse.json(
          { code: 'VALIDATION_ERROR', field_errors: { displayName: 'Choose a different name.' } },
          { status: 422 },
        ),
      ),
    )
    await renderSettings()

    await userEvent.type(nameInput(), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Choose a different name.')).toBeInTheDocument()
    expect(nameInput()).toHaveValue('Tolu A.x')
  })

  it('shows the phone masked and read-only', async () => {
    await renderSettings()

    expect(screen.getByText('+234 ••• ••• 0001')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /phone/i })).not.toBeInTheDocument()
  })

  it('keeps marketing separate from essential messages and saves it on its own', async () => {
    await renderSettings()
    const section = screen.getByRole('region', { name: 'Messages from NextOwn' })

    expect(within(section).getByText(/always sent/)).toBeInTheDocument()
    await userEvent.click(within(section).getByRole('checkbox', { name: /tips and news/ }))

    await waitFor(async () => expect((await me()).marketingOptIn).toBe(true))
  })

  it('signs out, returns home, and refuses later member requests', async () => {
    const { router } = await renderSettings()

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument()
    const error = await apiClient.get('/me').catch((e: unknown) => e)
    expect(isApiError(error) && error.status).toBe(401)
  })

  it('asks before requesting deletion, then keeps showing the request', async () => {
    const first = await renderSettings()

    await userEvent.click(screen.getByRole('button', { name: 'Request account deletion' }))
    const dialog = await screen.findByRole('dialog', { name: 'Request account deletion?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send request' }))

    expect(await screen.findByText('We’ve received your deletion request')).toBeInTheDocument()
    expect(screen.getByText(/Reference NX-DEL-/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Request account deletion' })).not.toBeInTheDocument()

    first.unmount()
    renderWithProviders(routes, { initialPath: '/settings' })
    expect(await screen.findByText('We’ve received your deletion request')).toBeInTheDocument()
  })

  it('keeps an edit through an expired session and a fresh sign-in', async () => {
    await renderSettings()
    await userEvent.clear(nameInput())
    await userEvent.type(nameInput(), 'Tolu Adeyemi')

    mockAuth.expireSession()
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await userEvent.click(await screen.findByRole('link', { name: 'Sign in again' }))

    await userEvent.type(await screen.findByRole('textbox', { name: 'Phone number' }), '0803 000 0001')
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }))
    await userEvent.type(await screen.findByRole('textbox', { name: '6-digit code' }), SAMPLE_CODE)
    await userEvent.click(screen.getByRole('button', { name: 'Confirm phone' }))

    await screen.findByRole('heading', { level: 1, name: 'Account settings' })
    expect(nameInput()).toHaveValue('Tolu Adeyemi')
  })
})

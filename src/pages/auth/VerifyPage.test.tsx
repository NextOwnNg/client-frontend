import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { mockAuth, SAMPLE_CODE, SAMPLE_MEMBER_PHONE } from '@/mocks/db/auth'
import { apiClient } from '@/lib/api/client'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'

const API = import.meta.env.VITE_API_BASE_URL
const NEW_PHONE = '+2348031234567'

async function renderVerify({ phone = NEW_PHONE, next = '/settings', resendInMs = 60_000 } = {}) {
  await apiClient.post('/auth/otp/request', { phone })
  return renderWithProviders(routes, {
    initialPath: {
      pathname: '/verify',
      search: `?next=${encodeURIComponent(next)}`,
      state: { phone, resendAt: Date.now() + resendInMs },
    },
  })
}

const codeInput = () => screen.findByRole('textbox', { name: '6-digit code' })
const confirm = () => userEvent.click(screen.getByRole('button', { name: 'Confirm phone' }))
const path = (router: { state: { location: { pathname: string; search: string } } }) =>
  router.state.location.pathname + router.state.location.search

describe('Confirm phone code', () => {
  it('shows where the code went, with a way to change the number', async () => {
    await renderVerify()

    expect(await screen.findByText('+234 803 123 4567')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Change number' })).toHaveAttribute('href', '/login?next=%2Fsettings')
  })

  it('does not submit by itself once six digits are typed', async () => {
    const { router } = await renderVerify()

    await userEvent.type(await codeInput(), SAMPLE_CODE)

    expect(path(router)).toBe('/verify?next=%2Fsettings')
    expect(screen.queryByText('Phone confirmed')).not.toBeInTheDocument()
  })

  it.each(['123 456', '123-456'])('cleans a pasted code like %j', async (pasted) => {
    await renderVerify()
    const input = await codeInput()

    input.focus()
    await userEvent.paste(pasted)

    expect(input).toHaveValue('123456')
  })

  it('says when the code is wrong', async () => {
    await renderVerify()

    await userEvent.type(await codeInput(), '000000')
    await confirm()

    expect(
      await screen.findByText("That code doesn't match. Check the text message and try again."),
    ).toBeInTheDocument()
  })

  it('says when the code has expired and lets a new one be sent straight away', async () => {
    await renderVerify()
    mockAuth.expireCodes()

    await userEvent.type(await codeInput(), SAMPLE_CODE)
    await confirm()

    expect(
      await screen.findByText('That code has expired. Send a new code and use the latest one.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send a new code' })).toBeEnabled()
  })

  it('asks for a wait after too many tries', async () => {
    server.use(
      http.post(`${API}/auth/otp/verify`, () =>
        HttpResponse.json({ code: 'RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': '600' } }),
      ),
    )
    await renderVerify()

    await userEvent.type(await codeInput(), '000000')
    await confirm()

    expect(await screen.findByRole('alert')).toHaveTextContent('Wait 10 minutes, then try again.')
  })

  it('asks for all six digits before checking', async () => {
    await renderVerify()

    await userEvent.type(await codeInput(), '123')
    await confirm()

    expect(screen.getByText('Enter all 6 digits.')).toBeInTheDocument()
  })

  it('counts down before a new code can be sent, then sends one', async () => {
    await renderVerify({ resendInMs: 1500 })

    const resend = await screen.findByRole('button', { name: /Send a new code/ })
    expect(resend).toBeDisabled()
    expect(resend).toHaveTextContent(/in 0:0[12]/)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Send a new code' })).toBeEnabled(), {
      timeout: 3000,
    })
    await userEvent.click(screen.getByRole('button', { name: 'Send a new code' }))

    expect(await screen.findByText('We sent a new code.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Send a new code/ })).toBeDisabled()
  })

  it('takes a new account to onboarding, carrying next', async () => {
    const { router } = await renderVerify()

    await userEvent.type(await codeInput(), SAMPLE_CODE)
    await confirm()

    await waitFor(() => expect(path(router)).toBe('/onboarding?next=%2Fsettings'))
  })

  it('takes an existing member straight to next', async () => {
    const { router } = await renderVerify({ phone: SAMPLE_MEMBER_PHONE, next: '/me' })

    await userEvent.type(await codeInput(), SAMPLE_CODE)
    await confirm()

    await waitFor(() => expect(path(router)).toBe('/me'))
  })

  it('sends someone without a phone in progress back to sign in', async () => {
    const { router } = renderWithProviders(routes, { initialPath: '/verify?next=%2Fsettings' })

    await waitFor(() => expect(path(router)).toBe('/login?next=%2Fsettings'))
    await act(async () => {})
  })
})

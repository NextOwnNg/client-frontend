import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { mockAuth, SAMPLE_CODE } from '@/mocks/db/auth'
import { apiClient } from '@/lib/api/client'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import type { VerifyState } from '@/pages/auth/LoginPage'

const API = import.meta.env.VITE_API_BASE_URL
const NEW_EMAIL = 'ada@example.com'

type Options = { next?: string; resendInMs?: number; from?: VerifyState['from'] }

async function renderVerify({ next = '/settings', resendInMs = 60_000, from = 'signup' }: Options = {}) {
  await apiClient.post('/auth/signup', { email: NEW_EMAIL, password: 'correct horse' })
  const state: VerifyState = { email: NEW_EMAIL, resendAt: Date.now() + resendInMs, from }
  return renderWithProviders(routes, {
    initialPath: { pathname: '/verify', search: `?next=${encodeURIComponent(next)}`, state },
  })
}

const codeInput = () => screen.findByRole('textbox', { name: '6-digit code' })
const confirm = () => userEvent.click(screen.getByRole('button', { name: 'Confirm email' }))
const path = (router: { state: { location: { pathname: string; search: string } } }) =>
  router.state.location.pathname + router.state.location.search

describe('Confirm email code', () => {
  it('shows where the code went, with a way to use a different email', async () => {
    await renderVerify()

    expect(await screen.findByText(NEW_EMAIL)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Use a different email' })).toHaveAttribute(
      'href',
      '/signup?next=%2Fsettings',
    )
  })

  it('sends someone who came from sign-in back there to change the email', async () => {
    await renderVerify({ from: 'login' })

    expect(await screen.findByRole('link', { name: 'Use a different email' })).toHaveAttribute(
      'href',
      '/login?next=%2Fsettings',
    )
  })

  it('does not submit by itself once six digits are typed', async () => {
    const { router } = await renderVerify()

    await userEvent.type(await codeInput(), SAMPLE_CODE)

    expect(path(router)).toBe('/verify?next=%2Fsettings')
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

    expect(await screen.findByText("That code doesn't match. Check the email and try again.")).toBeInTheDocument()
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
      http.post(`${API}/auth/email/verify`, () =>
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

  it('takes the new account to profile setup, carrying next', async () => {
    const { router } = await renderVerify()

    await userEvent.type(await codeInput(), SAMPLE_CODE)
    await confirm()

    await waitFor(() => expect(path(router)).toBe('/onboarding?next=%2Fsettings'))
    expect(await screen.findByText('Email confirmed. This does not verify identity or ownership.')).toBeInTheDocument()
  })

  it('sends someone without an email in progress back to create an account', async () => {
    const { router } = renderWithProviders(routes, { initialPath: '/verify?next=%2Fsettings' })

    await waitFor(() => expect(path(router)).toBe('/signup?next=%2Fsettings'))
    await act(async () => {})
  })
})

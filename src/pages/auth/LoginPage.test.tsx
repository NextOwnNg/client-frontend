import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'

const API = import.meta.env.VITE_API_BASE_URL

const renderLogin = (path = '/login?next=%2Flistings%2Fiphone-12-pro-128gb%3Fintent%3Dsave') =>
  renderWithProviders(routes, { initialPath: path })

const phoneInput = () => screen.findByRole('textbox', { name: 'Phone number' })
const sendCode = () => userEvent.click(screen.getByRole('button', { name: 'Send code' }))

describe('Phone sign-in', () => {
  it('explains why the phone is needed and that it stays private', async () => {
    renderLogin()

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in or create an account' })).toBeInTheDocument()
    expect(screen.getByText(/keeps your account secure/)).toBeInTheDocument()
    expect(screen.getByText(/never shown on your profile, listings or offers/)).toBeInTheDocument()
  })

  it('sends the number in international form, however it was typed', async () => {
    let body: unknown
    server.use(
      http.post(`${API}/auth/otp/request`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ resendAfterSeconds: 60 }, { status: 202 })
      }),
    )
    renderLogin()

    await userEvent.type(await phoneInput(), '0803 123 4567')
    await sendCode()

    expect(await screen.findByRole('heading', { level: 1, name: 'Enter the code' })).toBeInTheDocument()
    expect(body).toEqual({ phone: '+2348031234567' })
  })

  it('shows an inline error for an invalid number and sends nothing', async () => {
    let called = false
    server.use(
      http.post(`${API}/auth/otp/request`, () => {
        called = true
        return HttpResponse.json({ resendAfterSeconds: 60 }, { status: 202 })
      }),
    )
    renderLogin()

    await userEvent.type(await phoneInput(), '12345')
    await sendCode()

    expect(screen.getByText('Enter a Nigerian mobile number, like 0803 123 4567.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveAttribute('aria-invalid', 'true')
    expect(called).toBe(false)
  })

  it('asks for a wait without saying anything about the account when rate-limited', async () => {
    server.use(
      http.post(`${API}/auth/otp/request`, () =>
        HttpResponse.json({ code: 'RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': '240' } }),
      ),
    )
    renderLogin()

    await userEvent.type(await phoneInput(), '08031234567')
    await sendCode()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Please wait before asking for another code')
    expect(alert).toHaveTextContent('Try again in 4 minutes.')
    expect(alert.textContent).not.toMatch(/account|registered|exists/i)
  })

  it('offers a retry when the network fails', async () => {
    server.use(http.post(`${API}/auth/otp/request`, () => HttpResponse.error()))
    renderLogin()

    await userEvent.type(await phoneInput(), '08031234567')
    await sendCode()

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't send the code")
  })

  it('keeps next when moving on to the code step', async () => {
    const { router } = renderLogin('/login?next=%2Fsettings')

    await userEvent.type(await phoneInput(), '08031234567')
    await sendCode()

    await screen.findByRole('heading', { level: 1, name: 'Enter the code' })
    expect(router.state.location.pathname + router.state.location.search).toBe('/verify?next=%2Fsettings')
    expect(router.state.location.search).not.toContain('234')
  })
})

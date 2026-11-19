import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { SAMPLE_MEMBER_EMAIL } from '@/mocks/db/auth'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'

const API = import.meta.env.VITE_API_BASE_URL

const renderSignup = (path = '/signup?next=%2Fsettings') => renderWithProviders(routes, { initialPath: path })

const emailInput = () => screen.findByRole('textbox', { name: 'Email' })
const passwordInput = () => screen.getByLabelText('Password')
const submit = () => userEvent.click(screen.getByRole('button', { name: 'Create account' }))

describe('Create an account', () => {
  it('asks only for an email and a new password', async () => {
    renderSignup()

    expect(await screen.findByRole('heading', { level: 1, name: 'Create an account' })).toBeInTheDocument()
    expect(passwordInput()).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.queryByRole('textbox', { name: 'Phone number' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login?next=%2Fsettings')
  })

  it('shows how strong the password is as it is typed, with no rule up front', async () => {
    renderSignup()
    await emailInput()

    expect(screen.queryByText(/Password strength/)).not.toBeInTheDocument()
    expect(screen.queryByText(/8 characters/)).not.toBeInTheDocument()

    await userEvent.type(passwordInput(), 'mango')
    expect(screen.getByText('Keep going: 8 characters or more')).toBeInTheDocument()
    await userEvent.type(passwordInput(), 'es7 at Ikeja')
    expect(screen.getByText('Strong')).toBeInTheDocument()
    // The meter is the field's hint, so screen readers hear it with the field
    const hint = document.getElementById(passwordInput().getAttribute('aria-describedby')!)
    expect(hint).toHaveTextContent('Password strength: Strong')
  })

  it('needs a password of at least 8 characters', async () => {
    renderSignup()

    await userEvent.type(await emailInput(), 'ada@example.com')
    await userEvent.type(passwordInput(), 'short')
    await submit()

    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument()
    expect(passwordInput()).toHaveAttribute('aria-invalid', 'true')
  })

  it('sends the email tidied up, then moves on to the code, keeping next', async () => {
    let body: unknown
    server.use(
      http.post(`${API}/auth/signup`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ resendAfterSeconds: 60 }, { status: 202 })
      }),
    )
    const { router } = renderSignup()

    await userEvent.type(await emailInput(), ' Ada@Example.com ')
    await userEvent.type(passwordInput(), 'correct horse')
    await submit()

    expect(await screen.findByRole('heading', { level: 1, name: 'Check your email' })).toBeInTheDocument()
    expect(body).toEqual({ email: 'ada@example.com', password: 'correct horse' })
    expect(router.state.location.pathname + router.state.location.search).toBe('/verify?next=%2Fsettings')
    expect(router.state.location.search).not.toContain('ada')
  })

  it('answers the same way for an email that already has an account', async () => {
    renderSignup()

    await userEvent.type(await emailInput(), SAMPLE_MEMBER_EMAIL)
    await userEvent.type(passwordInput(), 'correct horse')
    await submit()

    expect(await screen.findByRole('heading', { level: 1, name: 'Check your email' })).toBeInTheDocument()
  })

  it('asks for a wait when rate-limited, without saying anything about the account', async () => {
    server.use(
      http.post(`${API}/auth/signup`, () =>
        HttpResponse.json({ code: 'RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': '240' } }),
      ),
    )
    renderSignup()

    await userEvent.type(await emailInput(), 'ada@example.com')
    await userEvent.type(passwordInput(), 'correct horse')
    await submit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Please wait before asking for another code')
    expect(alert).toHaveTextContent('Wait 4 minutes, then try again.')
    expect(alert.textContent).not.toMatch(/account|registered|exists/i)
  })

  it('offers a retry when the network fails', async () => {
    server.use(http.post(`${API}/auth/signup`, () => HttpResponse.error()))
    renderSignup()

    await userEvent.type(await emailInput(), 'ada@example.com')
    await userEvent.type(passwordInput(), 'correct horse')
    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't send the code")
  })
})

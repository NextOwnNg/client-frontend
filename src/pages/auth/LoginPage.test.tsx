import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { apiClient } from '@/lib/api/client'
import { SAMPLE_MEMBER_EMAIL, SAMPLE_PASSWORD } from '@/mocks/db/auth'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'

const API = import.meta.env.VITE_API_BASE_URL

const renderLogin = (path = '/login?next=%2Fsettings') => renderWithProviders(routes, { initialPath: path })

const emailInput = () => screen.findByRole('textbox', { name: 'Email' })
const passwordInput = () => screen.getByLabelText('Password')
const submit = () => userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
const path = (router: { state: { location: { pathname: string; search: string } } }) =>
  router.state.location.pathname + router.state.location.search

/** The form's banner (a toast from an earlier sign-in can also be an alert). */
const banner = async (text: RegExp) => (await screen.findByText(text)).closest('[role="alert"]')!

async function fillIn(email: string, password: string) {
  await userEvent.type(await emailInput(), email)
  await userEvent.type(passwordInput(), password)
}

describe('Email sign-in', () => {
  it('asks for an email and password, with ways to reset or create an account', async () => {
    renderLogin()

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    expect(passwordInput()).toHaveAttribute('type', 'password')
    expect(passwordInput()).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute(
      'href',
      '/forgot-password?next=%2Fsettings',
    )
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/signup?next=%2Fsettings')
  })

  it('shows and hides the password', async () => {
    renderLogin()
    await userEvent.type(await emailInput(), 'a')

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(passwordInput()).toHaveAttribute('type', 'text')
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(passwordInput()).toHaveAttribute('type', 'password')
  })

  it('checks the fields before sending anything', async () => {
    let called = false
    server.use(
      http.post(`${API}/auth/login`, () => {
        called = true
        return HttpResponse.json({}, { status: 500 })
      }),
    )
    renderLogin()

    await userEvent.type(await emailInput(), 'not-an-email')
    await submit()

    expect(screen.getByText('Enter an email address, like ada@example.com.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(called).toBe(false)
  })

  it('signs a member in and lands on next', async () => {
    const { router } = renderLogin()

    await fillIn(` ${SAMPLE_MEMBER_EMAIL.toUpperCase()} `, SAMPLE_PASSWORD)
    await submit()

    await waitFor(() => expect(path(router)).toBe('/settings'))
  })

  it('says the email and password don’t match, without saying which', async () => {
    renderLogin()

    await fillIn(SAMPLE_MEMBER_EMAIL, 'wrong password')
    await submit()

    const alert = await banner(/That email and password don’t match/)
    expect(alert).toHaveTextContent('Check your email and password')
    expect(alert.textContent).not.toMatch(/registered|exists|no account/i)
  })

  it('asks for a wait after too many tries', async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ code: 'RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': '600' } }),
      ),
    )
    renderLogin()

    await fillIn(SAMPLE_MEMBER_EMAIL, SAMPLE_PASSWORD)
    await submit()

    expect(await banner(/Wait 10 minutes/)).toHaveTextContent('Too many tries')
  })

  it('sends an account whose email was never confirmed on to the code step', async () => {
    await apiClient.post('/auth/signup', { email: 'new@example.com', password: 'correct horse' })
    const { router } = renderLogin()

    await fillIn('new@example.com', 'correct horse')
    await submit()

    expect(await screen.findByRole('heading', { level: 1, name: 'Check your email' })).toBeInTheDocument()
    expect(screen.getByText('new@example.com')).toBeInTheDocument()
    expect(path(router)).toBe('/verify?next=%2Fsettings')
  })

  it('takes a member who hasn’t finished their profile to onboarding', async () => {
    const { signInNewMember } = await import('@/test/auth')
    await signInNewMember('ada@example.com')
    await apiClient.post('/auth/logout')
    const { router } = renderLogin()

    await fillIn('ada@example.com', 'correct horse')
    await submit()

    await waitFor(() => expect(path(router)).toBe('/onboarding?next=%2Fsettings'))
  })

  it('carries the typed email to Create an account', async () => {
    renderLogin()

    await userEvent.type(await emailInput(), 'ada@example.com')
    await userEvent.click(screen.getByRole('link', { name: 'Create an account' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Create an account' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Email/ })).toHaveValue('ada@example.com')
  })
})

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Outlet, useLocation, type RouteObject } from 'react-router'
import { RedirectIfAuthed, RequireAuth } from '@/app/guards'
import { RootLayout } from '@/app/layouts/RootLayout'
import { useUpdateMe } from '@/features/account/api'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { useSessionStore } from '@/stores/session'
import { renderWithProviders } from '@/test/utils'

function Where() {
  const { pathname, search } = useLocation()
  return <p data-testid="where">{pathname + search}</p>
}

const page = (name: string) => () => (
  <>
    <h1>{name}</h1>
    <Where />
  </>
)

const guardRoutes: RouteObject[] = [
  {
    Component: Outlet,
    children: [
      { Component: RequireAuth, children: [{ path: 'settings', Component: page('Settings') }] },
      { element: <RequireAuth allowNew />, children: [{ path: 'onboarding', Component: page('Onboarding') }] },
      { Component: RedirectIfAuthed, children: [{ path: 'login', Component: page('Login') }] },
      { path: 'me', Component: page('Me') },
    ],
  },
]

const member = (onboarded = true) =>
  useSessionStore.getState().setSession({ userId: 'u-1', onboarded, restricted: false })

describe('route guards', () => {
  it('sends a guest to sign in, carrying the page they wanted', async () => {
    useSessionStore.getState().clearSession()
    renderWithProviders(guardRoutes, { initialPath: '/settings' })

    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByTestId('where')).toHaveTextContent('/login?next=%2Fsettings')
  })

  it('waits for the session check instead of redirecting', () => {
    renderWithProviders(guardRoutes, { initialPath: '/settings' })

    expect(screen.getByRole('status', { name: 'Checking your session' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Login' })).not.toBeInTheDocument()
  })

  it('sends a new member to onboarding first', async () => {
    member(false)
    renderWithProviders(guardRoutes, { initialPath: '/settings' })

    expect(await screen.findByRole('heading', { name: 'Onboarding' })).toBeInTheDocument()
    expect(screen.getByTestId('where')).toHaveTextContent('/onboarding?next=%2Fsettings')
  })

  it('lets a member through', async () => {
    member()
    renderWithProviders(guardRoutes, { initialPath: '/settings' })

    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })

  it('moves a signed-in member off the sign-in page to their next page', async () => {
    member()
    renderWithProviders(guardRoutes, { initialPath: '/login?next=%2Fme' })

    expect(await screen.findByRole('heading', { name: 'Me' })).toBeInTheDocument()
  })

  it('ignores an unsafe next on the way out of sign-in', async () => {
    member()
    renderWithProviders([...guardRoutes, { path: '/', Component: page('Home') }], {
      initialPath: '/login?next=%2F%2Fevil.com',
    })

    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument()
  })
})

function RenameForm() {
  const update = useUpdateMe()
  return (
    <button type="button" onClick={() => update.mutate({ displayName: 'Ada' })}>
      Save name
    </button>
  )
}

describe('session expiry', () => {
  const routes: RouteObject[] = [{ Component: RootLayout, children: [{ path: 'settings', Component: RenameForm }] }]

  it('clears the session and offers to sign in again, back to the same page', async () => {
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    renderWithProviders(routes, { initialPath: '/settings' })
    await screen.findByRole('button', { name: 'Save name' })
    await waitForStatus('member')

    mockAuth.expireSession()
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }))

    expect(await screen.findByRole('heading', { name: 'Your session ended' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in again' })).toHaveAttribute('href', '/login?next=%2Fsettings')
    expect(useSessionStore.getState().status).toBe('guest')
  })

  it('does not treat a guest’s session check as an expiry', async () => {
    renderWithProviders(routes, { initialPath: '/settings' })
    await screen.findByRole('button', { name: 'Save name' })
    await waitForStatus('guest')

    expect(screen.queryByRole('heading', { name: 'Your session ended' })).not.toBeInTheDocument()
  })
})

function waitForStatus(status: 'member' | 'guest') {
  return waitFor(() => expect(useSessionStore.getState().status).toBe(status))
}

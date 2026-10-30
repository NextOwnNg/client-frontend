import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PageError, RootError } from '@/app/RouteError'
import { routes } from '@/app/router'
import { renderWithProviders } from '@/test/utils'
import { Outlet, type RouteObject } from 'react-router'

const chunkFailure = () =>
  new TypeError('Failed to fetch dynamically imported module: http://localhost:5173/src/app/layouts/AuthLayout.tsx')

/** A shell with a header link, so a page-level error can be checked for keeping it. */
function appWith(page: Partial<RouteObject>, at: 'root' | 'page' = 'page'): RouteObject[] {
  return [
    {
      ErrorBoundary: RootError,
      children: [
        {
          element: (
            <div>
              <a href="/">NextOwn home</a>
              <Outlet />
            </div>
          ),
          children: [{ ErrorBoundary: PageError, children: [{ path: 'broken', ...(at === 'page' ? page : {}) }] }],
        },
        ...(at === 'root' ? [{ path: 'login', ...page }] : []),
      ],
    },
  ]
}

const reload = vi.fn()

beforeEach(() => {
  sessionStorage.clear()
  reload.mockReset()
  vi.stubGlobal('location', { ...window.location, reload })
})

afterEach(() => vi.unstubAllGlobals())

describe('route errors', () => {
  it('reloads once by itself when a page’s code fails to download', async () => {
    renderWithProviders(
      appWith(
        {
          lazy: () => {
            throw chunkFailure()
          },
        },
        'root',
      ),
      { initialPath: '/login' },
    )

    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
  })

  it('asks before reloading again, instead of looping, when the download fails a second time', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      appWith(
        {
          lazy: () => {
            throw chunkFailure()
          },
        },
        'root',
      ),
      { initialPath: '/login' },
    )
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
    // The reload brings the same failure back
    renderWithProviders(
      appWith(
        {
          lazy: () => {
            throw chunkFailure()
          },
        },
        'root',
      ),
      { initialPath: '/login' },
    )

    expect((await screen.findAllByRole('heading', { name: 'This page didn’t load' })).length).toBeGreaterThan(0)
    expect(reload).toHaveBeenCalledTimes(1)
    await user.click(screen.getAllByRole('button', { name: 'Reload page' }).at(-1)!)
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it('says so when the person is offline, and doesn’t reload into nothing', async () => {
    vi.stubGlobal('navigator', { ...navigator, onLine: false })
    renderWithProviders(
      appWith({
        lazy: () => {
          throw chunkFailure()
        },
      }),
      { initialPath: '/broken' },
    )

    expect(await screen.findByText(/You’re offline/)).toBeInTheDocument()
    expect(reload).not.toHaveBeenCalled()
  })

  it('keeps the app shell around a page that crashes, with a way back', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    function Crash(): never {
      throw new Error('boom')
    }
    renderWithProviders(appWith({ Component: Crash }), { initialPath: '/broken' })

    expect(await screen.findByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'NextOwn home' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the marketplace' })).toHaveAttribute('href', '/')
    expect(reload).not.toHaveBeenCalled()
  })

  it('is wired into the app: at the root, and around the shell’s pages', () => {
    expect(routes[0]!.ErrorBoundary).toBe(RootError)
    const shell = routes[0]!.children![0]!
    expect(shell.children!.map((r) => r.ErrorBoundary)).toEqual([PageError])
  })
})

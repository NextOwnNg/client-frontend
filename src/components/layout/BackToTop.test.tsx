import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/router'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { renderWithProviders } from '@/test/utils'

const scrollTo = vi.fn()

function scrollPage(y: number) {
  act(() => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: y })
    window.dispatchEvent(new Event('scroll'))
  })
}

beforeEach(() => {
  scrollTo.mockReset()
  vi.stubGlobal('scrollTo', scrollTo)
})

afterEach(() => {
  scrollPage(0)
  vi.unstubAllGlobals()
})

describe('back to top', () => {
  it.each(['/', '/explore', '/users/u-chidi', '/saved'])(
    'appears on %s once the reader is well down the list',
    async (path) => {
      mockAuth.signInAs(SAMPLE_MEMBER_ID)
      renderWithProviders(routes, { initialPath: path })
      await screen.findByRole('navigation', { name: 'Main' })

      scrollPage(2000)
      expect(await screen.findByRole('button', { name: 'Back to top' })).toBeInTheDocument()

      scrollPage(100)
      await waitFor(() => expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument())
    },
  )

  it('takes the reader to the top and moves focus there', async () => {
    renderWithProviders(routes, { initialPath: '/explore' })
    await screen.findByRole('navigation', { name: 'Main' })
    scrollPage(2000)

    await userEvent.click(await screen.findByRole('button', { name: 'Back to top' }))

    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
    expect(document.activeElement).toBe(document.getElementById('main'))
  })

  it('stays away from pages without a list', async () => {
    renderWithProviders(routes, { initialPath: '/support' })
    await screen.findByRole('navigation', { name: 'Main' })

    scrollPage(2000)

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument()
  })
})

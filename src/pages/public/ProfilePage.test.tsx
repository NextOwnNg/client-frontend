import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { copy } from '@/lib/copy/copy'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'

const API = import.meta.env.VITE_API_BASE_URL

const renderProfile = (id: string) => renderWithProviders(routes, { initialPath: `/users/${id}` })

describe('Public profile', () => {
  it('shows who they are, explains phone confirmation, and lists only active items', async () => {
    renderProfile('u-chidi')

    expect(await screen.findByRole('heading', { level: 1, name: 'Chidi O.' })).toBeInTheDocument()
    expect(screen.getByText('[Pilot Area] North')).toBeInTheDocument()
    expect(screen.getByText(/^Member since/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Phone confirmed' }))
    expect(screen.getByText(copy.phoneBadgeExplainer)).toBeInTheDocument()

    const list = await screen.findByRole('list', { name: 'Active listings' })
    expect(list).toHaveTextContent('MacBook Air M1')
    expect(list).not.toHaveTextContent(/Xbox/)
    expect(screen.getByRole('heading', { name: /Active listings/ })).toHaveTextContent('3')
  })

  it('keeps a single review from reading like a long record', async () => {
    renderProfile('u-ibrahim')

    await screen.findByRole('heading', { level: 1, name: 'Ibrahim S.' })
    expect(screen.getByText('5.0')).toBeInTheDocument()
    expect(screen.getByText('· 1 review')).toBeInTheDocument()
  })

  it('says when there are no reviews yet', async () => {
    renderProfile('u-amaka')

    await screen.findByRole('heading', { level: 1, name: 'Amaka N.' })
    expect(screen.getByText('No reviews yet')).toBeInTheDocument()
  })

  it('never shows a phone number', async () => {
    const { container } = renderProfile('u-tolu')
    await screen.findByRole('list', { name: 'Active listings' })

    expect(container.textContent).not.toMatch(/\+234|\b0[789][01]\d{8}\b/)
  })

  it('shows a calm empty state when nothing is listed', async () => {
    server.use(
      http.get(`${API}/users/:id/listings`, () => HttpResponse.json({ items: [], nextCursor: null, total: 0 })),
    )
    renderProfile('u-amaka')

    expect(await screen.findByText('No active listings right now')).toBeInTheDocument()
  })

  it('shows not found, unindexed, for an unknown person', async () => {
    renderProfile('u-nobody')

    expect(await screen.findByRole('heading', { name: "We couldn't find that person" })).toBeInTheDocument()
    await waitFor(() =>
      expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow'),
    )
  })

  it('is reachable from a listing’s seller card', async () => {
    renderWithProviders(routes, { initialPath: '/listings/ps5-disc-edition' })

    expect(await screen.findByRole('link', { name: 'See Amaka N.’s profile' })).toHaveAttribute(
      'href',
      '/users/u-amaka',
    )
  })
})

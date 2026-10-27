import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { copy } from '@/lib/copy/copy'
import { renderWithProviders } from '@/test/utils'

async function open(path: string) {
  const utils = renderWithProviders(routes, { initialPath: path })
  const heading = await screen.findByRole('heading', { level: 1 })
  return { ...utils, heading }
}

const canonical = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')

describe('Safety and policy pages (FE-TRU-05, PRD §6.1)', () => {
  it.each([
    ['/support', 'Safety and help'],
    ['/how-it-works', 'How it works'],
    ['/community-rules', 'Community rules'],
    ['/terms', 'Terms'],
    ['/privacy', 'Privacy'],
  ])('%s is public, with a responsive heading, title and canonical', async (path, title) => {
    const { heading } = await open(path)

    expect(heading).toHaveTextContent(title)
    expect(heading).toHaveClass('text-h2', 'tablet:text-h1')
    await waitFor(() => expect(document.title).toBe(`${title} · NextOwn`))
    expect(canonical()).toMatch(new RegExp(`${path}$`))
  })

  it('labels Terms and Privacy as pilot drafts awaiting legal review', async () => {
    await open('/terms')
    expect(screen.getByText(/^Pilot draft\. The full terms are being prepared/)).toBeInTheDocument()
  })

  it('has the prohibited items under an anchor the rest of the app links to', async () => {
    await open('/community-rules')

    const prohibited = screen.getByRole('region', { name: 'Prohibited items' })
    expect(prohibited).toHaveAttribute('id', 'prohibited')
    expect(within(prohibited).getByText(/Stolen goods/)).toBeInTheDocument()
  })

  it('guides safe meetings and points to reports and appeals, with what support can’t do', async () => {
    await open('/support')

    expect(screen.getByRole('heading', { name: 'Meeting safely' })).toBeInTheDocument()
    expect(screen.getByText(copy.handoverNotice)).toBeInTheDocument()
    expect(screen.getByText(copy.supportLimit)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My reports' })).toHaveAttribute('href', '/me/reports')
    expect(screen.getByRole('link', { name: 'Ask for a review' })).toHaveAttribute('href', '/appeal')
  })
})

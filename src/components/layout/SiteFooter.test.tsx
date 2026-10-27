import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { runtimeConfig } from '@/mocks/fixtures/config'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'

const footer = async () => {
  renderWithProviders(routes, { initialPath: '/' })
  await screen.findByRole('navigation', { name: 'Contact support' })
  return screen.getByRole('contentinfo')
}

describe('Site footer', () => {
  it('lists support contacts and hours from config', async () => {
    const contact = within(await footer()).getByRole('navigation', { name: 'Contact support' })

    expect(await within(contact).findByRole('link', { name: 'support@nextown.example' })).toHaveAttribute(
      'href',
      'mailto:support@nextown.example',
    )
    expect(within(contact).getByRole('link', { name: 'WhatsApp us' })).toHaveAttribute(
      'href',
      'https://wa.me/2340000000000',
    )
    expect(within(contact).getByRole('link', { name: '+234 000 000 0000' })).toHaveAttribute(
      'href',
      'tel:+2340000000000',
    )
    expect(within(contact).getByText('Mon to Sat, 9am to 6pm WAT')).toBeInTheDocument()
    expect(within(contact).getByText(/use Report there: it gets a case reference/)).toBeInTheDocument()
  })

  it('links each social channel, named for screen readers and opening in a new tab', async () => {
    const channels = await within(await footer()).findByRole('list', { name: 'NextOwn on social media' })
    const instagram = within(channels).getByRole('link', { name: 'Instagram: @nextown (opens in a new tab)' })

    expect(within(channels).getAllByRole('link')).toHaveLength(4)
    expect(instagram).toHaveAttribute('target', '_blank')
    expect(instagram).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('keeps the help and legal links', async () => {
    const help = within(await footer()).getByRole('navigation', { name: 'Help' })

    expect(within(help).getByRole('link', { name: 'Safety and help' })).toHaveAttribute('href', '/support')
    expect(screen.getByRole('navigation', { name: 'Legal' })).toHaveTextContent('Terms')
  })

  it('shows only what config provides: no contacts or channels, no empty rows', async () => {
    server.use(
      http.get('*/config', () => HttpResponse.json({ ...runtimeConfig, support: undefined, social: undefined })),
    )
    const contact = within(await footer()).getByRole('navigation', { name: 'Contact support' })

    expect(within(contact).queryAllByRole('link')).toHaveLength(0)
    expect(
      within(contact).getByText('To reach support, use Report on the listing, chat or deal: it gets a case reference.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'NextOwn on social media' })).not.toBeInTheDocument()
  })
})

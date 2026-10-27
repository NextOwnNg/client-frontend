import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { copy } from '@/lib/copy/copy'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { messagesDb, mockMessages } from '@/mocks/db/messages'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'

const API = import.meta.env.VITE_API_BASE_URL

async function openThread(path = '/messages/m-xbox') {
  const utils = renderWithProviders(routes, { initialPath: path })
  await screen.findByRole('heading', { level: 1, name: /Chidi O\./ })
  return utils
}

const log = () => screen.getByRole('list', { name: 'Messages' })

async function send(text: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Message'), text)
  await user.click(screen.getByRole('button', { name: 'Send' }))
}

beforeEach(() => mockAuth.signInAs(SAMPLE_MEMBER_ID))

describe('Conversation (FE-MSG-01..06, UX-20)', () => {
  it('opens from an offer, with the item, the other person and the notice', async () => {
    const { router } = renderWithProviders(routes, { initialPath: '/messages?offer=o-xbox-accepted' })

    await waitFor(() => expect(router.state.location.pathname).toBe('/messages/m-xbox'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Chidi O.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xbox Series X · 1TB' })).toHaveAttribute('href', '/listings/xbox-series-x')
    expect(screen.getByText(copy.chatNote)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Report this conversation/ })).toBeInTheDocument()
  })

  it('shows offers as structured cards that open the offer, never as text (ruling R6-6)', async () => {
    await openThread()

    const cards = within(log()).getAllByRole('region', { name: /^Offer, version/ })
    expect(cards).toHaveLength(3)
    expect(within(cards[2]!).getByText('Accepted')).toBeInTheDocument()
    expect(within(cards[2]!).getByText('You pay ₦570,000 to receive the Xbox Series X · 1TB.')).toBeInTheDocument()
    expect(within(cards[2]!).getByRole('link', { name: 'Open offer' })).toHaveAttribute(
      'href',
      '/offers/o-xbox-accepted',
    )
    expect(within(cards[0]!).getByText('Earlier version')).toBeInTheDocument()
    expect(within(cards[0]!).queryByRole('link')).not.toBeInTheDocument()
    expect(within(log()).getByRole('link', { name: 'View the deal' })).toHaveAttribute(
      'href',
      '/transactions/t-o-xbox-accepted',
    )
  })

  it('sends a message: Sending, then Sent', async () => {
    await openThread()

    await send('See you at 3 by the main entrance')

    expect(within(log()).getByText('See you at 3 by the main entrance')).toBeInTheDocument()
    await waitFor(() => expect(within(log()).getAllByText(/^Sent ·/).length).toBeGreaterThan(0))
    expect(within(log()).queryByText('Sending…')).not.toBeInTheDocument()
  })

  it('retries a message whose answer was lost, and shows it once (FE-MSG-02)', async () => {
    const user = userEvent.setup()
    // The server stores the message, then the answer never arrives
    server.use(
      http.post(
        `${API}/conversations/:id/messages`,
        async ({ request }) => {
          const { clientId, body } = (await request.json()) as { clientId: string; body: string }
          messagesDb.send(messagesDb.get('m-xbox', SAMPLE_MEMBER_ID)!, SAMPLE_MEMBER_ID, clientId, body)
          return HttpResponse.json({ code: 'SERVER_ERROR' }, { status: 503 })
        },
        { once: true },
      ),
    )
    await openThread()

    await send('Bringing the HDMI cable')
    expect(await within(log()).findByText('Not sent.')).toBeInTheDocument()
    await user.click(within(log()).getByRole('button', { name: 'Retry' }))

    await waitFor(() => expect(within(log()).queryByText('Not sent.')).not.toBeInTheDocument())
    expect(within(log()).getAllByText('Bringing the HDMI cable')).toHaveLength(1)
    const stored = messagesDb.detail(messagesDb.get('m-xbox', SAMPLE_MEMBER_ID)!, SAMPLE_MEMBER_ID).messages
    expect(stored.filter((m) => m.body === 'Bringing the HDMI cable')).toHaveLength(1)
  })

  it('renders message text as plain text (FE-MSG-04)', async () => {
    await openThread()

    await send('<img src=x onerror=alert(1)> https://example.com/averyveryveryverylongwordwithoutanyspaces')

    expect(await within(log()).findByText(/<img src=x onerror=alert\(1\)>/)).toBeInTheDocument()
    expect(log().querySelector('img')).toBeNull()
    expect(within(log()).queryByRole('link', { name: /example\.com/ })).not.toBeInTheDocument()
  })

  it('announces a new message from the other person (FE-MSG-05)', async () => {
    const { queryClient } = await openThread()

    mockMessages.otherPartyReplies('m-xbox', 'Are you free tomorrow at 4?')
    await queryClient.invalidateQueries({ queryKey: ['conversations', 'one', 'm-xbox'] })

    expect(await within(log()).findByText('Are you free tomorrow at 4?')).toBeInTheDocument()
    await waitFor(() =>
      expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(
        'New message from Chidi O.: Are you free tomorrow at 4?',
      ),
    )
  })

  it('shows moderated messages as placeholders', async () => {
    await openThread()
    expect(within(log()).getByText('This message was removed by moderators.')).toBeInTheDocument()
  })

  it('replaces the composer with a notice once blocked, keeping the history (FE-MSG-06)', async () => {
    mockMessages.toggleBlockedByOther('m-xbox')
    await openThread()

    expect(screen.getByText(/You can’t send messages in this conversation/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Message')).not.toBeInTheDocument()
    expect(within(log()).getByText(/Both controllers are charged/)).toBeInTheDocument()
  })

  it('says where the deal stands once it has ended', async () => {
    renderWithProviders(routes, { initialPath: '/messages?transaction=t-o-ipad-completed' })
    expect(await screen.findByText(/You both confirmed this exchange/)).toBeInTheDocument()
  })

  it('doesn’t reveal someone else’s conversation', async () => {
    mockAuth.signInAs('u-zainab')
    renderWithProviders(routes, { initialPath: '/messages/m-xbox' })

    expect(await screen.findByRole('heading', { name: 'We couldn’t find that conversation' })).toBeInTheDocument()
  })
})

describe('Messages inbox', () => {
  it('lists conversations with unread counts, cleared by reading', async () => {
    const user = userEvent.setup()
    renderWithProviders(routes, { initialPath: '/messages' })

    const list = await screen.findByRole('list', { name: 'Conversations' })
    const macbook = within(list).getByRole('link', { name: /iPhone 12 Pro · 128GB/ })
    expect(macbook).toHaveTextContent('1 unread')
    expect(macbook).toHaveTextContent('Hi Tolu, is Face ID still working on the iPhone?')

    await user.click(macbook)
    await screen.findByRole('heading', { level: 1, name: 'Chidi O.' })
    await waitFor(() =>
      expect(within(list).getByRole('link', { name: /iPhone 12 Pro · 128GB/ })).not.toHaveTextContent('unread'),
    )
  })

  it('opens from the offer page', async () => {
    renderWithProviders(routes, { initialPath: '/offers/o-ps4-counter' })
    expect(await screen.findByRole('link', { name: 'Message Ibrahim S.' })).toHaveAttribute(
      'href',
      '/messages?offer=o-ps4-counter',
    )
  })
})

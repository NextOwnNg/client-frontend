import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { copy } from '@/lib/copy/copy'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { feedDb, mockFeed } from '@/mocks/db/feed'
import { listingsDb } from '@/mocks/db/listings'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import type { FeedPost, Paginated } from '@/types/api'

const API = import.meta.env.VITE_API_BASE_URL

async function openFeed(path = '/feed') {
  const utils = renderWithProviders(routes, { initialPath: path })
  await screen.findByRole('heading', { level: 1, name: 'Feed' })
  return utils
}

const post = async (title: string) => screen.findByRole('article', { name: title })
const posts = () => within(screen.getByRole('list', { name: 'Posts' })).getAllByRole('article')

describe('Feed (FE-FED-01..07, UX-05)', () => {
  // The feed is public: these tests run as a guest
  beforeEach(() => mockAuth.reset())

  it('shows each post with its listing’s live price, and a way to the marketplace', async () => {
    await openFeed()

    const macbook = await post('MacBook Air M1, 2020')
    expect(within(macbook).getByText('Chidi O.')).toBeInTheDocument()
    expect(within(macbook).getByText(/Upgraded for work/)).toBeInTheDocument()
    expect(within(macbook).getByRole('link', { name: 'View item' })).toHaveAttribute(
      'href',
      '/listings/macbook-air-m1-2020-gold',
    )
    expect(within(macbook).getByRole('link', { name: 'Make an offer' })).toHaveAttribute(
      'href',
      '/offers/new?listing=l2',
    )
    expect(screen.getAllByRole('link', { name: 'Explore marketplace' })[0]).toHaveAttribute('href', '/explore')
  })

  it('shows a reserved item as reserved, with no offer button (QA-07)', async () => {
    listingsDb.setStatus('l2', 'RESERVED')
    await openFeed()

    const macbook = await post('MacBook Air M1, 2020')
    expect(within(macbook).getByText('Reserved')).toBeInTheDocument()
    expect(within(macbook).getByText('Not accepting offers')).toBeInTheDocument()
    expect(within(macbook).queryByRole('link', { name: 'Make an offer' })).not.toBeInTheDocument()
  })

  it('loads more without repeating a post, then says it’s the end', async () => {
    const user = userEvent.setup()
    // Something new is posted between pages, so the second page starts with a post already shown
    let calls = 0
    server.use(
      http.get(`${API}/feed`, ({ request }) => {
        calls += 1
        const second = new URL(request.url).searchParams.get('cursor')
        // The second page starts one post early, overlapping the first
        return HttpResponse.json<Paginated<FeedPost>>(
          second ? { ...feedDb.page(4, 5), nextCursor: null } : feedDb.page(0, 5),
        )
      }),
    )
    await openFeed()
    await post('Nintendo Switch with dock')

    await user.click(await screen.findByRole('button', { name: 'Load more posts' }))

    await screen.findByText('You’re all caught up.')
    const ids = posts().map((a) => a.getAttribute('aria-labelledby'))
    expect(ids).toHaveLength(9)
    expect(new Set(ids).size).toBe(ids.length)
    expect(calls).toBe(2)
  })

  it('tells the post apart when its listing was removed', async () => {
    const user = userEvent.setup()
    await openFeed()
    await user.click(await screen.findByRole('button', { name: 'Load more posts' }))

    expect((await screen.findAllByText('This post is no longer available')).length).toBeGreaterThan(0)
  })

  it('has an empty state that still leads to the marketplace', async () => {
    server.use(http.get(`${API}/feed`, () => HttpResponse.json({ items: [], nextCursor: null })))
    await openFeed()

    expect(await screen.findByRole('heading', { name: 'Nothing in the feed yet' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Explore marketplace' }).length).toBeGreaterThan(1)
  })
})

describe('Comments (FE-FED-03, UX-06)', () => {
  it('lists comments newest first with the note, and shows removed ones as placeholders', async () => {
    const user = userEvent.setup()
    await openFeed()

    await user.click(within(await post('Nintendo Switch with dock')).getByRole('button', { name: /Comments/ }))

    const sheet = await screen.findByRole('dialog', { name: 'Comments' })
    expect(within(sheet).getByText(copy.commentsNote)).toBeInTheDocument()
    const list = await within(sheet).findByRole('list', { name: 'Comments, newest first' })
    const items = within(list).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('This comment was removed by moderators.')
    expect(items[2]).toHaveTextContent('Does it come with both Joy-Cons')
  })

  it('asks a guest to sign in instead of showing the composer', async () => {
    await openFeed('/feed?post=p-switch')

    const sheet = await screen.findByRole('dialog', { name: 'Comments' })
    const signIn = within(sheet).getByRole('link', { name: 'Sign in to comment' })
    expect(signIn).toHaveAttribute('href', `/login?next=${encodeURIComponent('/feed?post=p-switch')}`)
    expect(within(sheet).queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('posts a comment as plain text, and keeps the draft when told to slow down', async () => {
    const user = userEvent.setup()
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    await openFeed('/feed?post=p-switch')
    const sheet = await screen.findByRole('dialog', { name: 'Comments' })

    await user.type(within(sheet).getByLabelText('Add a comment'), '<b>Is it still available?</b>')
    await user.click(within(sheet).getByRole('button', { name: 'Post' }))
    const list = await within(sheet).findByRole('list', { name: 'Comments, newest first' })
    await waitFor(() =>
      expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent('<b>Is it still available?</b>'),
    )
    expect(sheet.querySelector('b')).toBeNull()

    mockFeed.rateLimitNextComment()
    await user.type(within(sheet).getByLabelText('Add a comment'), 'Another one')
    await user.click(within(sheet).getByRole('button', { name: 'Post' }))
    expect(
      await within(sheet).findByText(
        'Your comment wasn’t posted. That’s a lot in a short time. Wait a minute, then try again.',
      ),
    ).toBeInTheDocument()
    expect(within(sheet).getByLabelText('Add a comment')).toHaveValue('Another one')
  })
})

describe('Sharing a listing (FE-FED-06)', () => {
  it('says beside the choice when a listing was already shared', async () => {
    const user = userEvent.setup()
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    await openFeed()

    await user.click(await screen.findByRole('button', { name: 'Share a listing' }))
    const sheet = await screen.findByRole('dialog', { name: 'Share a listing' })
    await user.click(await within(sheet).findByRole('radio', { name: /iPhone 12 Pro · 128GB/ }))
    await user.type(within(sheet).getByLabelText('Caption'), 'Again')
    await user.click(within(sheet).getByRole('button', { name: 'Share to the feed' }))

    expect(await within(sheet).findByText('You’ve already shared this listing. Choose another.')).toBeInTheDocument()
  })

  it('offers only the member’s active listings and puts the post at the top', async () => {
    const user = userEvent.setup()
    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    await openFeed()

    await user.click(await screen.findByRole('button', { name: 'Share a listing' }))
    const sheet = await screen.findByRole('dialog', { name: 'Share a listing' })
    const choices = await within(sheet).findAllByRole('radio')
    expect(choices.map((c) => c.closest('label')?.textContent)).not.toContainEqual(
      expect.stringContaining('PS4 DualShock'),
    )

    await user.click(within(sheet).getByRole('radio', { name: /MacBook Air M1 · Space Grey/ }))
    await user.type(within(sheet).getByLabelText('Caption'), 'Space Grey, barely used')
    await user.click(within(sheet).getByRole('button', { name: 'Share to the feed' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Share a listing' })).not.toBeInTheDocument())
    await waitFor(() => expect(posts()[0]).toHaveAccessibleName('MacBook Air M1 · Space Grey'))
  })
})

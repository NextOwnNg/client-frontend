import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/router'
import { apiClient } from '@/lib/api/client'
import { copy } from '@/lib/copy/copy'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { mockListings } from '@/mocks/db/listings'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import type * as Compress from '@/lib/images/compress'
import type { ListingInput, MediaRef, OwnListing } from '@/types/api'

vi.mock('@/lib/images/compress', async (original) => ({
  ...(await original<typeof Compress>()),
  preparePhoto: (file: File) => Promise.resolve({ blob: file, width: 1600, height: 1200 }),
}))

const path = (router: { state: { location: { pathname: string; search: string } } }) =>
  router.state.location.pathname + router.state.location.search

async function uploadedPhoto() {
  const form = new FormData()
  form.append('file', new File([new Uint8Array(100)], 'p.jpg', { type: 'image/jpeg' }))
  return (await apiClient.post<MediaRef>('/media', form)).data
}

async function seedDraft(input: Partial<ListingInput>) {
  const { data } = await apiClient.post<OwnListing>('/listings', input)
  return data
}

async function openWizard(target: string) {
  const utils = renderWithProviders(routes, { initialPath: target })
  await screen.findByRole('heading', { level: 1 })
  return utils
}

const continueButton = () => screen.getByRole('button', { name: 'Continue' })

beforeEach(() => mockAuth.signInAs(SAMPLE_MEMBER_ID))

describe('Listing wizard: steps and drafts', () => {
  it('starts on photos and basics, with the step in the URL', async () => {
    const { router } = await openWizard('/listings/new')

    expect(screen.getByRole('heading', { level: 1, name: 'List an item' })).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
    expect(path(router)).toBe('/listings/new')
  })

  it('checks only the current step on Continue, with a summary that leads to each problem', async () => {
    await openWizard('/listings/new')

    await userEvent.click(continueButton())

    const summary = await screen.findByRole('alert')
    expect(summary).toHaveFocus()
    expect(
      within(summary).getByRole('button', { name: 'Add at least 1 photo of the actual item.' }),
    ).toBeInTheDocument()
    expect(within(summary).getByRole('button', { name: 'Choose a category.' })).toBeInTheDocument()
    expect(within(summary).queryByText(/condition/i)).not.toBeInTheDocument()
  })

  it('creates a draft on the first change, then keeps saving it', async () => {
    const { router } = await openWizard('/listings/new')

    await userEvent.type(screen.getByRole('textbox', { name: 'Title' }), 'Galaxy S21')

    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/listings\/l-.+\/edit$/), { timeout: 3000 })
    expect(await screen.findByText('Draft saved')).toBeInTheDocument()
    const id = router.state.location.pathname.split('/')[2]!
    await waitFor(async () =>
      expect((await apiClient.get<OwnListing>(`/me/listings/${id}`)).data.title).toBe('Galaxy S21'),
    )
  })

  it('keeps a photo that was still uploading when the draft was created', async () => {
    server.use(
      http.post('/api/media', async () => {
        await delay(1800)
        return undefined
      }),
    )
    const { router } = await openWizard('/listings/new')

    await userEvent.upload(
      screen.getByLabelText('Add photos', { selector: 'input' }),
      new File([new Uint8Array(100)], 'front.jpg', { type: 'image/jpeg' }),
    )
    await userEvent.type(screen.getByRole('textbox', { name: 'Title' }), 'Galaxy S21')
    await waitFor(() => expect(router.state.location.pathname).toMatch(/\/edit$/), { timeout: 3000 })

    const id = router.state.location.pathname.split('/')[2]!
    await waitFor(
      async () => expect((await apiClient.get<OwnListing>(`/me/listings/${id}`)).data.photos).toHaveLength(1),
      { timeout: 5000 },
    )
  })

  it('brings a draft back after a reload', async () => {
    const draft = await seedDraft({ title: 'Galaxy S21', categoryId: 'phones' })

    await openWizard(`/listings/${draft.id}/edit`)

    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Galaxy S21')
    expect(screen.getByRole('radio', { name: /Phones/ })).toBeChecked()
  })

  it('says when a save fails, keeps the values, and retries', async () => {
    const draft = await seedDraft({ title: 'Galaxy' })
    server.use(http.patch('/api/listings/:id', () => HttpResponse.error(), { once: true }))
    await openWizard(`/listings/${draft.id}/edit`)

    await userEvent.type(screen.getByRole('textbox', { name: 'Title' }), ' S21')

    expect(await screen.findByText('Couldn’t save', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Galaxy S21')
    await userEvent.click(screen.getByRole('button', { name: 'Retry save' }))
    expect(await screen.findByText('Draft saved')).toBeInTheDocument()
  })

  it('shows the chosen category’s own fields, with "Not known" where allowed', async () => {
    const draft = await seedDraft({ title: 'Galaxy S21' })
    await openWizard(`/listings/${draft.id}/edit`)

    await userEvent.click(screen.getByRole('radio', { name: /Phones/ }))
    const storage = screen.getByRole('combobox', { name: 'Storage' })
    expect(within(storage).getByRole('option', { name: 'Not known' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Battery health' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: /Home/ }))
    expect(screen.queryByRole('combobox', { name: 'Storage' })).not.toBeInTheDocument()
  })

  it('moves between steps with Continue and Back', async () => {
    const photo = await uploadedPhoto()
    const draft = await seedDraft({
      title: 'Galaxy S21',
      categoryId: 'home',
      photos: [photo],
    })
    const { router } = await openWizard(`/listings/${draft.id}/edit`)

    await userEvent.click(continueButton())
    await waitFor(() => expect(path(router)).toBe(`/listings/${draft.id}/edit?step=condition`))
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    await waitFor(() => expect(path(router)).toBe(`/listings/${draft.id}/edit`))
  })

  it('treats "No defects to disclose" and a defect list as either-or', async () => {
    const draft = await seedDraft({ title: 'Galaxy S21' })
    await openWizard(`/listings/${draft.id}/edit?step=condition`)

    expect(screen.getByRole('textbox', { name: 'Defects' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: 'No defects to disclose' }))
    expect(screen.queryByRole('textbox', { name: 'Defects' })).not.toBeInTheDocument()
  })

  it('tells the owner of a reserved listing that agreed terms won’t change', async () => {
    mockAuth.signInAs('u-chidi')
    await openWizard('/listings/l10/edit')

    expect(screen.getByText('This item is reserved')).toBeInTheDocument()
    expect(screen.getByText(/won’t change the terms already agreed/)).toBeInTheDocument()
  })

  it('blocks a restricted member from listing, with the appeal path', async () => {
    mockAuth.setRestricted(true)
    renderWithProviders(routes, { initialPath: '/listings/new' })

    expect(await screen.findByText('Your account can’t list items right now')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument()
  })
})

describe('Listing wizard: trade options', () => {
  async function openTrade(input: Partial<ListingInput> = {}) {
    const draft = await seedDraft({ title: 'Galaxy S21', ...input })
    await openWizard(`/listings/${draft.id}/edit?step=trade`)
    return draft
  }

  it('asks for a price for cash, and a wish or "Open to offers" for swaps', async () => {
    await openTrade()

    await userEvent.click(screen.getByRole('radio', { name: /Sell for cash/ }))
    expect(screen.getByRole('textbox', { name: 'Asking price' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'What would you like in a swap?' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: /^Swap/ }))
    expect(screen.queryByRole('textbox', { name: 'Asking price' })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'What would you like in a swap?' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Open to offers/ })).toBeInTheDocument()
  })

  it('keeps focus on the choice when the fields below change', async () => {
    await openTrade()
    const both = screen.getByRole('radio', { name: /Sell or swap/ })

    await userEvent.click(both)
    expect(both).toHaveFocus()
  })

  it('refuses ₦0, a swap with no wish, and Quick Sell without a deadline', async () => {
    await openTrade({ modes: ['CASH', 'SWAP'], askingKobo: 0, quickSell: true, areaId: 'central' })

    await userEvent.click(continueButton())

    const summary = await screen.findByRole('alert')
    expect(summary).toHaveTextContent('Enter an asking price above ₦0.')
    expect(summary).toHaveTextContent('Say what you’d like in a swap, or tick “Open to offers”.')
    expect(summary).toHaveTextContent('Choose how long Quick Sell runs.')
  })

  it('shows the Quick Sell end time in WAT and the honest note', async () => {
    await openTrade({ modes: ['CASH'], askingKobo: 10_000_000 })

    await userEvent.click(screen.getByRole('checkbox', { name: 'Use Quick Sell' }))
    await userEvent.click(screen.getByRole('radio', { name: '48 hours' }))

    expect(screen.getByText(copy.quickSellNote)).toBeInTheDocument()
    expect(screen.getByText(/If you publish now, it ends .* WAT\./)).toBeInTheDocument()
  })
})

describe('Listing wizard: preview and publish', () => {
  async function completeDraft(title = 'Galaxy S21 · 128GB') {
    const photo = await uploadedPhoto()
    return seedDraft({
      title,
      categoryId: 'phones',
      categoryFields: { storage: '128GB', battery: '88' },
      photos: [photo],
      condition: 'GOOD',
      defects: ['Small scratch on the back'],
      repairs: 'None',
      accessories: 'Box and cable',
      ownershipConfirmed: true,
      modes: ['CASH'],
      askingKobo: 25_000_000,
      areaId: 'central',
    })
  }

  it('shows the real listing page with an Edit link for each section', async () => {
    const draft = await completeDraft()
    await openWizard(`/listings/${draft.id}/edit?step=preview`)

    expect(screen.getByText('Preview: this is how buyers will see your listing')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Galaxy S21 · 128GB' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Condition and defects' })).toBeInTheDocument()
    expect(screen.getByText('₦250,000')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit condition and defects' })).toHaveAttribute(
      'href',
      `/listings/${draft.id}/edit?step=condition`,
    )
    expect(screen.getByRole('link', { name: 'Edit photos' })).toHaveAttribute('href', `/listings/${draft.id}/edit`)
  })

  it('publishes for review and says what happens next', async () => {
    const draft = await completeDraft()
    await openWizard(`/listings/${draft.id}/edit?step=preview`)

    await userEvent.click(screen.getAllByRole('button', { name: 'Publish listing' })[0]!)

    expect(await screen.findByRole('heading', { name: 'Your listing is being reviewed' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to My listings' })).toHaveAttribute('href', '/me/listings?tab=active')
  })

  it('says when a listing goes live straight away', async () => {
    mockListings.publishLive(true)
    const draft = await completeDraft()
    await openWizard(`/listings/${draft.id}/edit?step=preview`)

    await userEvent.click(screen.getAllByRole('button', { name: 'Publish listing' })[0]!)

    expect(await screen.findByRole('heading', { name: 'Your listing is live' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View listing' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/listings\/galaxy-s21/),
    )
  })

  it('lists what is still missing, each linked to its step', async () => {
    const draft = await seedDraft({ title: 'Galaxy S21', categoryId: 'home' })
    const { router } = await openWizard(`/listings/${draft.id}/edit?step=preview`)

    await userEvent.click(screen.getAllByRole('button', { name: 'Publish listing' })[0]!)

    const summary = await screen.findByRole('alert')
    const conditionLink = within(summary).getByRole('button', { name: 'Condition: Choose the item’s condition.' })
    expect(within(summary).getByRole('button', { name: /Photos and basics: Add at least 1 photo/ })).toBeInTheDocument()
    await userEvent.click(conditionLink)
    await waitFor(() => expect(router.state.location.search).toBe('?step=condition'))
  })

  it('shows the server’s reasons when it refuses to publish', async () => {
    server.use(
      http.post('/api/listings/:id/publish', () =>
        HttpResponse.json(
          { code: 'VALIDATION_ERROR', field_errors: { title: 'That title isn’t allowed.' } },
          { status: 422 },
        ),
      ),
    )
    const draft = await completeDraft()
    await openWizard(`/listings/${draft.id}/edit?step=preview`)

    await userEvent.click(screen.getAllByRole('button', { name: 'Publish listing' })[0]!)

    expect(
      await screen.findByRole('button', { name: 'Photos and basics: That title isn’t allowed.' }),
    ).toBeInTheDocument()
  })

  it('refuses a second listing of the same item, with a way to the first', async () => {
    const first = await completeDraft()
    await apiClient.post(`/listings/${first.id}/publish`)
    const second = await completeDraft()
    await openWizard(`/listings/${second.id}/edit?step=preview`)

    await userEvent.click(screen.getAllByRole('button', { name: 'Publish listing' })[0]!)

    expect(await screen.findByText('You already have this item listed')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit it instead' })).toHaveAttribute('href', `/listings/${first.id}/edit`)
  })

  it('saves changes to a published listing and returns to My listings', async () => {
    const { router } = await openWizard('/listings/l1/edit?step=trade')

    expect(screen.getByRole('heading', { level: 1, name: 'Edit listing' })).toBeInTheDocument()
    const price = screen.getByRole('textbox', { name: 'Asking price' })
    await userEvent.clear(price)
    await userEvent.type(price, '360000')
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()

    await userEvent.click(continueButton())
    await userEvent.click(screen.getAllByRole('button', { name: 'Save changes' })[0]!)

    await waitFor(() => expect(path(router)).toBe('/me/listings?tab=active'))
    expect((await apiClient.get<OwnListing>('/me/listings/l1')).data.askingKobo).toBe(36_000_000)
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PhotoUploader } from '@/features/selling/components/PhotoUploader'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { server } from '@/test/msw/server'
import type * as Compress from '@/lib/images/compress'
import type { MediaRef } from '@/types/api'

vi.mock('@/lib/images/compress', async (original) => ({
  ...(await original<typeof Compress>()),
  // jsdom has no canvas: hand the file straight through
  preparePhoto: (file: File) => Promise.resolve({ blob: file, width: 1600, height: 1200 }),
}))

const API = '/api'
const photo = (name: string, type = 'image/jpeg') => new File([new Uint8Array(500)], name, { type })
const existing = (n: number): MediaRef => ({ id: `m-${n}`, url: `/p${n}.jpg`, alt: `Photo ${n}`, width: 4, height: 3 })

function Harness({ initial = [], max = 8 }: { initial?: MediaRef[]; max?: number }) {
  const [photos, setPhotos] = useState(initial)
  return (
    <QueryClientProvider client={new QueryClient()}>
      <PhotoUploader value={photos} onChange={setPhotos} limits={{ min: 1, max }} itemName="Galaxy S21" />
      <output data-testid="order">{photos.map((p) => p.id).join(',')}</output>
    </QueryClientProvider>
  )
}

const order = () => screen.getByTestId('order').textContent
const fileInput = () => screen.getByLabelText('Add photos', { selector: 'input' })

beforeEach(() => mockAuth.signInAs(SAMPLE_MEMBER_ID))

describe('Photo uploader', () => {
  it('shows the photo tips', () => {
    render(<Harness />)
    expect(screen.getByText('Use photos of the actual item. Include its defects and any repairs.')).toBeInTheDocument()
  })

  it('shows upload progress, then adds the photos in order with the first as cover', async () => {
    server.use(
      http.post(`${API}/media`, async () => {
        await delay(60)
        return undefined
      }),
    )
    render(<Harness />)

    await userEvent.upload(fileInput(), [photo('a.jpg'), photo('b.jpg')])

    expect(await screen.findAllByRole('progressbar')).not.toHaveLength(0)
    await waitFor(() => expect(order().split(',')).toHaveLength(2))
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Cover')
    expect(screen.getByText('2 of 8 photos')).toBeInTheDocument()
  })

  it('makes another photo the cover and reorders with the photo menu', async () => {
    render(<Harness initial={[existing(1), existing(2), existing(3)]} />)

    await userEvent.click(screen.getByRole('button', { name: 'Photo 3 options' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Make cover' }))
    expect(order()).toBe('m-3,m-1,m-2')

    await userEvent.click(screen.getByRole('button', { name: 'Photo 2 options' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Move later' }))
    expect(order()).toBe('m-3,m-2,m-1')

    await userEvent.click(screen.getByRole('button', { name: 'Photo 1 options' }))
    expect(screen.queryByRole('menuitem', { name: 'Move earlier' })).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Remove' }))
    expect(order()).toBe('m-2,m-1')
  })

  it('stops at the photo limit', () => {
    render(<Harness initial={[existing(1), existing(2)]} max={2} />)

    expect(screen.getByText('2 of 2 photos')).toBeInTheDocument()
    expect(fileInput()).toBeDisabled()
  })

  it('takes only as many new photos as fit', async () => {
    render(<Harness initial={[existing(1)]} max={2} />)

    await userEvent.upload(fileInput(), [photo('a.jpg'), photo('b.jpg'), photo('c.jpg')])

    expect(await screen.findByText('Only 1 more photo fits, so the rest weren’t added.')).toBeInTheDocument()
    await waitFor(() => expect(order().split(',')).toHaveLength(2))
  })

  it('refuses an unsupported file and still uploads the rest', async () => {
    render(<Harness />)

    await userEvent.upload(fileInput(), [photo('scan.heic', 'image/heic'), photo('a.jpg')], { applyAccept: false })

    expect(
      await screen.findByText('scan.heic: this file type isn’t supported. Use JPG, PNG or WebP.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(order().split(',').filter(Boolean)).toHaveLength(1))
  })

  it('offers a retry when an upload fails, and the retry succeeds', async () => {
    server.use(http.post(`${API}/media`, () => HttpResponse.error(), { once: true }))
    render(<Harness />)

    await userEvent.upload(fileInput(), [photo('a.jpg')])

    const failed = await screen.findByRole('listitem', { name: /Upload failed/ })
    await userEvent.click(within(failed).getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(order().split(',').filter(Boolean)).toHaveLength(1))
  })
})

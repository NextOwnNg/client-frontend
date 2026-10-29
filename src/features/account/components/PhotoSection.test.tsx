import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/app/router'
import { Avatar } from '@/components/domain/Avatar'
import { apiClient } from '@/lib/api/client'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { renderWithProviders } from '@/test/utils'
import type * as Compress from '@/lib/images/compress'
import type { Me } from '@/types/api'

vi.mock('@/lib/images/compress', async (original) => ({
  ...(await original<typeof Compress>()),
  // jsdom has no canvas: hand the file straight through
  preparePhoto: (file: File) => Promise.resolve({ blob: file, width: 800, height: 800 }),
}))

const photo = () => new File([new Uint8Array(500)], 'me.jpg', { type: 'image/jpeg' })
const me = async () => (await apiClient.get<Me>('/me')).data

beforeEach(() => mockAuth.signInAs(SAMPLE_MEMBER_ID))

describe('Profile photo (FE-SET-01, ruling R7-7)', () => {
  it('saves an uploaded photo at once, and removes it again', async () => {
    renderWithProviders(routes, { initialPath: '/settings' })
    const section = await screen.findByRole('region', { name: 'Profile photo' })
    expect(section).toHaveTextContent('Use a clear photo of yourself')

    await userEvent.upload(screen.getByLabelText('Add photos', { selector: 'input' }), photo())
    await waitFor(async () => expect((await me()).avatarUrl).toMatch(/\/media\/m-/))
    expect(await screen.findByText('Profile photo updated.')).toBeInTheDocument()

    await userEvent.click(await screen.findByRole('button', { name: /Photo 1 options/ }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Remove' }))
    await waitFor(async () => expect((await me()).avatarUrl).toBeUndefined())
  })
})

describe('Avatar', () => {
  it('shows initials when the photo fails to load', () => {
    const { container } = render(<Avatar name="Tolu Adebayo" src="/broken.jpg" />)

    fireEvent.error(container.querySelector('img')!)

    expect(container.querySelector('img')).toBeNull()
    expect(container).toHaveTextContent('TA')
  })

  it('shows initials when there is no photo', () => {
    const { container } = render(<Avatar name="Amaka N." />)

    expect(container).toHaveTextContent('AN')
  })
})

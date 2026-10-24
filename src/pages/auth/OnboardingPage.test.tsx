import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { routes } from '@/app/router'
import { apiClient } from '@/lib/api/client'
import { signInNewMember } from '@/test/auth'
import { renderWithProviders } from '@/test/utils'
import type { Me } from '@/types/api'

async function renderOnboarding(path = '/onboarding?next=%2Fsettings') {
  await signInNewMember()
  const utils = renderWithProviders(routes, { initialPath: path })
  await screen.findByRole('heading', { level: 1, name: 'Set up your profile' })
  return utils
}

const nameInput = () => screen.getByRole('textbox', { name: 'Display name' })
const continueButton = () => screen.getByRole('button', { name: 'Continue' })
const path = (router: { state: { location: { pathname: string; search: string } } }) =>
  router.state.location.pathname + router.state.location.search

async function completeStepOne() {
  await userEvent.type(nameInput(), 'Ada O.')
  await userEvent.click(continueButton())
  await screen.findByText('Step 2 of 2')
}

describe('Onboarding', () => {
  it('needs a display name before moving on', async () => {
    await renderOnboarding()

    await userEvent.click(continueButton())

    expect(screen.getByText('Enter a name between 2 and 40 characters.')).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
  })

  it('keeps the step in the URL so Back returns to step 1 with the name kept', async () => {
    const { router } = await renderOnboarding()

    await completeStepOne()
    expect(path(router)).toBe('/onboarding?next=%2Fsettings&step=2')

    await router.navigate(-1)
    expect(await screen.findByText('Step 1 of 2')).toBeInTheDocument()
    expect(nameInput()).toHaveValue('Ada O.')
  })

  it('lets someone say their area is not listed', async () => {
    await renderOnboarding()

    await userEvent.click(screen.getByRole('checkbox', { name: 'My area isn’t listed' }))

    expect(screen.getByText(/You’ll see items from across/)).toBeInTheDocument()
  })

  it('keeps marketing messages separate and unticked', async () => {
    await renderOnboarding()
    await completeStepOne()

    const optional = screen.getByRole('group', { name: 'Optional' })
    expect(optional).toContainElement(screen.getByRole('checkbox', { name: /tips and news/ }))
    expect(screen.getByRole('checkbox', { name: /tips and news/ })).not.toBeChecked()
  })

  it('needs the terms and the 18+ confirmation, and says which is missing', async () => {
    const { router } = await renderOnboarding()
    await completeStepOne()

    await userEvent.click(screen.getByRole('button', { name: 'Continue to marketplace' }))

    expect(screen.getByText('Agree to the Terms and Privacy Policy to continue.')).toBeInTheDocument()
    expect(screen.getByText('Confirm you’re 18 or older to trade on NextOwn.')).toBeInTheDocument()
    expect(path(router)).toContain('/onboarding')
  })

  it('records the choices and lands on next', async () => {
    const { router } = await renderOnboarding()
    await userEvent.type(nameInput(), 'Ada O.')
    await userEvent.click(screen.getByRole('checkbox', { name: '[Pilot Area] North' }))
    await userEvent.click(continueButton())
    await screen.findByText('Step 2 of 2')

    await userEvent.click(screen.getByRole('button', { name: 'Phones' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /I agree to the Terms/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'I’m 18 or older' }))
    await userEvent.click(screen.getByRole('button', { name: 'Continue to marketplace' }))

    await waitFor(() => expect(path(router)).toBe('/settings'))
    const { data } = await apiClient.get<Me>('/me')
    expect(data).toMatchObject({
      displayName: 'Ada O.',
      areaId: 'north',
      interests: ['phones'],
      marketingOptIn: false,
      onboarded: true,
    })
  })

  it('keeps what was typed if the page reloads', async () => {
    const first = await renderOnboarding()
    await userEvent.type(nameInput(), 'Ada O.')
    first.unmount()

    renderWithProviders(routes, { initialPath: '/onboarding' })
    await screen.findByRole('heading', { level: 1, name: 'Set up your profile' })

    expect(nameInput()).toHaveValue('Ada O.')
  })

  it('sends an onboarded member on to next', async () => {
    await signInNewMember()
    await apiClient.patch('/me', { displayName: 'Ada', acceptTerms: { version: '2026-10', adult: true } })
    const { router } = renderWithProviders(routes, { initialPath: '/onboarding?next=%2Fme' })

    await waitFor(() => expect(path(router)).not.toContain('/onboarding'))
    expect(router.state.location.pathname).toBe('/me')
  })
})

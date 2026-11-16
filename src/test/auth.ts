import { screen } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { apiClient } from '@/lib/api/client'
import { SAMPLE_CODE, SAMPLE_MEMBER_EMAIL, SAMPLE_PASSWORD } from '@/mocks/db/auth'

/** Creates and signs in a brand-new account through the mock API, as the sign-up and code pages would. */
export async function signInNewMember(email = 'ada@example.com') {
  await apiClient.post('/auth/signup', { email, password: 'correct horse' })
  await apiClient.post('/auth/email/verify', { email, code: SAMPLE_CODE })
}

/** Fills in the sign-in page as the sample member and submits it. */
export async function signInWithForm(user: Pick<UserEvent, 'type' | 'click'> = userEvent) {
  await user.type(await screen.findByRole('textbox', { name: 'Email' }), SAMPLE_MEMBER_EMAIL)
  await user.type(screen.getByLabelText('Password'), SAMPLE_PASSWORD)
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
}

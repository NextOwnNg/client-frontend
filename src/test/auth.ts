import { apiClient } from '@/lib/api/client'
import { SAMPLE_CODE } from '@/mocks/db/auth'

/** Signs a brand-new number in through the mock API, as the verify page would. */
export async function signInNewMember(phone = '+2348031234567') {
  await apiClient.post('/auth/otp/request', { phone })
  await apiClient.post('/auth/otp/verify', { phone, code: SAMPLE_CODE })
}

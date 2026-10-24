import { delay, HttpResponse } from 'msw'
import { useDevSettings } from '@/mocks/dev-settings'

/** Simulated network: latency and a one-shot failure from the dev toolbar (no-ops in tests). */
export async function network() {
  const { latencyMs, failNext, setFailNext } = useDevSettings.getState()
  if (import.meta.env.MODE !== 'test') await delay(latencyMs)
  if (failNext) {
    setFailNext(false)
    return HttpResponse.json({ code: 'SERVER_ERROR', message: 'Simulated failure' }, { status: 503 })
  }
  return null
}

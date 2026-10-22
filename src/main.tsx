import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
import '@/styles/index.css'

/** In development the mock API (fictional sample data) answers every request until the backend exists. */
async function startMockApi() {
  if (!import.meta.env.DEV || import.meta.env.VITE_USE_MOCK_API !== 'true') return
  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledFrame: 'bypass', quiet: true })
}

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

startMockApi().then(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})

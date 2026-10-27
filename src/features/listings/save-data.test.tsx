import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { listingKeys, usePrefetchListing } from '@/features/listings/api'

function setSaveData(on: boolean | undefined) {
  Object.defineProperty(navigator, 'connection', {
    value: on === undefined ? undefined : { saveData: on },
    configurable: true,
  })
}

function prefetchWith(saveData: boolean) {
  setSaveData(saveData)
  const queryClient = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
  const { result } = renderHook(() => usePrefetchListing(), { wrapper })
  void result.current('ps5-disc-edition')
  return queryClient.getQueryState(listingKeys.detail('ps5-disc-edition'))
}

afterEach(() => setSaveData(undefined))

describe('Save-Data (PRD §8)', () => {
  it('warms a listing on hover normally', () => {
    expect(prefetchWith(false)).toBeDefined()
  })

  it('loads nothing ahead of a tap when the person saves data', () => {
    expect(prefetchWith(true)).toBeUndefined()
  })
})

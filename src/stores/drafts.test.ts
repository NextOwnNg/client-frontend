import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DRAFT_LIFETIME_MS, useDraftStore, useFormDraft } from '@/stores/drafts'

afterEach(() => {
  useDraftStore.setState({ drafts: {} })
  vi.useRealTimers()
})

describe('form drafts', () => {
  it('keeps typed values across a remount', () => {
    const first = renderHook(() => useFormDraft('settings:u-1', { name: '' }))
    act(() => first.result.current[1]({ name: 'Ada' }))
    first.unmount()

    const second = renderHook(() => useFormDraft('settings:u-1', { name: '' }))
    expect(second.result.current[0]).toEqual({ name: 'Ada' })
  })

  it('writes drafts to session storage, not local storage', () => {
    const { result } = renderHook(() => useFormDraft('settings:u-1', { name: '' }))
    act(() => result.current[1]({ name: 'Ada' }))

    expect(sessionStorage.getItem('nextown-drafts')).toContain('Ada')
    expect(localStorage.getItem('nextown-drafts')).toBeNull()
  })

  it('forgets a draft older than 24 hours when drafts load again', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const first = renderHook(() => useFormDraft('settings:u-1', { name: '' }))
    act(() => first.result.current[1]({ name: 'Ada' }))
    first.unmount()

    vi.setSystemTime(Date.now() + DRAFT_LIFETIME_MS + 1)
    await useDraftStore.persist.rehydrate()

    const later = renderHook(() => useFormDraft('settings:u-1', { name: '' }))
    expect(later.result.current[0]).toEqual({ name: '' })
  })

  it('clears a draft once the form is done', () => {
    const { result } = renderHook(() => useFormDraft('settings:u-1', { name: '' }))
    act(() => result.current[1]({ name: 'Ada' }))
    act(() => result.current[2]())

    expect(result.current[0]).toEqual({ name: '' })
  })

  it('recovers from a corrupted stored value', async () => {
    sessionStorage.setItem('nextown-drafts', '{not json')
    await useDraftStore.persist.rehydrate()

    const { result } = renderHook(() => useFormDraft('settings:u-1', { name: '' }))
    expect(result.current[0]).toEqual({ name: '' })
  })
})

import { describe, expect, it } from 'vitest'
import { conditionLabel, listingStatus } from '@/lib/copy/status'

describe('listingStatus', () => {
  it('uses the global state vocabulary', () => {
    expect(listingStatus('ACTIVE').label).toBe('Available')
    expect(listingStatus('RESERVED')).toMatchObject({ label: 'Reserved', tone: 'warning' })
    expect(listingStatus('REMOVED').label).toBe('No longer available')
    expect(listingStatus('PENDING_REVIEW').label).toBe('Under review')
    expect(listingStatus('COMPLETED').tone).toBe('success')
  })

  it('labels an active urgent listing as Quick Sell with its deadline', () => {
    expect(listingStatus('ACTIVE', { urgencyLabel: 'Ends in 18h' })).toMatchObject({
      label: 'Quick Sell · Ends in 18h',
      tone: 'highlight',
    })
  })

  it('always provides an icon so status is never colour alone', () => {
    expect(listingStatus('EXPIRED').icon).toBeTruthy()
  })
})

describe('conditionLabel', () => {
  it('uses the Brand Kit wording', () => {
    expect(conditionLabel('LIKE_NEW')).toBe('Like new')
    expect(conditionLabel('FOR_PARTS')).toBe('For parts')
  })
})

import { describe, expect, it } from 'vitest'
import { conditionLabel, isResubmission, listingStatus, needsChanges, ownListingStatus } from '@/lib/copy/status'

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

describe('ownListingStatus', () => {
  const review = {
    outcome: 'changes_needed',
    reasonLabel: 'Photos missing or unclear',
    message: null,
    decidedAt: '2026-11-25T09:00:00Z',
  } as const

  it('reads a draft sent back for changes as "Changes needed"', () => {
    expect(ownListingStatus({ status: 'DRAFT', review })).toMatchObject({ label: 'Changes needed', tone: 'warning' })
    expect(needsChanges({ status: 'DRAFT', review })).toBe(true)
  })

  it('keeps an ordinary draft and a resubmission as they were', () => {
    expect(ownListingStatus({ status: 'DRAFT', review: null }).label).toBe('Draft')
    expect(ownListingStatus({ status: 'PENDING_REVIEW', review }).label).toBe('Under review')
    expect(isResubmission({ status: 'PENDING_REVIEW', review })).toBe(true)
    expect(needsChanges({ status: 'DRAFT', review: { ...review, outcome: 'approved' } })).toBe(false)
  })
})

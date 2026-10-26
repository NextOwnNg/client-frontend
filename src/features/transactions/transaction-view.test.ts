import { describe, expect, it } from 'vitest'
import { requiredChecks, sidesOf, transactionSteps, transactionTab } from '@/features/transactions/transaction-view'
import { transactionStatus } from '@/lib/copy/transaction-status'
import type { AgreementSnapshot, SnapshotItem, Transaction } from '@/types/api'

const item = (title: string): SnapshotItem => ({ title, condition: 'GOOD', defects: [], photos: [] })
const agreement = (overrides: Partial<AgreementSnapshot> = {}): AgreementSnapshot => ({
  mode: 'CASH',
  listingItem: item('Xbox'),
  offeredItem: null,
  cashKobo: 57_000_000,
  cashDirection: 'OFFERER_PAYS_OWNER',
  versionNumber: 1,
  acceptedAt: '2026-10-20T10:00:00.000Z',
  ...overrides,
})
const tx = (overrides: Partial<Transaction> = {}) =>
  ({
    status: 'AWAITING_HANDOVER',
    viewerRole: 'offerer',
    agreement: agreement(),
    meeting: null,
    confirmations: { offerer: null, owner: null },
    ...overrides,
  }) as Transaction

describe('required confirmations (FE-TRX-05)', () => {
  it('asks a cash buyer about the item received and the cash, and the seller about the item given', () => {
    expect(requiredChecks(agreement(), 'offerer')).toEqual(['received', 'cash'])
    expect(requiredChecks(agreement(), 'owner')).toEqual(['gave', 'cash'])
  })

  it('asks both sides of a swap about both items, and about cash only when there is some', () => {
    const swap = agreement({ mode: 'SWAP', offeredItem: item('PS5'), cashKobo: 0, cashDirection: 'NONE' })
    expect(requiredChecks(swap, 'offerer')).toEqual(['received', 'gave'])
    expect(
      requiredChecks(
        { ...swap, mode: 'SWAP_PLUS_CASH', cashKobo: 500_000, cashDirection: 'OWNER_PAYS_OFFERER' },
        'owner',
      ),
    ).toEqual(['received', 'gave', 'cash'])
  })
})

describe('sides of the agreement', () => {
  it('reads who gives what from the frozen terms', () => {
    const swap = agreement({ mode: 'SWAP_PLUS_CASH', offeredItem: item('PS5'), cashDirection: 'OWNER_PAYS_OFFERER' })

    expect(sidesOf(swap, 'offerer')).toMatchObject({
      mine: { title: 'PS5' },
      theirs: { title: 'Xbox' },
      iGetCash: true,
      iPayCash: false,
    })
    expect(sidesOf(swap, 'owner')).toMatchObject({ mine: { title: 'Xbox' }, theirs: { title: 'PS5' }, iPayCash: true })
  })
})

describe('progress (FE-TRX-02, ruling R5-1)', () => {
  const states = (t: Transaction) => transactionSteps(t).map((s) => s.state)

  it('starts with the terms checked and the meeting as the next step', () => {
    expect(states(tx())).toEqual(['done', 'current', 'todo', 'todo'])
  })

  it('ticks the meeting only when both people agree to it', () => {
    const meeting = { place: 'Mall', time: '2026-10-30T15:00:00Z', note: '', proposedBy: 'a', agreedBy: ['a'] }
    expect(states(tx({ meeting }))).toEqual(['done', 'current', 'todo', 'todo'])
    expect(states(tx({ meeting: { ...meeting, agreedBy: ['a', 'b'] } }))).toEqual(['done', 'done', 'current', 'todo'])
  })

  it('ticks inspection when the reader confirms, and the last step only on completion', () => {
    expect(states(tx({ confirmations: { offerer: 'x', owner: null } }))).toEqual(['done', 'todo', 'done', 'current'])
    expect(states(tx({ status: 'COMPLETED', confirmations: { offerer: 'x', owner: 'y' } }))[3]).toBe('done')
  })

  it('shows no current step once the deal has ended', () => {
    expect(states(tx({ status: 'CANCELLED' }))).not.toContain('current')
  })
})

describe('status labels (PRD §7.6)', () => {
  it('says whose confirmation is missing', () => {
    expect(transactionStatus(tx()).label).toBe('Awaiting handover')
    expect(transactionStatus(tx({ confirmations: { offerer: 'x', owner: null } })).label).toBe(
      'Your confirmation received',
    )
    expect(transactionStatus(tx({ confirmations: { offerer: null, owner: 'y' } })).label).toBe(
      'Waiting for your confirmation',
    )
  })

  it('labels finished deals, and never calls an ended reservation complete', () => {
    expect(transactionStatus(tx({ status: 'COMPLETED' }))).toMatchObject({ label: 'Completed', tone: 'success' })
    expect(transactionStatus(tx({ status: 'DISPUTED' }))).toMatchObject({ label: 'Under review', tone: 'warning' })
    expect(transactionStatus(tx({ status: 'CANCELLED' })).label).toBe('Cancelled')
    expect(transactionStatus(tx({ status: 'EXPIRED' }))).toMatchObject({ label: 'Reservation ended', tone: 'neutral' })
  })

  it('sorts deals into tabs', () => {
    expect(transactionTab(tx())).toBe('active')
    expect(transactionTab(tx({ status: 'DISPUTED' }))).toBe('active')
    expect(transactionTab(tx({ status: 'COMPLETED' }))).toBe('completed')
    expect(transactionTab(tx({ status: 'EXPIRED' }))).toBe('ended')
  })
})

import type { Appeal, CaseReport, DisputeCategory, ReportReason, ReportStatus, ReportTargetType } from '@/types/api'

/**
 * The mock API's safety records: reports, blocks and appeals (TRU-03, DSC-08). FICTIONAL. Blocks are the one
 * source of "blocked" for chats, offers and the feed. Moderator notes never leave this file (FE-TRU-03).
 */

const STORAGE_KEY = 'nextown-mock-trust'
const persistent = import.meta.env.MODE !== 'test'
const FIRST_CASE = 122

export type StoredReport = CaseReport & {
  reporterId: string
  targetId: string
  description: string
  evidenceIds: string[]
  /** Staff only: never returned to the reporter. */
  moderatorNote?: string
}

type StoredBlock = { blockerId: string; blockedId: string; blockedAt: string }
type StoredAppeal = Appeal & { userId: string; message: string }

let reports: StoredReport[] = []
let blocks: StoredBlock[] = []
let appeals: StoredAppeal[] = []
let caseNumber = FIRST_CASE

const nextCaseRef = () => `NX-${String(++caseNumber).padStart(6, '0')}`

function seed() {
  reports = [
    {
      id: 'r-seed-1',
      caseRef: 'NX-000118',
      reporterId: 'u-tolu',
      targetType: 'listing',
      targetId: 'l18',
      targetLabel: 'Samsung phone',
      reason: 'MISLEADING',
      status: 'ACTION_TAKEN',
      description: 'The photos are from a shop website, not of the actual phone.',
      evidenceIds: [],
      moderatorNote: 'Stock photos confirmed. Listing removed, seller warned.',
      createdAt: '2026-10-09T10:12:00.000Z',
      updatedAt: '2026-10-11T15:40:00.000Z',
    },
    {
      id: 'r-seed-2',
      caseRef: 'NX-000120',
      reporterId: 'u-tolu',
      targetType: 'comment',
      targetId: 'c-3',
      targetLabel: 'A comment on “Nintendo Switch with dock”',
      reason: 'SPAM',
      status: 'ACTION_TAKEN',
      description: '',
      evidenceIds: [],
      moderatorNote: 'Repeated link spam. Comment removed.',
      createdAt: '2026-10-22T18:05:00.000Z',
      updatedAt: '2026-10-23T09:00:00.000Z',
    },
    {
      id: 'r-seed-3',
      caseRef: 'NX-000122',
      reporterId: 'u-tolu',
      targetType: 'listing',
      targetId: 'l13',
      targetLabel: 'Vintage GE desk fan',
      reason: 'PROHIBITED',
      status: 'IN_REVIEW',
      description: 'The cable looks frayed in the second photo. Is this safe to sell?',
      evidenceIds: [],
      createdAt: '2026-10-25T08:30:00.000Z',
      updatedAt: '2026-10-25T12:10:00.000Z',
    },
  ]
  blocks = []
  appeals = []
  caseNumber = FIRST_CASE
}

function save() {
  if (!persistent) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ reports, blocks, appeals, caseNumber }))
  } catch {
    // Storage full or unavailable: changes last until reload
  }
}

function load() {
  seed()
  if (!persistent) return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw) as {
      reports: StoredReport[]
      blocks: StoredBlock[]
      appeals: StoredAppeal[]
      caseNumber: number
    }
    reports = saved.reports
    blocks = saved.blocks
    appeals = saved.appeals
    caseNumber = saved.caseNumber
  } catch {
    // Corrupted entry: start from the seeded records
  }
}
load()

const isOpen = (r: StoredReport) => r.status === 'RECEIVED' || r.status === 'IN_REVIEW'

/** What the reporter may see of their own case. */
export const toCase = ({
  reporterId: _reporter,
  targetId: _target,
  description: _description,
  evidenceIds: _evidence,
  moderatorNote: _note,
  ...visible
}: StoredReport): CaseReport => visible

export const trustDb = {
  /** The reporter's open case on the same thing, if there is one (TRU-03 duplicate handling). */
  openReport(reporterId: string, targetType: ReportTargetType, targetId: string) {
    return reports.find(
      (r) => r.reporterId === reporterId && r.targetType === targetType && r.targetId === targetId && isOpen(r),
    )
  },

  report(input: {
    reporterId: string
    targetType: ReportTargetType
    targetId: string
    targetLabel: string
    reason: ReportReason | DisputeCategory
    description: string
    evidenceIds: string[]
    caseRef?: string
  }): StoredReport {
    const now = new Date().toISOString()
    const { caseRef, ...rest } = input
    const report: StoredReport = {
      ...rest,
      id: `r-${Date.now().toString(36)}${reports.length}`,
      caseRef: caseRef ?? nextCaseRef(),
      status: 'RECEIVED',
      createdAt: now,
      updatedAt: now,
    }
    reports.push(report)
    save()
    return report
  },

  reportsBy(userId: string): CaseReport[] {
    return reports
      .filter((r) => r.reporterId === userId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map(toCase)
  },

  isBlocked: (blockerId: string, blockedId: string) =>
    blocks.some((b) => b.blockerId === blockerId && b.blockedId === blockedId),

  /** Either person blocked the other: no new messages or offers between them (QA-18). */
  between: (a: string, b: string) => trustDb.isBlocked(a, b) || trustDb.isBlocked(b, a),

  blockedBy: (blockerId: string) => blocks.filter((b) => b.blockerId === blockerId),

  /** Ids of people whose posts and comments the viewer no longer sees. */
  hiddenFor: (viewerId: string | undefined) =>
    new Set(viewerId ? blocks.filter((b) => b.blockerId === viewerId).map((b) => b.blockedId) : []),

  setBlocked(blockerId: string, blockedId: string, on: boolean) {
    const existing = trustDb.isBlocked(blockerId, blockedId)
    if (on && !existing) blocks.push({ blockerId, blockedId, blockedAt: new Date().toISOString() })
    if (!on && existing) blocks = blocks.filter((b) => !(b.blockerId === blockerId && b.blockedId === blockedId))
    save()
  },

  appealOf(userId: string): Appeal | undefined {
    const appeal = appeals.findLast((a) => a.userId === userId)
    return appeal && { caseRef: appeal.caseRef, status: appeal.status, createdAt: appeal.createdAt }
  },

  appeal(userId: string, message: string): Appeal {
    const appeal: StoredAppeal = {
      userId,
      message,
      caseRef: nextCaseRef(),
      status: 'RECEIVED',
      createdAt: new Date().toISOString(),
    }
    appeals.push(appeal)
    save()
    return trustDb.appealOf(userId)!
  },
}

const nextStatus: Record<ReportStatus, ReportStatus> = {
  RECEIVED: 'IN_REVIEW',
  IN_REVIEW: 'ACTION_TAKEN',
  ACTION_TAKEN: 'CLOSED',
  CLOSED: 'CLOSED',
}

/** Controls for the dev toolbar and tests: what moderators would do. */
export const mockTrust = {
  /** Moves the member's newest case one step on, as a moderator would. */
  advanceNewestReport(userId: string) {
    const newest = reports
      .filter((r) => r.reporterId === userId && r.status !== 'CLOSED')
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0]
    if (!newest) return false
    newest.status = nextStatus[newest.status]
    newest.updatedAt = new Date().toISOString()
    save()
    return true
  },
  /** Someone else blocks or unblocks the member. */
  toggleBlockedBy(otherId: string, memberId: string) {
    trustDb.setBlocked(otherId, memberId, !trustDb.isBlocked(otherId, memberId))
  },
  reset() {
    seed()
  },
}

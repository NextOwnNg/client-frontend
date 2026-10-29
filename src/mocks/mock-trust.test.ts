import { beforeEach, describe, expect, it } from 'vitest'
import { isApiError } from '@/lib/api/api-error'
import { apiClient, idempotencyHeaders } from '@/lib/api/client'
import { mockAuth, SAMPLE_MEMBER_ID } from '@/mocks/db/auth'
import { mockMessages } from '@/mocks/db/messages'
import { mockTrust } from '@/mocks/db/trust'
import type {
  Appeal,
  BlockedPerson,
  CaseReport,
  ConversationDetail,
  FeedComment,
  FeedPost,
  ListingDetail,
  Me,
  MediaRef,
  NewReport,
  Paginated,
  ReportReceipt,
  ReportTarget,
} from '@/types/api'

const fail = (promise: Promise<unknown>) =>
  promise.then(
    () => {
      throw new Error('Expected the request to fail')
    },
    (e: unknown) => {
      if (!isApiError(e)) throw e
      return e
    },
  )

const get = async <T>(path: string) => (await apiClient.get<T>(path)).data
const report = (input: Partial<NewReport>) =>
  apiClient.post<ReportReceipt>('/reports', {
    targetType: 'listing',
    targetId: 'l3',
    reason: 'SCAM',
    description: '',
    evidenceIds: [],
    ...input,
  })

const allPosts = async () => {
  const items: FeedPost[] = []
  let cursor: string | null = '0'
  while (cursor !== null) {
    const page: Paginated<FeedPost> = await get(`/feed?cursor=${cursor}`)
    items.push(...page.items)
    cursor = page.nextCursor
  }
  return items
}

beforeEach(() => mockAuth.signInAs(SAMPLE_MEMBER_ID))

describe('mock reports API (TRU-03)', () => {
  it('names the target and the person behind it', async () => {
    const target = await get<ReportTarget>('/reports/target/comment/c-1')

    expect(target.label).toBe('A comment on “Nintendo Switch with dock”')
    expect(target.author).toEqual({ id: 'u-amaka', displayName: 'Amaka N.' })
  })

  it('returns a case reference, and the same one for a repeat while it is open', async () => {
    const first = await report({ reason: 'SCAM' })
    const again = await report({ reason: 'MISLEADING', description: 'Same listing again' })

    expect(first.status).toBe(201)
    expect(first.data.report.caseRef).toMatch(/^NX-\d{6}$/)
    expect(again.status).toBe(200)
    expect(again.data).toMatchObject({ duplicate: true, report: { caseRef: first.data.report.caseRef } })
  })

  it('needs words for "Something else"', async () => {
    const error = await fail(report({ reason: 'OTHER', description: 'hm' }))

    expect(error.status).toBe(422)
    expect(error.fieldErrors?.description).toBeDefined()
  })

  it('treats removed things and other people’s threads as not found', async () => {
    expect((await fail(get('/reports/target/comment/c-3'))).status).toBe(404)
    expect((await fail(get('/reports/target/listing/l18'))).status).toBe(404)
    mockAuth.signInAs('u-amaka')
    expect((await fail(get('/reports/target/conversation/m-xbox'))).status).toBe(404)
  })

  it('refuses a report of your own listing', async () => {
    const error = await fail(report({ targetId: 'l1' }))

    expect(error.status).toBe(422)
  })

  it('lists my cases newest first, with status only and the deal disputes too (FE-TRU-03)', async () => {
    await report({ reason: 'SCAM' })
    await apiClient.post(
      '/transactions/t-o-xbox-accepted/dispute',
      { category: 'NO_SHOW', description: 'They did not come to the meeting point.', evidenceIds: [] },
      { headers: idempotencyHeaders('dispute-1') },
    )
    const cases = await get<CaseReport[]>('/me/reports')

    expect(cases[0]).toMatchObject({ targetType: 'transaction', reason: 'NO_SHOW', status: 'RECEIVED' })
    expect(cases[1]).toMatchObject({ targetType: 'listing', targetLabel: 'PS5 Disc Edition' })
    expect(cases).toHaveLength(5)
    for (const c of cases) {
      expect(c).not.toHaveProperty('moderatorNote')
      expect(c).not.toHaveProperty('description')
    }
  })

  it('moves a case on when moderators act', async () => {
    await report({ reason: 'SCAM' })
    mockTrust.advanceNewestReport(SAMPLE_MEMBER_ID)

    expect((await get<CaseReport[]>('/me/reports'))[0]!.status).toBe('IN_REVIEW')
  })

  it('blocks the author alongside the report when asked', async () => {
    await report({ targetType: 'comment', targetId: 'c-1', reason: 'HARASSMENT', alsoBlock: true })

    expect((await get<BlockedPerson[]>('/me/blocks')).map((p) => p.id)).toEqual(['u-amaka'])
  })
})

describe('mock blocks API (DSC-08, QA-18)', () => {
  it('blocks once, however many times it is asked', async () => {
    await apiClient.put('/me/blocks/u-chidi')
    await apiClient.put('/me/blocks/u-chidi')

    expect(await get<BlockedPerson[]>('/me/blocks')).toEqual([
      expect.objectContaining({ id: 'u-chidi', displayName: 'Chidi O.' }),
    ])
  })

  it('closes the chat both ways, and reopens it on unblock', async () => {
    await apiClient.put('/me/blocks/u-chidi')

    expect((await get<ConversationDetail>('/conversations/m-xbox')).blocked).toBe('by-me')
    mockAuth.signInAs('u-chidi')
    expect((await get<ConversationDetail>('/conversations/m-xbox')).blocked).toBe('by-them')
    const error = await fail(apiClient.post('/conversations/m-xbox/messages', { clientId: 'c1', body: 'Hello?' }))
    expect(error.status).toBe(403)
    expect(error.code).toBe('BLOCKED')

    mockAuth.signInAs(SAMPLE_MEMBER_ID)
    await apiClient.delete('/me/blocks/u-chidi')
    expect((await get<ConversationDetail>('/conversations/m-xbox')).blocked).toBe('none')
  })

  it('refuses a new offer to someone who blocked you', async () => {
    mockAuth.signInAs('u-amaka')
    await apiClient.put(`/me/blocks/${SAMPLE_MEMBER_ID}`)
    mockAuth.signInAs(SAMPLE_MEMBER_ID)

    const error = await fail(
      apiClient.post(
        '/offers',
        {
          listingId: 'l3',
          mode: 'CASH',
          offeredItemId: null,
          cashKobo: 30_000_000,
          cashDirection: 'OFFERER_PAYS_OWNER',
          note: '',
        },
        { headers: idempotencyHeaders('blocked-offer') },
      ),
    )
    expect(error.status).toBe(403)
    expect(error.code).toBe('BLOCKED')
    // The listing doesn't say the seller blocked you
    expect((await get<ListingDetail>('/listings/l3')).viewer).toEqual({ blockedSeller: false })
  })

  it('tells the listing page when you blocked the seller', async () => {
    await apiClient.put('/me/blocks/u-amaka')

    expect((await get<ListingDetail>('/listings/l3')).viewer).toEqual({ blockedSeller: true })
  })

  it('hides their posts and comments from you', async () => {
    await apiClient.put('/me/blocks/u-zainab')

    expect((await allPosts()).some((p) => p.author.id === 'u-zainab')).toBe(false)
    expect((await get<FeedComment[]>('/feed/p-switch/comments')).some((c) => c.author.id === 'u-zainab')).toBe(false)
  })

  it('keeps the other person’s side of a blocked thread toggleable from the dev tools', async () => {
    mockMessages.toggleBlockedByOther('m-xbox')

    expect((await get<ConversationDetail>('/conversations/m-xbox')).blocked).toBe('by-them')
  })
})

describe('mock appeals API (ruling R7-5)', () => {
  const appeal = (message: string) => apiClient.post<Appeal>('/me/appeal', { message })

  it('has nothing to appeal while the account is in good standing', async () => {
    expect((await fail(appeal('Please look at my account again, thank you.'))).code).toBe('NOT_RESTRICTED')
  })

  it('records one appeal with a case reference, shown on /me', async () => {
    mockAuth.setRestricted(true)
    expect((await fail(appeal('Too short'))).status).toBe(422)

    const { data } = await appeal('I think the listing was flagged by mistake. It is my own phone.')
    expect(data.caseRef).toMatch(/^NX-\d{6}$/)
    expect(data.status).toBe('RECEIVED')
    expect((await get<Me>('/me')).appeal?.caseRef).toBe(data.caseRef)

    const second = await fail(appeal('Following up on my earlier request, please review.'))
    expect(second.status).toBe(409)
    expect(second.code).toBe('APPEAL_EXISTS')
  })
})

describe('mock profile photos (FE-SET-01)', () => {
  it('sets and removes the photo everywhere the person appears', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'me.jpg', { type: 'image/jpeg' })
    const form = new FormData()
    form.append('file', file)
    const media = (await apiClient.post<MediaRef>('/media', form)).data

    const me = (await apiClient.patch<Me>('/me', { avatarId: media.id })).data
    expect(me.avatarUrl).toBe(media.url)
    expect((await get<{ avatarUrl?: string }>(`/users/${SAMPLE_MEMBER_ID}`)).avatarUrl).toBe(media.url)
    expect((await get<ListingDetail>('/listings/l1')).seller.avatarUrl).toBe(media.url)

    await apiClient.patch('/me', { avatarId: null })
    expect((await get<Me>('/me')).avatarUrl).toBeUndefined()
  })

  it('refuses a photo that was never uploaded', async () => {
    expect((await fail(apiClient.patch('/me', { avatarId: 'nope' }))).fieldErrors?.avatarId).toBeDefined()
  })
})

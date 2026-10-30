import { describe, expect, it } from 'vitest'
import { commentThreads } from '@/features/feed/comment-threads'
import type { FeedComment } from '@/types/api'

const at = (minute: number) => `2026-10-30T09:${String(minute).padStart(2, '0')}:00.000Z`
const comment = (id: string, minute: number, parentId: string | null = null): FeedComment => ({
  id,
  author: {
    id: 'u-amaka',
    displayName: 'Amaka N.',
    phoneConfirmed: true,
    reviewCount: 0,
    areaName: '[Pilot Area] East',
  },
  body: id,
  removed: false,
  createdAt: at(minute),
  parentId,
})

describe('commentThreads', () => {
  it('keeps comments newest first and reads each thread oldest first', () => {
    // As the server sends them: newest first, replies mixed in
    const threads = commentThreads([comment('r2', 40, 'a'), comment('b', 30), comment('r1', 20, 'a'), comment('a', 10)])

    expect(threads.map((t) => t.comment.id)).toEqual(['b', 'a'])
    expect(threads[1]!.replies.map((r) => r.id)).toEqual(['r1', 'r2'])
    expect(threads[0]!.replies).toEqual([])
  })

  it('leaves out a reply whose comment isn’t in the list', () => {
    expect(commentThreads([comment('r1', 20, 'gone'), comment('a', 10)]).flatMap((t) => t.replies)).toEqual([])
  })
})

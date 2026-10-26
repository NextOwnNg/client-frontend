import { describe, expect, it } from 'vitest'
import { isAcceptedPhoto, scaledSize } from '@/lib/images/compress'

describe('photo compression sizing', () => {
  it('scales the long edge down to 1600px, keeping the shape', () => {
    expect(scaledSize(4032, 3024)).toEqual({ width: 1600, height: 1200 })
    expect(scaledSize(3024, 4032)).toEqual({ width: 1200, height: 1600 })
  })

  it('never enlarges a small photo', () => {
    expect(scaledSize(800, 600)).toEqual({ width: 800, height: 600 })
  })

  it('accepts JPG, PNG and WebP only', () => {
    expect(isAcceptedPhoto(new File([], 'a.jpg', { type: 'image/jpeg' }))).toBe(true)
    expect(isAcceptedPhoto(new File([], 'a.webp', { type: 'image/webp' }))).toBe(true)
    expect(isAcceptedPhoto(new File([], 'a.heic', { type: 'image/heic' }))).toBe(false)
    expect(isAcceptedPhoto(new File([], 'a.gif', { type: 'image/gif' }))).toBe(false)
    expect(isAcceptedPhoto(new File([], 'a.pdf', { type: 'application/pdf' }))).toBe(false)
  })
})

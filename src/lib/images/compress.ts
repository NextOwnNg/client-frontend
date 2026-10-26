/** Photos are prepared on the device before upload (PRD §7.8): long edge ~1600px, JPEG 0.8. */

export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const MAX_EDGE = 1600
const QUALITY = 0.8

export const isAcceptedPhoto = (file: File) => ACCEPTED_PHOTO_TYPES.includes(file.type)

export function scaledSize(width: number, height: number, maxEdge = MAX_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

export type PreparedPhoto = { blob: Blob; width?: number; height?: number }

/**
 * Resizes and re-encodes a photo. Re-encoding through a canvas also drops EXIF, including GPS, though the
 * server strips it again (LST-06). If the browser can't decode the file, a small enough original goes as it is.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const { width, height } = scaledSize(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No 2D canvas')
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
    if (!blob) throw new Error('Encoding failed')
    return { blob, width, height }
  } catch (error) {
    if (file.size <= MAX_PHOTO_BYTES) return { blob: file }
    throw error
  }
}

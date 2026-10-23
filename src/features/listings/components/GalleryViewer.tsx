import { Modal } from '@heroui/react'
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cx } from '@/lib/cx'
import type { ListingImage } from '@/types/api'

type GalleryViewerProps = {
  images: ListingImage[]
  index: number
  onIndexChange: (index: number) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

const control =
  'flex size-11 items-center justify-center rounded-full bg-white/10 text-paper outline-none transition-[background-color,transform] duration-120 ease-out hover:bg-white/20 active:scale-[0.94] focus-visible:ring-2 focus-visible:ring-paper disabled:opacity-30'

/** Full view of one photo on a dark backdrop. Zoom doubles the photo; scroll or drag to look around. */
export function GalleryViewer({ images, index, onIndexChange, open, onOpenChange }: GalleryViewerProps) {
  const [zoomed, setZoomed] = useState(false)
  const image = images[index]

  const go = (i: number) => {
    setZoomed(false)
    onIndexChange(i)
  }

  // Left and right arrows page through photos while the full view is open
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && index < images.length - 1) go(index + 1)
      if (e.key === 'ArrowLeft' && index > 0) go(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!image) return null

  return (
    <Modal isOpen={open} onOpenChange={onOpenChange}>
      <Modal.Backdrop className="bg-ink/95">
        <Modal.Container size="full">
          <Modal.Dialog
            aria-label={`Photo ${index + 1} of ${images.length}: ${image.alt}`}
            className="bg-transparent p-0 text-paper shadow-none"
          >
            <div className="flex h-dvh flex-col">
              <div className="flex items-center justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                <p className="tabular px-2 text-compact">
                  {index + 1} of {images.length}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-pressed={zoomed}
                    aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
                    onClick={() => setZoomed((z) => !z)}
                    className={control}
                  >
                    {zoomed ? <ZoomOut aria-hidden className="size-5" /> : <ZoomIn aria-hidden className="size-5" />}
                  </button>
                  <button
                    type="button"
                    aria-label="Close full view"
                    onClick={() => onOpenChange(false)}
                    className={control}
                  >
                    <X aria-hidden className="size-5" />
                  </button>
                </div>
              </div>

              <div className={cx('relative min-h-0 flex-1', zoomed ? 'overflow-auto' : 'overflow-hidden')}>
                {/* Tapping the photo is a pointer shortcut for the Zoom button above, so it's hidden from keyboard and screen readers */}
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden
                  onClick={() => setZoomed((z) => !z)}
                  className={cx('block size-full', zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in')}
                >
                  <img
                    src={image.url}
                    alt={image.alt}
                    className={cx(
                      'mx-auto transition-[width,max-width] duration-200 ease-out',
                      zoomed ? 'w-[200%] max-w-none' : 'h-full w-full object-contain',
                    )}
                  />
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  aria-label="Previous photo"
                  disabled={index === 0}
                  onClick={() => go(index - 1)}
                  className={control}
                >
                  <ChevronLeft aria-hidden className="size-5" />
                </button>
                <p className="max-w-md truncate text-compact text-paper/80">{image.alt}</p>
                <button
                  type="button"
                  aria-label="Next photo"
                  disabled={index === images.length - 1}
                  onClick={() => go(index + 1)}
                  className={control}
                >
                  <ChevronRight aria-hidden className="size-5" />
                </button>
              </div>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

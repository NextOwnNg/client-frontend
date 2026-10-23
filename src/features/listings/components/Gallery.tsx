import { ChevronLeft, ChevronRight, Expand } from 'lucide-react'
import { lazy, Suspense, useRef, useState, type KeyboardEvent } from 'react'
import { ImageWithFade } from '@/components/ui/ImageWithFade'
import { cx } from '@/lib/cx'
import { coverTransitionName } from '@/lib/view-transition'
import type { ListingImage } from '@/types/api'

const loadViewer = () => import('@/features/listings/components/GalleryViewer')
const GalleryViewer = lazy(() => loadViewer().then((m) => ({ default: m.GalleryViewer })))

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const arrow =
  'absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink shadow-card outline-none transition-[opacity,transform] duration-120 ease-out active:scale-[0.94] focus-visible:ring-2 focus-visible:ring-focus disabled:pointer-events-none disabled:opacity-0'

/**
 * Listing photos (FE-LDT-02): native swipe through scroll snapping, arrows, thumbnails, a count, keyboard
 * arrows and a full view with zoom. A failed photo shows a placeholder and never blocks the page.
 */
export function Gallery({ images, slug }: { images: ListingImage[]; slug: string }) {
  const [index, setIndex] = useState(0)
  const [viewerOpen, setViewerOpen] = useState(false)
  const track = useRef<HTMLDivElement>(null)
  const count = images.length

  function go(next: number) {
    const i = Math.max(0, Math.min(count - 1, next))
    setIndex(i)
    const el = track.current
    el?.scrollTo?.({ left: i * el.clientWidth, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') go(index + 1)
    else if (e.key === 'ArrowLeft') go(index - 1)
    else return
    e.preventDefault()
  }

  if (count === 0) return null

  return (
    <section aria-label="Photos" aria-roledescription="carousel" className="flex flex-col gap-3" onKeyDown={onKeyDown}>
      <div className="relative -mx-4 overflow-hidden bg-cloud tablet:mx-0 tablet:rounded-card tablet:border tablet:border-border">
        <div
          ref={track}
          onScroll={(e) => {
            const el = e.currentTarget
            const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
            if (i !== index) setIndex(i)
          }}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((image, i) => (
            <div
              key={image.url}
              role="group"
              aria-roledescription="slide"
              aria-label={`Photo ${i + 1} of ${count}`}
              aria-hidden={i !== index || undefined}
              className="w-full shrink-0 snap-center"
            >
              <button
                type="button"
                tabIndex={i === index ? 0 : -1}
                onPointerEnter={loadViewer}
                onClick={() => setViewerOpen(true)}
                aria-label={`Open full view: ${image.alt}`}
                className="group relative block w-full cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset"
              >
                <ImageWithFade
                  src={image.url}
                  alt={image.alt}
                  fit="contain"
                  aspect="4/3"
                  sizes="(min-width: 1024px) 720px, 100vw"
                  priority={i === 0}
                  transitionName={i === 0 ? coverTransitionName(slug) : undefined}
                />
                <span
                  aria-hidden
                  className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-ink/70 text-paper opacity-0 transition-opacity duration-120 group-hover:opacity-100"
                >
                  <Expand className="size-4" />
                </span>
              </button>
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <button type="button" aria-label="Previous photo" onClick={() => go(index - 1)} disabled={index === 0} className={cx(arrow, 'left-3')}>
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <button type="button" aria-label="Next photo" onClick={() => go(index + 1)} disabled={index === count - 1} className={cx(arrow, 'right-3')}>
              <ChevronRight aria-hidden className="size-5" />
            </button>
          </>
        )}
        <p aria-live="polite" className="tabular absolute right-3 bottom-3 rounded-full bg-ink/75 px-2.5 py-0.5 text-caption text-paper">
          {index + 1} of {count}
        </p>
      </div>

      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {images.map((image, i) => (
            <button
              key={image.url}
              type="button"
              aria-label={`Show photo ${i + 1} of ${count}`}
              aria-current={i === index || undefined}
              onClick={() => go(i)}
              className={cx(
                'relative size-14 shrink-0 overflow-hidden rounded-small outline-none transition-[box-shadow,opacity] duration-120 focus-visible:ring-2 focus-visible:ring-focus',
                i === index ? 'ring-2 ring-action ring-offset-2' : 'opacity-70 hover:opacity-100',
              )}
            >
              <ImageWithFade src={image.url} alt="" aspect="1/1" sizes="56px" className="size-full" />
            </button>
          ))}
        </div>
      )}

      {viewerOpen && (
        <Suspense fallback={null}>
          <GalleryViewer images={images} index={index} onIndexChange={go} open={viewerOpen} onOpenChange={setViewerOpen} />
        </Suspense>
      )}
    </section>
  )
}

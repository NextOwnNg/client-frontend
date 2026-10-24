import { ImageOff } from 'lucide-react'
import { useState } from 'react'
import { cx } from '@/lib/cx'

type ImageWithFadeProps = {
  src: string
  alt: string
  /** CSS aspect ratio of the frame, e.g. "4/3" or "1/1". */
  aspect?: string
  sizes?: string
  priority?: boolean
  /** Shared-element name: the same photo on the card and the detail page morphs between them. */
  transitionName?: string
  /** "contain" shows the whole photo (listing evidence); "cover" fills the frame (cards). */
  fit?: 'cover' | 'contain'
  className?: string
}

/**
 * Real item photos: a Mint frame holds the layout, the photo fades in over 200ms once decoded,
 * and a failed image never collapses the card or blocks its actions.
 */
export function ImageWithFade({
  src,
  alt,
  aspect = '4/3',
  sizes,
  priority,
  transitionName,
  fit = 'cover',
  className,
}: ImageWithFadeProps) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading')

  return (
    <span
      className={cx('relative block overflow-hidden bg-mint', className)}
      style={{ aspectRatio: aspect, viewTransitionName: transitionName }}
    >
      {state === 'error' ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted">
          <ImageOff aria-hidden className="size-6" />
          <span className="text-caption">Photo unavailable</span>
        </span>
      ) : (
        <img
          src={src}
          alt={alt}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
          onLoad={() => setState('loaded')}
          onError={() => setState('error')}
          className={cx(
            'absolute inset-0 size-full transition-opacity duration-200 ease-out',
            fit === 'cover' ? 'object-cover' : 'object-contain',
            state === 'loaded' ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </span>
  )
}

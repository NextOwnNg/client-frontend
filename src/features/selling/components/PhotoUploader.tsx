import { CircleAlert, Ellipsis, ImagePlus, LoaderCircle, RotateCcw, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type DragEvent } from 'react'
import { Button, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components'
import { uploadPhoto } from '@/features/selling/api'
import { useSortable } from '@/features/selling/use-sortable'
import { isApiError } from '@/lib/api/api-error'
import { ACCEPTED_PHOTO_TYPES, isAcceptedPhoto, preparePhoto } from '@/lib/images/compress'
import { cx } from '@/lib/cx'
import type { MediaRef } from '@/types/api'

export const PHOTO_TIP = 'Use photos of the actual item. Include its defects and any repairs.'

type Pending = {
  key: string
  file: File
  preview: string
  status: 'preparing' | 'uploading' | 'failed'
  progress: number
  alt: string
  error?: string
}

type PhotoUploaderProps = {
  /** Uploaded photos in order; the first is the cover. */
  value: MediaRef[]
  onChange: (photos: MediaRef[]) => void
  limits: { min: number; max: number }
  /** Used in each photo's alt text. */
  itemName: string
  error?: string | null
  /** True while any photo is still preparing or uploading. */
  onBusyChange?: (busy: boolean) => void
}

const tile = 'relative aspect-square overflow-hidden rounded-control border border-border bg-cloud'

function failureMessage(error: unknown) {
  if (isApiError(error) && error.code === 'UNSUPPORTED_FORMAT') return 'This file type isn’t supported.'
  if (isApiError(error) && error.code === 'FILE_TOO_LARGE') return 'This photo is over 10 MB.'
  return 'Check your connection and try again.'
}

const move = <T,>(list: T[], from: number, to: number) => {
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  return next
}

/**
 * The listing photo uploader (FE-LST-02): prepares each photo on the device, uploads it with progress, and
 * keeps going when one fails. Reorder by dragging (press and hold on a phone) or from each photo's menu.
 */
export function PhotoUploader({ value, onChange, limits, itemName, error, onBusyChange }: PhotoUploaderProps) {
  const [pending, setPending] = useState<Pending[]>([])
  const [notices, setNotices] = useState<string[]>([])
  const [dropping, setDropping] = useState(false)
  const latest = useRef(value)
  const onChangeRef = useRef(onChange)
  const controllers = useRef(new Map<string, AbortController>())
  const headingId = useId()
  const hintId = useId()
  const errorId = useId()
  const room = limits.max - value.length - pending.length
  const busy = pending.some((p) => p.status !== 'failed')
  const { drag, onPointerDown } = useSortable({ onMove: (from, to) => onChange(move(value, from, to)) })

  useEffect(() => {
    latest.current = value
    onChangeRef.current = onChange
  }, [value, onChange])
  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange])
  useEffect(() => {
    const active = controllers.current
    return () => active.forEach((c) => c.abort())
  }, [])

  const patch = (key: string, changes: Partial<Pending>) =>
    setPending((list) => list.map((p) => (p.key === key ? { ...p, ...changes } : p)))

  async function upload(entry: Pending) {
    const controller = new AbortController()
    controllers.current.set(entry.key, controller)
    try {
      patch(entry.key, { status: 'preparing', progress: 0, error: undefined })
      const prepared = await preparePhoto(entry.file)
      patch(entry.key, { status: 'uploading' })
      const media = await uploadPhoto(
        { ...prepared, alt: entry.alt },
        { signal: controller.signal, onProgress: (progress) => patch(entry.key, { progress }) },
      )
      setPending((list) => list.filter((p) => p.key !== entry.key))
      URL.revokeObjectURL(entry.preview)
      // Several uploads finish independently; append to the newest list, not the one this upload started with
      latest.current = [...latest.current, media]
      // The newest onChange: the form may have moved on (a new draft gets its id) while this was uploading
      onChangeRef.current(latest.current)
    } catch (e) {
      if (!controller.signal.aborted) patch(entry.key, { status: 'failed', error: failureMessage(e) })
    } finally {
      controllers.current.delete(entry.key)
    }
  }

  function addFiles(files: File[]) {
    const messages: string[] = []
    let accepted = files.filter((file) => {
      if (isAcceptedPhoto(file)) return true
      messages.push(`${file.name}: this file type isn’t supported. Use JPG, PNG or WebP.`)
      return false
    })
    if (accepted.length > room) {
      messages.push(
        room === 1
          ? 'Only 1 more photo fits, so the rest weren’t added.'
          : `Only ${room} more photos fit, so the rest weren’t added.`,
      )
      accepted = accepted.slice(0, Math.max(room, 0))
    }
    setNotices(messages)

    const start = value.length + pending.length
    const entries = accepted.map<Pending>((file, i) => ({
      key: `${Date.now()}-${i}-${file.name}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'preparing',
      progress: 0,
      alt: `${itemName.trim() || 'Item'}: photo ${start + i + 1}`,
    }))
    setPending((list) => [...list, ...entries])
    entries.forEach((entry) => void upload(entry))
  }

  function discard(entry: Pending) {
    controllers.current.get(entry.key)?.abort()
    URL.revokeObjectURL(entry.preview)
    setPending((list) => list.filter((p) => p.key !== entry.key))
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDropping(false)
    if (room > 0) addFiles([...e.dataTransfer.files])
  }

  const describedBy = [error ? errorId : null, hintId].filter(Boolean).join(' ')

  return (
    <div role="group" aria-labelledby={headingId} aria-describedby={describedBy} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <p id={headingId} className="text-compact font-semibold text-ink">
          Photos
        </p>
        <p className="tabular text-compact text-muted">
          {value.length} of {limits.max} photos
        </p>
      </div>

      <ul aria-label="Photos" className="grid grid-cols-3 gap-2 tablet:grid-cols-4">
        {value.map((photo, index) => (
          <li
            key={photo.id}
            data-sort-index={index}
            onPointerDown={(e) => onPointerDown(e, index)}
            onContextMenu={(e) => e.preventDefault()}
            className={cx(
              tile,
              'cursor-grab touch-manipulation select-none [-webkit-touch-callout:none] active:cursor-grabbing',
              'transition-[transform,box-shadow,opacity] duration-120 ease-out',
              drag?.from === index && 'z-10 scale-[1.04] opacity-80 shadow-overlay',
              drag && drag.over === index && drag.from !== index && 'ring-2 ring-action ring-offset-2',
            )}
          >
            <img src={photo.url} alt={photo.alt} draggable={false} className="size-full object-cover" />
            {index === 0 && (
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ink/85 px-2 py-0.5 text-caption text-paper">
                Cover
              </span>
            )}
            <PhotoMenu
              index={index}
              count={value.length}
              onAction={(action) => {
                if (action === 'cover') onChange(move(value, index, 0))
                if (action === 'earlier') onChange(move(value, index, index - 1))
                if (action === 'later') onChange(move(value, index, index + 1))
                if (action === 'remove') onChange(value.filter((p) => p.id !== photo.id))
              }}
            />
          </li>
        ))}

        {pending.map((entry) => (
          <li
            key={entry.key}
            aria-label={
              entry.status === 'failed' ? `Upload failed: ${entry.file.name}` : `Uploading ${entry.file.name}`
            }
            className={cx(tile, entry.status === 'failed' && 'border-danger')}
          >
            <img src={entry.preview} alt="" className="size-full object-cover opacity-60" />
            {entry.status === 'failed' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-surface/85 p-2 text-center">
                <CircleAlert aria-hidden className="size-5 text-danger" />
                <p className="text-caption font-semibold text-ink">Upload failed</p>
                <p className="sr-only">{entry.error}</p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => void upload(entry)}
                    className="inline-flex min-h-9 items-center gap-1 rounded-control bg-action px-2 text-caption font-semibold text-action-foreground"
                  >
                    <RotateCcw aria-hidden className="size-3.5" />
                    Retry
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${entry.file.name}`}
                    onClick={() => discard(entry)}
                    className="inline-flex size-9 items-center justify-center rounded-control text-muted hover:bg-cloud"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="absolute inset-x-2 bottom-2 flex flex-col gap-1">
                <span className="flex items-center gap-1 text-caption font-semibold text-ink">
                  <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
                  {entry.status === 'preparing' ? 'Preparing' : `${Math.round(entry.progress * 100)}%`}
                </span>
                <div
                  role="progressbar"
                  aria-label={`Uploading ${entry.file.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(entry.progress * 100)}
                  className="h-1 overflow-hidden rounded-full bg-border"
                >
                  <div
                    className="h-full origin-left rounded-full bg-action transition-transform duration-200"
                    style={{
                      transform: `scaleX(${entry.status === 'preparing' ? 0.05 : Math.max(entry.progress, 0.05)})`,
                    }}
                  />
                </div>
              </div>
            )}
          </li>
        ))}

        <li className={cx(value.length + pending.length === 0 && 'col-span-3 tablet:col-span-4')}>
          <label
            onDragOver={(e) => {
              e.preventDefault()
              setDropping(true)
            }}
            onDragLeave={() => setDropping(false)}
            onDrop={onDrop}
            className={cx(
              'flex size-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-control border-2 border-dashed p-3 text-center transition-colors duration-120',
              value.length + pending.length === 0 ? 'min-h-40' : 'aspect-square',
              dropping ? 'border-action bg-mint' : 'border-border bg-surface hover:border-action/60',
              room <= 0 && 'cursor-not-allowed opacity-50',
              'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus',
            )}
          >
            <ImagePlus aria-hidden className="size-6 text-action" />
            <span className="text-compact font-semibold text-ink">Add photos</span>
            {value.length + pending.length === 0 && (
              <span className="text-caption text-muted">Up to {limits.max}. JPG, PNG or WebP.</span>
            )}
            <input
              type="file"
              aria-label="Add photos"
              accept={ACCEPTED_PHOTO_TYPES.join(',')}
              multiple
              disabled={room <= 0}
              onChange={(e) => {
                addFiles([...(e.target.files ?? [])])
                e.target.value = ''
              }}
              className="sr-only"
            />
          </label>
        </li>
      </ul>

      {notices.length > 0 && (
        <ul role="status" className="flex flex-col gap-1">
          {notices.map((notice) => (
            <li key={notice} className="flex items-start gap-1.5 text-compact text-ink">
              <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
              {notice}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-compact text-danger">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
      <div id={hintId} className="rounded-control border border-border bg-surface p-3 text-compact text-muted">
        <p className="font-semibold text-ink">{PHOTO_TIP}</p>
        <p className="mt-1">
          Daylight works best. Show every side and its current state. The first photo is the cover; drag to reorder, or
          press and hold on a phone.
        </p>
      </div>
    </div>
  )
}

type PhotoAction = 'cover' | 'earlier' | 'later' | 'remove'

function PhotoMenu({
  index,
  count,
  onAction,
}: {
  index: number
  count: number
  onAction: (action: PhotoAction) => void
}) {
  const items: { id: PhotoAction; label: string }[] = [
    ...(index > 0
      ? [
          { id: 'cover' as const, label: 'Make cover' },
          { id: 'earlier' as const, label: 'Move earlier' },
        ]
      : []),
    ...(index < count - 1 ? [{ id: 'later' as const, label: 'Move later' }] : []),
    { id: 'remove', label: 'Remove' },
  ]

  return (
    <MenuTrigger>
      <Button
        aria-label={`Photo ${index + 1} options`}
        className="absolute top-1 right-1 flex size-9 items-center justify-center rounded-full bg-ink/70 text-paper outline-none data-focus-visible:ring-2 data-focus-visible:ring-focus data-pressed:scale-95"
      >
        <Ellipsis aria-hidden className="size-5" />
      </Button>
      <Popover
        placement="bottom end"
        className="min-w-44 rounded-control border border-border bg-surface p-1 shadow-overlay outline-none"
      >
        <Menu onAction={(key) => onAction(key as PhotoAction)} items={items} className="outline-none">
          {(item) => (
            <MenuItem
              id={item.id}
              className={cx(
                'flex min-h-11 cursor-pointer items-center rounded-small px-3 text-compact outline-none data-focused:bg-cloud',
                item.id === 'remove' ? 'text-danger' : 'text-ink',
              )}
            >
              {item.label}
            </MenuItem>
          )}
        </Menu>
      </Popover>
    </MenuTrigger>
  )
}

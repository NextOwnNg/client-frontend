import { Bookmark, LoaderCircle, Settings2 } from 'lucide-react'
import { lazy, Suspense, useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Banner } from '@/components/ui/Banner'
import { ButtonLink, PlainButton } from '@/components/ui/Button'
import { isAvailable } from '@/lib/copy/status'
import { cx } from '@/lib/cx'
import { useSessionStore } from '@/stores/session'
import { unavailableMessage } from '@/features/listings/copy'
import { useIsSaved, useToggleSave } from '@/features/saved/api'
import type { Intent } from '@/features/listings/components/SignInPrompt'
import type { ListingDetail } from '@/types/api'

const loadSignInPrompt = () => import('@/features/listings/components/SignInPrompt')

const SignInPrompt = lazy(() => loadSignInPrompt().then((m) => ({ default: m.SignInPrompt })))

type OfferActionsProps = {
  listing: ListingDetail
  /** Fetches the listing again; resolves with the fresh copy (FE-LDT-03: recheck before acting). */
  recheck: () => Promise<ListingDetail | undefined>
  layout: 'panel' | 'bar'
}

/**
 * The decision point. Available: Make an offer + Save. Own listing: Manage. Unavailable: an honest message and
 * a disabled button. Every tap rechecks the listing first, so a stale page never sends anyone forward.
 */
export function OfferActions({ listing, recheck, layout }: OfferActionsProps) {
  const userId = useSessionStore((s) => s.userId)
  const restricted = useSessionStore((s) => s.restricted)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [checking, setChecking] = useState(false)
  const [intent, setIntent] = useState<Intent | null>(null)
  const [promptOpen, setPromptOpen] = useState(false)
  const available = isAvailable(listing.status)
  const own = userId !== null && userId === listing.seller.id
  const bar = layout === 'bar'
  const saved = useIsSaved('listing', listing.id)
  const toggleSave = useToggleSave()

  async function act(next: Intent) {
    // Saving works in any state, so only an offer needs the fresh check (FE-LDT-03)
    if (next === 'save') {
      if (userId) toggleSave.mutate({ kind: 'listing', id: listing.id, on: !saved })
      else {
        setIntent(next)
        setPromptOpen(true)
      }
      return
    }
    setChecking(true)
    const fresh = await recheck().finally(() => setChecking(false))
    if (!fresh || !isAvailable(fresh.status)) return
    if (!userId) {
      setIntent(next)
      setPromptOpen(true)
    } else void navigate(`/offers/new?listing=${fresh.id}`)
  }

  // Back from signing in with `?intent=save` (QA-01): finish the save once, then tidy the URL
  const resumed = useRef(false)
  const resumeSave = useEffectEvent(() => {
    resumed.current = true
    const rest = new URLSearchParams(params)
    rest.delete('intent')
    setParams(rest, { replace: true, preventScrollReset: true })
    // Saving is the intent: an item that is already saved stays saved
    toggleSave.mutate({ kind: 'listing', id: listing.id, on: true })
  })
  useEffect(() => {
    if (!resumed.current && userId && params.get('intent') === 'save') resumeSave()
  }, [userId, params])

  const save = (
    <PlainButton
      variant="secondary"
      aria-pressed={saved}
      onClick={() => void act('save')}
      onPointerEnter={loadSignInPrompt}
      fullWidth={!bar}
      className={cx(bar && 'shrink-0 px-5')}
    >
      <Bookmark aria-hidden className={cx('size-5', saved && 'fill-current')} />
      {saved ? 'Saved' : 'Save'}
    </PlainButton>
  )

  let actions: ReactNode
  if (own) {
    actions = (
      <>
        <p className={cx('text-compact text-muted', bar && 'sr-only')}>This is your listing.</p>
        <ButtonLink
          to={`/listings/${listing.id}/edit`}
          variant="secondary"
          fullWidth={!bar}
          className={cx(bar && 'flex-1')}
        >
          <Settings2 aria-hidden className="size-5" />
          Manage listing
        </ButtonLink>
      </>
    )
  } else if (restricted && available) {
    actions = (
      <>
        <p className={cx('text-compact text-ink', bar && 'min-w-0 flex-1')}>
          Your account can’t make offers right now.{' '}
          <Link to="/support?topic=appeal" className="font-semibold text-action underline-offset-4 hover:underline">
            Why?
          </Link>
        </p>
        {save}
      </>
    )
  } else if (!available) {
    actions = (
      <>
        {!bar && <Banner tone="warning" title={unavailableMessage(listing.status)} />}
        <div className={cx('flex w-full gap-3', !bar && 'flex-col')}>
          <PlainButton variant="primary" disabled className={cx(bar && 'flex-1')} fullWidth={!bar}>
            Not accepting offers
          </PlainButton>
          {save}
        </div>
      </>
    )
  } else {
    actions = (
      <div className={cx('flex w-full gap-3', !bar && 'flex-col')}>
        <PlainButton
          variant="primary"
          aria-busy={checking || undefined}
          disabled={checking}
          onClick={() => void act('offer')}
          onPointerEnter={loadSignInPrompt}
          onTouchStart={loadSignInPrompt}
          className={cx(bar && 'flex-1')}
          fullWidth={!bar}
        >
          {checking && <LoaderCircle aria-hidden className="size-5 animate-spin" />}
          Make an offer
        </PlainButton>
        {save}
      </div>
    )
  }

  return (
    <>
      {bar ? (
        <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-sm desktop:hidden">
          {!available && !own && (
            <p className="mb-2 text-compact font-semibold text-ink">{unavailableMessage(listing.status)}</p>
          )}
          <div className="mx-auto flex max-w-content items-center gap-3">{actions}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">{actions}</div>
      )}
      {intent && (
        <Suspense fallback={null}>
          <SignInPrompt intent={intent} open={promptOpen} listing={listing} onClose={() => setPromptOpen(false)} />
        </Suspense>
      )}
    </>
  )
}

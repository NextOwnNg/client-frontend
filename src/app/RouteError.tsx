import { useEffect } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Seo } from '@/components/seo/Seo'
import { ButtonLink, PlainButton } from '@/components/ui/Button'
import { cx } from '@/lib/cx'
import { NotFoundPage } from '@/pages/NotFoundPage'

const RELOAD_KEY = 'nextown-chunk-reload'
/** A second failure inside this window is shown instead of reloaded, so a lasting fault never loops. */
const RELOAD_WINDOW_MS = 30_000

/**
 * A page's code failed to download: the connection dropped, or a deploy replaced the files the open
 * tab still points at. Browsers word it differently.
 */
const isChunkFailure = (error: unknown) =>
  error instanceof Error &&
  /dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(error.message)

/** Reload once on a failed download, which fetches the current files. False when it already tried. */
function claimAutoReload(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY))
    if (Date.now() - last < RELOAD_WINDOW_MS) return false
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
    return true
  } catch {
    // No storage, no way to know whether we already tried: ask instead of risking a loop
    return false
  }
}

function RouteErrorView({ fullPage }: { fullPage: boolean }) {
  const error = useRouteError()
  const chunk = isChunkFailure(error)
  const offline = typeof navigator !== 'undefined' && !navigator.onLine

  useEffect(() => {
    if (chunk && !offline && claimAutoReload()) window.location.reload()
  }, [chunk, offline])

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />

  const title = chunk ? 'This page didn’t load' : 'Something went wrong'
  const body = offline
    ? 'You’re offline. Reconnect, then reload the page.'
    : chunk
      ? 'Your connection may have dropped, or NextOwn was just updated. Reload to get the latest version.'
      : 'This page hit a problem. Reload to try again, or go back to the marketplace.'
  const Wrapper = fullPage ? 'main' : 'section'

  return (
    <Wrapper
      role="alert"
      className={cx(
        'flex flex-col items-start gap-4',
        fullPage ? 'mx-auto min-h-dvh max-w-content justify-center px-4' : 'py-12',
      )}
    >
      <Seo title={title} noindex />
      <h1 className="text-h2 text-ink tablet:text-h1">{title}</h1>
      <p className="max-w-prose text-body text-muted">{body}</p>
      <div className="flex flex-wrap gap-3">
        <PlainButton onClick={() => window.location.reload()}>Reload page</PlainButton>
        <ButtonLink to="/" variant="secondary">
          Go to the marketplace
        </ButtonLink>
      </div>
      {import.meta.env.DEV && error instanceof Error && (
        <details className="w-full max-w-prose text-compact text-muted">
          <summary className="cursor-pointer">Error details (development only)</summary>
          <pre className="mt-2 overflow-x-auto rounded-control bg-cloud p-3 text-caption whitespace-pre-wrap">
            {error.stack ?? error.message}
          </pre>
        </details>
      )}
    </Wrapper>
  )
}

/** Last resort for anything outside the app shell (sign-in, a layout that failed to load): a full page. */
export function RootError() {
  return <RouteErrorView fullPage />
}

/** For pages inside the app shell: the header and navigation stay, so the person can move on. */
export function PageError() {
  return <RouteErrorView fullPage={false} />
}

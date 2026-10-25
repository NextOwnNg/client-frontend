import { Link } from 'react-router'
import { Seo } from '@/components/seo/Seo'

/** Shared by unknown routes and inaccessible private resources, so neither leaks existence (QA-16). */
export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-content flex-col items-start justify-center gap-4 px-4">
      <Seo title="Page not found" noindex />
      <h1 className="text-h2 text-ink tablet:text-h1">We couldn't find that page</h1>
      <p className="text-body text-muted">It may have moved, or you may not have access to it.</p>
      <Link to="/" className="text-body font-medium text-action underline underline-offset-4">
        Go to the marketplace
      </Link>
    </main>
  )
}

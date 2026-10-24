const PROBE_ORIGIN = 'https://nextown.invalid'
const AUTH_FLOW = /^\/(login|verify|onboarding)(\/|$)/

/**
 * Where to go after signing in. Only a same-origin relative path is honoured (PRD §6.3: no open redirects);
 * anything else, or a page inside the sign-in flow itself, falls back to home.
 */
export function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/'
  let url: URL
  try {
    url = new URL(raw, PROBE_ORIGIN)
  } catch {
    return '/'
  }
  if (url.origin !== PROBE_ORIGIN || AUTH_FLOW.test(url.pathname)) return '/'
  return url.pathname + url.search + url.hash
}

export const loginPath = (next: string) => `/login?next=${encodeURIComponent(next)}`
export const onboardingPath = (next: string) => `/onboarding?next=${encodeURIComponent(next)}`

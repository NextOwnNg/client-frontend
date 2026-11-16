const PROBE_ORIGIN = 'https://nextown.invalid'
const AUTH_FLOW = /^\/(login|signup|verify|forgot-password|reset-password|onboarding)(\/|$)/

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

const withNext = (path: string, next: string) => `${path}?next=${encodeURIComponent(next)}`

export const loginPath = (next: string) => withNext('/login', next)
export const signupPath = (next: string) => withNext('/signup', next)
export const verifyPath = (next: string) => withNext('/verify', next)
export const forgotPasswordPath = (next: string) => withNext('/forgot-password', next)
export const resetPasswordPath = (next: string) => withNext('/reset-password', next)
export const onboardingPath = (next: string) => withNext('/onboarding', next)

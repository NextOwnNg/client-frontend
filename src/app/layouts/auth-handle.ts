/**
 * What a sign-in route shows beside its form. `always`: the example trade on every screen size (sign in).
 * `desktop`: from 1024px only, so phones keep their attention on the form (codes, password reset).
 */
export type AuthHandle = { showcase?: 'always' | 'desktop' }

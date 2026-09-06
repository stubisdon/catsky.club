// Cloudflare Turnstile site key (public), read once at build time.
//
// This lives in utils rather than alongside the widget so that non-React code
// (src/utils/emailCapture.ts) can branch on it without importing a component —
// utils must not depend on components.
//
// When unset, the widget renders nothing and the client sends no token. The server
// still enforces via siteverify whenever TURNSTILE_SECRET_KEY is configured, so an
// unset site key degrades the UX, never the protection.
export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || ''

/**
 * Ghost Content API access helpers.
 *
 * The Content API key is injected into `index.html` as
 * `#ghost-portal-config[data-key]` so Ghost Portal and this SPA read the same
 * value. Shared here because both the subscription layer and the read section
 * need it.
 */
export function getGhostContentApiKey(): string {
  const el = document.getElementById('ghost-portal-config')
  if (!el) return ''
  const key = el.getAttribute('data-key')
  return typeof key === 'string' ? key.trim() : ''
}

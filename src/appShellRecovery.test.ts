import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test, vi } from 'vitest'

const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
const recoveryScript = indexHtml.match(/<script data-app-shell-recovery>([\s\S]*?)<\/script>/)?.[1]

function runRecoveryScript({ attempted = false } = {}) {
  const listeners = new Map<string, (event: { target: unknown }) => void>()
  const replace = vi.fn()
  const root = { children: { length: 0 }, textContent: '', innerHTML: '' }
  class FakeScript { type = 'module' }
  const storage = new Map<string, string>()
  if (attempted) storage.set('catsky_app_shell_recovery_attempted', 'true')
  const fakeWindow = {
    location: { href: 'https://catsky.club/?action=signup', replace },
    addEventListener: (name: string, handler: (event: { target: unknown }) => void) => listeners.set(name, handler),
    setTimeout: vi.fn(),
  }
  const fakeDocument = { getElementById: () => root }
  const runner = new Function('window', 'document', 'sessionStorage', 'URL', 'HTMLScriptElement', 'Date', recoveryScript || '')
  runner(fakeWindow, fakeDocument, {
    getItem: (key: string) => storage.get(key) || null,
    setItem: (key: string, value: string) => storage.set(key, value),
  }, URL, FakeScript, { now: () => 123 })

  listeners.get('error')?.({ target: new FakeScript() })
  return { replace, root }
}

describe('app shell recovery', () => {
  test('reloads once when the module script fails and the app root is empty', () => {
    const { replace } = runRecoveryScript()
    expect(replace).toHaveBeenCalledOnce()
    expect(replace).toHaveBeenCalledWith('https://catsky.club/?action=signup&__catsky_reload=123')
  })

  test('does not reload again after a recovery attempt', () => {
    const { replace, root } = runRecoveryScript({ attempted: true })
    expect(replace).not.toHaveBeenCalled()
    expect(root.innerHTML).toContain('we could not load Catsky Club')
  })
})

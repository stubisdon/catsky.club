import { describe, expect, test, vi } from 'vitest'
import { removeAppShellRecoveryMarker } from './appShellRecovery'

describe('removeAppShellRecoveryMarker', () => {
  test('removes only the recovery marker after the app mounts', () => {
    window.history.replaceState({}, '', '/?action=signup&__catsky_reload=123&success=true#portal/account')
    const replaceState = vi.spyOn(window.history, 'replaceState')

    removeAppShellRecoveryMarker()

    expect(replaceState).toHaveBeenCalledWith({}, '', '/?action=signup&success=true#portal/account')
    replaceState.mockRestore()
  })

  test('does nothing when there is no recovery marker', () => {
    window.history.replaceState({}, '', '/listen?from=nav')
    const replaceState = vi.spyOn(window.history, 'replaceState')

    removeAppShellRecoveryMarker()

    expect(replaceState).not.toHaveBeenCalled()
    replaceState.mockRestore()
  })
})

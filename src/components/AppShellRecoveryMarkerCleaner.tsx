import { useEffect } from 'react'
import { removeAppShellRecoveryMarker } from '../utils/appShellRecovery'

export function AppShellRecoveryMarkerCleaner() {
  useEffect(() => {
    removeAppShellRecoveryMarker()
  }, [])

  return null
}

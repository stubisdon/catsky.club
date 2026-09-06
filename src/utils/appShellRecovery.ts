const RECOVERY_PARAM = '__catsky_reload'

export function removeAppShellRecoveryMarker() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has(RECOVERY_PARAM)) return

  url.searchParams.delete(RECOVERY_PARAM)
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

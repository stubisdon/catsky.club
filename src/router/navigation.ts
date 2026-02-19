/**
 * Client-side navigation utilities
 * 
 * Uses HTML5 History API for SPA navigation without full page reloads.
 * All internal navigation should use navigateTo() to ensure proper routing.
 */

/**
 * Navigate to a path using pushState and dispatch popstate event
 * This triggers the Router component to update the view
 */
export function navigateTo(path: string): void {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

/**
 * Replace current history entry without adding a new one
 */
export function replaceState(path: string): void {
  window.history.replaceState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

/**
 * Navigate back in history
 */
export function goBack(): void {
  window.history.back()
}

/**
 * Get the current pathname
 */
export function getCurrentPath(): string {
  return window.location.pathname
}

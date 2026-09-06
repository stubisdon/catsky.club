import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TurnstileWidgetProps } from './TurnstileWidget'

type TurnstileWindow = Window & {
  turnstile?: {
    render: (el: HTMLElement, opts: Record<string, unknown>) => string
    reset: (id?: string) => void
    remove: (id?: string) => void
  }
}

async function loadTurnstileWidget() {
  return import('./TurnstileWidget')
}

function stubTurnstile(renderImpl?: (el: HTMLElement, opts: Record<string, unknown>) => string) {
  const renderMock = vi.fn(renderImpl ?? (() => 'widget-1'))
  const removeMock = vi.fn()
  const resetMock = vi.fn()
  ;(window as TurnstileWindow).turnstile = {
    render: renderMock,
    remove: removeMock,
    reset: resetMock,
  }
  return { renderMock, removeMock, resetMock }
}

describe('TurnstileWidget', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    delete (window as TurnstileWindow).turnstile
    document.head.querySelectorAll('script[src*="turnstile"]').forEach((node) => node.remove())
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllEnvs()
  })

  it('renders null when the site key is empty', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '')
    const { TurnstileWidget } = await loadTurnstileWidget()
    const onToken = vi.fn<TurnstileWidgetProps['onToken']>()

    const { container } = render(<TurnstileWidget onToken={onToken} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders a container and calls turnstile.render once with a stubbed window.turnstile', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'test-site-key')
    const { renderMock } = stubTurnstile()
    const { TurnstileWidget } = await loadTurnstileWidget()
    const onToken = vi.fn<TurnstileWidgetProps['onToken']>()

    const { container } = render(<TurnstileWidget onToken={onToken} />)

    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(1))
    expect(container.querySelector('.catsky-turnstile')).toBeTruthy()
  })

  it('propagates a token through onToken via the turnstile callback', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'test-site-key')
    let capturedOpts: Record<string, unknown> | null = null
    const { renderMock } = stubTurnstile((_el, opts) => {
      capturedOpts = opts
      return 'widget-1'
    })
    const { TurnstileWidget } = await loadTurnstileWidget()
    const onToken = vi.fn<TurnstileWidgetProps['onToken']>()

    render(<TurnstileWidget onToken={onToken} />)
    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(1))

    act(() => {
      const callback = capturedOpts?.callback as (token: string) => void
      callback('tok-123')
    })

    expect(onToken).toHaveBeenCalledWith('tok-123')
  })

  it('propagates null through onToken via expired-callback', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'test-site-key')
    let capturedOpts: Record<string, unknown> | null = null
    const { renderMock } = stubTurnstile((_el, opts) => {
      capturedOpts = opts
      return 'widget-1'
    })
    const { TurnstileWidget } = await loadTurnstileWidget()
    const onToken = vi.fn<TurnstileWidgetProps['onToken']>()

    render(<TurnstileWidget onToken={onToken} />)
    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(1))

    act(() => {
      const expiredCallback = capturedOpts?.['expired-callback'] as () => void
      expiredCallback()
    })

    expect(onToken).toHaveBeenCalledWith(null)
  })

  it('propagates null through onToken via error-callback', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'test-site-key')
    let capturedOpts: Record<string, unknown> | null = null
    const { renderMock } = stubTurnstile((_el, opts) => {
      capturedOpts = opts
      return 'widget-1'
    })
    const { TurnstileWidget } = await loadTurnstileWidget()
    const onToken = vi.fn<TurnstileWidgetProps['onToken']>()

    render(<TurnstileWidget onToken={onToken} />)
    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(1))

    act(() => {
      const errorCallback = capturedOpts?.['error-callback'] as () => void
      errorCallback()
    })

    expect(onToken).toHaveBeenCalledWith(null)
  })

  it('calls turnstile.remove on unmount', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'test-site-key')
    const { renderMock, removeMock } = stubTurnstile()
    const { TurnstileWidget } = await loadTurnstileWidget()
    const onToken = vi.fn<TurnstileWidgetProps['onToken']>()

    const { unmount } = render(<TurnstileWidget onToken={onToken} />)
    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(1))

    unmount()

    expect(removeMock).toHaveBeenCalledWith('widget-1')
  })

  it('resets the widget and emits null when resetSignal changes', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'test-site-key')
    const { renderMock, resetMock } = stubTurnstile()
    const { TurnstileWidget } = await loadTurnstileWidget()
    const onToken = vi.fn<TurnstileWidgetProps['onToken']>()

    const { rerender } = render(<TurnstileWidget onToken={onToken} resetSignal={0} />)
    await waitFor(() => expect(renderMock).toHaveBeenCalledTimes(1))
    expect(onToken).not.toHaveBeenCalled()

    rerender(<TurnstileWidget onToken={onToken} resetSignal={1} />)

    expect(resetMock).toHaveBeenCalledWith('widget-1')
    expect(onToken).toHaveBeenCalledWith(null)
  })
})

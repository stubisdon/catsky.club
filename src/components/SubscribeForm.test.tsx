import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import SubscribeForm from './SubscribeForm'

describe('SubscribeForm', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        statusText: 'Created',
        json: vi.fn().mockResolvedValue({ success: true }),
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the optional body copy and a default submit label', () => {
    render(<SubscribeForm source="test_source" body="stay in the loop." />)

    expect(screen.getByText('stay in the loop.')).toBeInTheDocument()
    expect(screen.getByTestId('subscribe-submit')).toHaveTextContent('subscribe')
  })

  it('honors a custom submit label', () => {
    render(<SubscribeForm source="test_source" submitLabel="notify me" />)

    expect(screen.getByTestId('subscribe-submit')).toHaveTextContent('notify me')
  })

  it('forwards labels to the magic-link request', async () => {
    render(<SubscribeForm source="test_source" labels={['sugar-daddy']} />)

    fireEvent.change(screen.getByTestId('subscribe-email'), { target: { value: 'ada@example.com' } })
    await act(async () => {
      fireEvent.submit(screen.getByTestId('subscribe-submit').closest('form')!)
      await Promise.resolve()
      await Promise.resolve()
    })

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(options.body as string)
    expect(body).toMatchObject({ email: 'ada@example.com', emailType: 'signup', labels: ['sugar-daddy'] })
  })

  it('calls onSuccess once the magic link request succeeds', async () => {
    const onSuccess = vi.fn()
    render(<SubscribeForm source="test_source" onSuccess={onSuccess} />)

    fireEvent.change(screen.getByTestId('subscribe-email'), { target: { value: 'ada@example.com' } })
    await act(async () => {
      fireEvent.submit(screen.getByTestId('subscribe-submit').closest('form')!)
      await Promise.resolve()
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(screen.getByTestId('subscribe-confirmation')).toBeInTheDocument()
    })
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('does not call onSuccess when the request fails', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: vi.fn().mockResolvedValue({ error: 'nope' }),
    })
    const onSuccess = vi.fn()
    render(<SubscribeForm source="test_source" onSuccess={onSuccess} />)

    fireEvent.change(screen.getByTestId('subscribe-email'), { target: { value: 'ada@example.com' } })
    await act(async () => {
      fireEvent.submit(screen.getByTestId('subscribe-submit').closest('form')!)
      await Promise.resolve()
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(screen.getByTestId('subscribe-error')).toBeInTheDocument()
    })
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('resets email, status and error back to idle when active turns false', async () => {
    const { rerender } = render(<SubscribeForm source="test_source" active />)

    fireEvent.change(screen.getByTestId('subscribe-email'), { target: { value: 'not-an-email' } })
    await act(async () => {
      fireEvent.submit(screen.getByTestId('subscribe-submit').closest('form')!)
      await Promise.resolve()
    })
    expect(screen.getByTestId('subscribe-error')).toBeInTheDocument()

    rerender(<SubscribeForm source="test_source" active={false} />)
    rerender(<SubscribeForm source="test_source" active />)

    expect(screen.queryByTestId('subscribe-error')).not.toBeInTheDocument()
    expect(screen.getByTestId('subscribe-email')).toHaveValue('')
  })
})

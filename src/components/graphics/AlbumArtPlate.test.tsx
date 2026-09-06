import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AlbumArtPlate from './AlbumArtPlate'

describe('AlbumArtPlate', () => {
  it('does not render the CATSKY wordmark', () => {
    render(
      <AlbumArtPlate seed="collection-one" title="Volume One" caption="five tracks" />
    )

    const svgText = screen.getByRole('img').textContent
    expect(svgText).not.toContain('CATSKY')
  })

  it('still renders the title text', () => {
    render(
      <AlbumArtPlate seed="collection-one" title="Volume One" caption="five tracks" />
    )

    const svgText = screen.getByRole('img').textContent
    expect(svgText).toContain('Volume One')
  })

  it('still renders the caption text in uppercase', () => {
    render(
      <AlbumArtPlate seed="collection-one" title="Volume One" caption="five tracks" />
    )

    const svgText = screen.getByRole('img').textContent
    expect(svgText).toContain('FIVE TRACKS')
  })
})

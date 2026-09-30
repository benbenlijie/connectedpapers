import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GraphTimeline from './GraphTimeline'
import { useUiStore } from '../../store/useUiStore'

beforeEach(() => {
  useUiStore.setState({ timelineYear: null, timelinePlaying: false })
})

describe('GraphTimeline', () => {
  it('shows 全部年份 when no year filter is active', () => {
    render(<GraphTimeline minYear={2000} maxYear={2020} />)
    expect(screen.getByText('全部年份')).toBeInTheDocument()
    expect(screen.getByText(/仅显示该年份及更早/)).toBeInTheDocument()
  })

  it('shows the active upper bound and resets to 全部年份', () => {
    useUiStore.setState({ timelineYear: 2010 })
    render(<GraphTimeline minYear={2000} maxYear={2020} />)
    expect(screen.getByText('≤ 2010 年')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '全部' }))
    expect(useUiStore.getState().timelineYear).toBeNull()
  })

  it('starts playback from the earliest year when idle', () => {
    render(<GraphTimeline minYear={2000} maxYear={2020} />)
    fireEvent.click(screen.getByRole('button', { name: '播放' }))
    expect(useUiStore.getState().timelineYear).toBe(2000)
    expect(useUiStore.getState().timelinePlaying).toBe(true)
  })

  it('splits the track around the root year when provided', () => {
    render(<GraphTimeline minYear={2000} maxYear={2020} rootYear={2012} />)
    expect(screen.getByText('前置 ≤ 2012')).toBeInTheDocument()
    expect(screen.getByText('后续 > 2012')).toBeInTheDocument()
  })

  it('omits the split when the root year is outside the range', () => {
    render(<GraphTimeline minYear={2000} maxYear={2020} rootYear={1990} />)
    expect(screen.queryByText(/前置/)).not.toBeInTheDocument()
  })
})

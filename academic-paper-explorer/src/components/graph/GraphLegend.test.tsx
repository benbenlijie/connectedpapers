import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GraphLegend from './GraphLegend'
import { useUiStore } from '../../store/useUiStore'

beforeEach(() => {
  useUiStore.setState({ colorMode: 'cluster', hiddenEdgeTypes: [] })
})

describe('GraphLegend edge toggles', () => {
  it('toggles an edge type when its legend entry is clicked', () => {
    render(<GraphLegend nodes={[]} />)
    const button = screen.getByRole('button', { name: /前置工作/ })
    fireEvent.click(button)
    expect(useUiStore.getState().hiddenEdgeTypes).toEqual(['reference'])
    expect(button).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(button)
    expect(useUiStore.getState().hiddenEdgeTypes).toEqual([])
  })

  it('invokes onSelectRoot when the root entry is clicked', () => {
    const onSelectRoot = vi.fn()
    render(<GraphLegend nodes={[]} onSelectRoot={onSelectRoot} />)
    fireEvent.click(screen.getByRole('button', { name: '根论文' }))
    expect(onSelectRoot).toHaveBeenCalledOnce()
  })
})

import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GraphLegend from './GraphLegend'
import { useUiStore } from '../../store/useUiStore'

beforeEach(() => {
  useUiStore.setState({ colorMode: 'cluster', hiddenEdgeTypes: [] })
})

describe('GraphLegend edge toggles', () => {
  it('toggles an edge type when its legend entry is clicked', () => {
    render(<GraphLegend nodes={[]} />)
    const button = screen.getByRole('button', { name: '参考关系' })
    fireEvent.click(button)
    expect(useUiStore.getState().hiddenEdgeTypes).toEqual(['reference'])
    expect(button).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(button)
    expect(useUiStore.getState().hiddenEdgeTypes).toEqual([])
  })
})

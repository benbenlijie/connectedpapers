import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const captured: { props?: any } = {}

vi.mock('react-force-graph-3d', () => ({
  default: (props: any) => {
    captured.props = props
    return null
  },
}))

vi.mock('./labels3d', () => ({
  truncateTitle: (t: string) => t,
  createLabelSprite: vi.fn((text: string) => ({ __label: text, position: { set: vi.fn() } })),
}))

import ForceGraph3DWithLabels from './ForceGraph3DLazy'
import { createLabelSprite } from './labels3d'

const node = (over: Record<string, unknown>) => ({ id: 'n', title: 'Title', size: 8, ...over })

describe('ForceGraph3DWithLabels', () => {
  beforeEach(() => {
    captured.props = undefined
    vi.mocked(createLabelSprite).mockClear()
  })

  it('renders the label accessor and keeps default node objects extended', () => {
    render(<ForceGraph3DWithLabels labelIds={new Set(['a'])} />)
    expect(captured.props?.nodeThreeObjectExtend).toBe(true)
    expect(typeof captured.props?.nodeThreeObject).toBe('function')
  })

  it('builds a sprite only for labeled nodes', () => {
    render(<ForceGraph3DWithLabels labelIds={new Set(['a'])} />)
    const accessor = captured.props.nodeThreeObject
    expect(accessor(node({ id: 'a', title: 'Attention' }))).toBeTruthy()
    expect(createLabelSprite).toHaveBeenCalledWith('Attention', { height: 8 })
    expect(accessor(node({ id: 'b', title: 'Other' }))).toBeNull()
  })

  it('does not forward the labelIds prop to the underlying graph', () => {
    render(<ForceGraph3DWithLabels labelIds={new Set(['a'])} backgroundColor="#000" />)
    expect(captured.props.labelIds).toBeUndefined()
    expect(captured.props.backgroundColor).toBe('#000')
  })
})

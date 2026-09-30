import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GraphNodeList from './GraphNodeList'
import type { GraphNode } from '../../graph/graphAdapter'

const nodes: GraphNode[] = [
  { id: 'b', label: 'B', title: 'Paper B', citationCount: 5, authors: '', isRoot: false, pageRankScore: 0, clusterId: 0, size: 5, color: '#fff', year: 2010, val: 5 },
  { id: 'a', label: 'A', title: 'Paper A', citationCount: 10, authors: '', isRoot: true, pageRankScore: 0, clusterId: 0, size: 5, color: '#fff', year: 2000, val: 5 },
]

describe('GraphNodeList', () => {
  it('lists nodes sorted by citations and selects on click', () => {
    const onSelect = vi.fn()
    render(
      <GraphNodeList nodes={nodes} selectedId="a" onSelect={onSelect} onReroot={vi.fn()} onClose={vi.fn()} />,
    )
    const buttons = screen.getAllByRole('button').filter((b) => b.getAttribute('title'))
    expect(buttons[0]).toHaveTextContent('Paper A')
    fireEvent.click(buttons[0])
    expect(onSelect).toHaveBeenCalledWith(nodes[1])
  })

  it('re-roots on double click and closes from the header', () => {
    const onReroot = vi.fn()
    const onClose = vi.fn()
    render(
      <GraphNodeList nodes={nodes} selectedId={null} onSelect={vi.fn()} onReroot={onReroot} onClose={onClose} />,
    )
    const row = screen.getAllByRole('button', { name: /Paper B/ })[0]
    fireEvent.doubleClick(row)
    expect(onReroot).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '关闭节点列表' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})

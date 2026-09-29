import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { useUrlSync } from './useUrlSync'
import { useUiStore } from '../store/useUiStore'

let nav: ReturnType<typeof useNavigate>

function Harness() {
  useUrlSync()
  const loc = useLocation()
  nav = useNavigate()
  return <div data-testid="search">{loc.search}</div>
}

function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Harness />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useUiStore.setState({
    selectedPaper: null, selectedNodeId: null, graphDepth: null, graphMaxNodes: null,
    comparePaper: null, compareSelectedNodeId: null,
    graphView: '2d', colorMode: 'cluster', sizeMode: 'citations', timelineYear: null,
    filters: { yearRange: [1990, new Date().getFullYear()], minCitations: 0, selectedFields: [], selectedVenues: [] },
  })
})

describe('useUrlSync', () => {
  it('hydrates the store from the URL on mount', () => {    renderAt('/?paper=DOI:10.1/x&d=2&mn=120&view=3d&color=year&tl=2015')
    const s = useUiStore.getState()
    expect(s.selectedPaper?.id).toBe('DOI:10.1/x')
    expect(s.graphDepth).toBe(2)
    expect(s.graphMaxNodes).toBe(120)
    expect(s.graphView).toBe('3d')
    expect(s.colorMode).toBe('year')
    expect(s.timelineYear).toBe(2015)
  })

  it('writes store changes back into the URL', () => {
    renderAt('/')
    act(() => {
      useUiStore.getState().submitQuery({ query: 'x', query_type: 'keyword' })
      useUiStore.getState().setTimelineYear(2020)
    })
    expect(screen.getByTestId('search').textContent).toContain('tl=2020')
  })

  it('encodes the selected root paper and view params', () => {
    renderAt('/')
    act(() => {
      useUiStore.getState().selectRootPaper({
        id: 'ABC', title: 't', citation_count: 1, authors: 'a', source: 'semantic_scholar',
      })
      useUiStore.getState().setGraphView('3d')
    })
    const search = screen.getByTestId('search').textContent ?? ''
    expect(search).toContain('paper=ABC')
    expect(search).toContain('view=3d')
  })

  it('does not clobber a deep link during hydration', () => {
    renderAt('/?paper=ABC&view=3d')
    const search = screen.getByTestId('search').textContent ?? ''
    expect(search).toContain('paper=ABC')
    expect(search).toContain('view=3d')
  })

  it('re-hydrates on back navigation without pushing extra history', () => {
    renderAt('/?paper=A&view=3d')
    act(() => nav('/?paper=B&view=3d'))
    expect(screen.getByTestId('search').textContent).toContain('paper=B')
    act(() => nav(-1))
    expect(screen.getByTestId('search').textContent).toContain('paper=A')
    expect(useUiStore.getState().selectedPaper?.id).toBe('A')
  })

  it('does not leak previous filters into a navigation that omits them', () => {
    renderAt('/?paper=A&cit=50')
    act(() => nav('/?paper=B'))
    const search = screen.getByTestId('search').textContent ?? ''
    expect(search).not.toContain('cit')
    expect(useUiStore.getState().filters.minCitations).toBe(0)
  })

  it('hydrates compare params from the URL', () => {
    renderAt('/?paper=A&paper2=B&node2=n2')
    const s = useUiStore.getState()
    expect(s.comparePaper?.id).toBe('B')
    expect(s.compareSelectedNodeId).toBe('n2')
  })

  it('writes the compare paper into the URL', () => {
    renderAt('/?paper=A')
    act(() =>
      useUiStore.getState().setComparePaper({
        id: 'B', title: 't', citation_count: 0, authors: '', source: 'semantic_scholar',
      }),
    )
    expect(screen.getByTestId('search').textContent).toContain('paper2=B')
  })
})

import type { Paper } from '../types/domain'
import type { ColorMode, SizeMode } from './encoding'

export interface UrlState {
  paperId: string | null
  depth: number | null
  maxNodes: number | null
  selectedNodeId: string | null
  graphView: '2d' | '3d'
  colorMode: ColorMode
  sizeMode: SizeMode
  timelineYear: number | null
  yearRange: [number, number]
  minCitations: number
  selectedFields: string[]
  selectedVenues: string[]
}

const COLOR_MODES: ColorMode[] = ['cluster', 'year', 'field']
const SIZE_MODES: SizeMode[] = ['citations', 'pagerank']
const DEPTH_MIN = 1
const DEPTH_MAX = 3
const MAX_NODES_MIN = 1
const MAX_NODES_MAX = 300

export function defaultUrlState(): UrlState {
  return {
    paperId: null,
    depth: null,
    maxNodes: null,
    selectedNodeId: null,
    graphView: '2d',
    colorMode: 'cluster',
    sizeMode: 'citations',
    timelineYear: null,
    yearRange: [1990, new Date().getFullYear()],
    minCitations: 0,
    selectedFields: [],
    selectedVenues: [],
  }
}

function parseIntOrNull(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function serializeUrlState(state: UrlState): string {
  const params = new URLSearchParams()
  const d = defaultUrlState()
  if (state.paperId) {
    params.set('paper', state.paperId)
    if (state.depth !== null) params.set('d', String(state.depth))
    if (state.maxNodes !== null) params.set('mn', String(state.maxNodes))
  }
  if (state.selectedNodeId) params.set('node', state.selectedNodeId)
  if (state.graphView === '3d') params.set('view', '3d')
  if (state.colorMode !== d.colorMode) params.set('color', state.colorMode)
  if (state.sizeMode !== d.sizeMode) params.set('size', state.sizeMode)
  if (state.timelineYear !== null) params.set('tl', String(state.timelineYear))
  if (state.yearRange[0] !== d.yearRange[0] || state.yearRange[1] !== d.yearRange[1]) {
    params.set('y0', String(state.yearRange[0]))
    params.set('y1', String(state.yearRange[1]))
  }
  if (state.minCitations !== d.minCitations) params.set('cit', String(state.minCitations))
  for (const f of state.selectedFields) params.append('f', f)
  for (const v of state.selectedVenues) params.append('v', v)
  return params.toString()
}

export function parseUrlState(search: string): UrlState {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const d = defaultUrlState()

  const depthRaw = parseIntOrNull(params.get('d'))
  const maxNodesRaw = parseIntOrNull(params.get('mn'))
  const years: [number, number] = [
    parseIntOrNull(params.get('y0')) ?? d.yearRange[0],
    parseIntOrNull(params.get('y1')) ?? d.yearRange[1],
  ]
  const color = params.get('color')
  const size = params.get('size')

  return {
    paperId: params.get('paper') || null,
    depth: depthRaw === null ? null : clamp(depthRaw, DEPTH_MIN, DEPTH_MAX),
    maxNodes: maxNodesRaw === null ? null : clamp(maxNodesRaw, MAX_NODES_MIN, MAX_NODES_MAX),
    selectedNodeId: params.get('node') || null,
    graphView: params.get('view') === '3d' ? '3d' : '2d',
    colorMode: COLOR_MODES.includes(color as ColorMode) ? (color as ColorMode) : d.colorMode,
    sizeMode: SIZE_MODES.includes(size as SizeMode) ? (size as SizeMode) : d.sizeMode,
    timelineYear: parseIntOrNull(params.get('tl')),
    yearRange: years,
    minCitations: Math.max(0, parseIntOrNull(params.get('cit')) ?? 0),
    selectedFields: params.getAll('f'),
    selectedVenues: params.getAll('v'),
  }
}

export function paperStubFromId(id: string): Paper {
  return {
    id,
    title: '',
    citation_count: 0,
    authors: '',
    source: 'semantic_scholar',
  }
}

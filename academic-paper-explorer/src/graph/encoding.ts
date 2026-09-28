import type { NetworkNode } from '../types/domain'

export type ColorMode = 'cluster' | 'year' | 'field'
export type SizeMode = 'citations' | 'pagerank'

const CLUSTER_PALETTE = [
  '#4ade80', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa',
  '#f87171', '#34d399', '#38bdf8', '#fb923c', '#c084fc',
]

const FIELD_PALETTE = [
  '#818cf8', '#22d3ee', '#facc15', '#f472b6',
  '#4ade80', '#fb923c', '#a78bfa', '#2dd4bf',
]

const MIN_YEAR = 1970
const FALLBACK_COLOR = '#6b7280'
const MIN_RADIUS = 6
const MAX_RADIUS = 30

export function yearColor(year?: number): string {
  if (!year) return FALLBACK_COLOR
  const maxYear = new Date().getFullYear()
  const t = Math.max(0, Math.min(1, (year - MIN_YEAR) / (maxYear - MIN_YEAR)))
  const hue = 220 - t * 220
  return `hsl(${Math.round(hue)}, 70%, 55%)`
}

export function fieldColor(fields?: string[]): string {
  const key = fields && fields.length > 0 ? fields[0] : ''
  if (!key) return FALLBACK_COLOR
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return FIELD_PALETTE[Math.abs(hash) % FIELD_PALETTE.length]
}

export function colorFor(node: NetworkNode, mode: ColorMode): string {
  switch (mode) {
    case 'cluster':
      return CLUSTER_PALETTE[Math.abs(node.clusterId) % CLUSTER_PALETTE.length]
    case 'year':
      return yearColor(node.year)
    case 'field':
      return fieldColor(node.fieldsOfStudy)
  }
}

export function sizeFor(node: NetworkNode, mode: SizeMode): number {
  const raw = mode === 'citations' ? Math.sqrt(Math.max(0, node.citationCount)) * 1.2 : Math.max(0, node.pageRankScore) * 600
  const value = MIN_RADIUS + raw
  return Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, value))
}

export function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return hex
  let h = m[1]
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

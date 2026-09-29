import type { NetworkEdge, NetworkNode } from '../types/domain'

export type ExportScope = 'visible' | 'full'

export interface ExportOptions {
  scope: ExportScope
  rootTitle?: string
  generatedAt?: string
}

export interface ExportPayload {
  meta: {
    generator: string
    scope: ExportScope
    root_title: string | null
    generated_at: string
    node_count: number
    edge_count: number
  }
  nodes: NetworkNode[]
  edges: NetworkEdge[]
}

const GENERATOR = 'connectedpapers'
const FALLBACK_SLUG = 'connectedpapers'
const MAX_SLUG_LENGTH = 80

export function sanitizeFilename(input: string): string {
  const cleaned = input
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-$/, '')
  return cleaned || FALLBACK_SLUG
}

export function exportFilename(rootTitle: string | undefined, ext: string, now: Date = new Date()): string {
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  return `${sanitizeFilename(rootTitle ?? '')}-${date}.${ext}`
}

export function buildExportPayload(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  opts: ExportOptions,
): ExportPayload {
  return {
    meta: {
      generator: GENERATOR,
      scope: opts.scope,
      root_title: opts.rootTitle ?? null,
      generated_at: opts.generatedAt ?? new Date().toISOString(),
      node_count: nodes.length,
      edge_count: edges.length,
    },
    nodes,
    edges,
  }
}

function triggerDownload(filename: string, href: string): void {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export function downloadText(filename: string, text: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  triggerDownload(filename, url)
  URL.revokeObjectURL(url)
}

export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string): void {
  triggerDownload(filename, canvas.toDataURL('image/png'))
}

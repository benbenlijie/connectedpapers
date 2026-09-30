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
): ExportPayload {  return {
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

function bibtexKey(node: NetworkNode): string {
  const first = (node.authors || 'anon').split(',')[0].trim().split(/\s+/).pop() || 'anon'
  return `${first}${node.year ?? ''}${node.id}`.replace(/[^A-Za-z0-9:_-]/g, '')
}

/** BibTeX entries for the given nodes. */
export function toBibtex(nodes: NetworkNode[]): string {
  return (
    nodes
      .map((node) => {
        const fields: string[] = []
        if (node.title) fields.push(`  title = {${node.title}}`)
        if (node.authors) fields.push(`  author = {${node.authors}}`)
        if (node.year) fields.push(`  year = {${node.year}}`)
        if (node.venue) fields.push(`  journal = {${node.venue}}`)
        if (node.url) fields.push(`  url = {${node.url}}`)
        return `@article{${bibtexKey(node)},\n${fields.join(',\n')}\n}`
      })
      .join('\n\n') + '\n'
  )
}

function csvCell(value: unknown): string {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** CSV (one row per node) for the given nodes. */
export function toCsv(nodes: NetworkNode[]): string {
  const header = ['id', 'title', 'authors', 'year', 'venue', 'citation_count', 'url']
  const rows = nodes.map((n) =>
    [n.id, n.title, n.authors, n.year, n.venue, n.citationCount, n.url].map(csvCell).join(','),
  )
  return [header.join(','), ...rows].join('\n') + '\n'
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

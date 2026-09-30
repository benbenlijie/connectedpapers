import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildExportPayload, sanitizeFilename, exportFilename, downloadText, toBibtex, toCsv } from './exportGraph'
import type { NetworkEdge, NetworkNode } from '../types/domain'

const node = (id: string, over: Partial<NetworkNode> = {}): NetworkNode => ({
  id, label: id, title: id, citationCount: 0, authors: '', isRoot: false,
  pageRankScore: 0, clusterId: 0, size: 1, color: '#000000', ...over,
})

const edge = (from: string, to: string): NetworkEdge => ({ from, to, type: 'reference', weight: 1 })

afterEach(() => vi.restoreAllMocks())

describe('sanitizeFilename', () => {
  it('replaces illegal characters and whitespace with dashes', () => {
    expect(sanitizeFilename('Attention: Is/All You\\Need?')).toBe('Attention-Is-All-You-Need')
  })

  it('falls back when nothing usable remains', () => {
    expect(sanitizeFilename('   ')).toBe('connectedpapers')
    expect(sanitizeFilename('///')).toBe('connectedpapers')
  })

  it('caps the length', () => {
    expect(sanitizeFilename('x'.repeat(200)).length).toBeLessThanOrEqual(80)
  })
})

describe('exportFilename', () => {
  it('builds slug + date + extension', () => {
    expect(exportFilename('Attention Is All You Need', 'json', new Date('2026-09-29T10:00:00Z')))
      .toBe('Attention-Is-All-You-Need-20260929.json')
  })

  it('falls back to a default slug', () => {
    expect(exportFilename('', 'png', new Date('2026-09-29T10:00:00Z')))
      .toBe('connectedpapers-20260929.png')
  })
})

describe('buildExportPayload', () => {
  it('marks scope and counts for a visible export', () => {
    const payload = buildExportPayload([node('a')], [edge('a', 'b')], {
      scope: 'visible', rootTitle: 'Root', generatedAt: '2026-09-29T00:00:00.000Z',
    })
    expect(payload.meta.scope).toBe('visible')
    expect(payload.meta.root_title).toBe('Root')
    expect(payload.meta.node_count).toBe(1)
    expect(payload.meta.edge_count).toBe(1)
    expect(payload.meta.generated_at).toBe('2026-09-29T00:00:00.000Z')
    expect(payload.nodes).toHaveLength(1)
    expect(payload.edges).toHaveLength(1)
  })

  it('treats a missing root title as null', () => {
    const payload = buildExportPayload([], [], { scope: 'full', generatedAt: '2026-09-29T00:00:00.000Z' })
    expect(payload.meta.scope).toBe('full')
    expect(payload.meta.root_title).toBeNull()
    expect(payload.meta.node_count).toBe(0)
  })
})

describe('downloadText', () => {
  it('creates an object URL and clicks an anchor', () => {
    const createUrl = vi.fn(() => 'blob:fake')
    const revokeUrl = vi.fn()
    const click = vi.fn()
    ;(URL as any).createObjectURL = createUrl
    ;(URL as any).revokeObjectURL = revokeUrl
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(click)

    downloadText('graph.json', '{"a":1}', 'application/json')

    expect(createUrl).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(revokeUrl).toHaveBeenCalledWith('blob:fake')
  })
})

describe('toBibtex', () => {
  it('emits an @article entry with title, author and year', () => {
    const out = toBibtex([node('a', { title: 'A Title', authors: 'Jane Doe', year: 2020 })])
    expect(out).toContain('@article{')
    expect(out).toContain('title = {A Title}')
    expect(out).toContain('author = {Jane Doe}')
    expect(out).toContain('year = {2020}')
  })
})

describe('toCsv', () => {
  it('writes a header and escapes commas and quotes', () => {
    const out = toCsv([node('a', { title: 'A, B', authors: 'X "Y"' })])
    const [header, row] = out.trim().split('\n')
    expect(header).toBe('id,title,authors,year,venue,citation_count,url')
    expect(row).toContain('"A, B"')
    expect(row).toContain('"X ""Y"""')
  })
})

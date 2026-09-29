import { describe, it, expect } from 'vitest'
import { arxivHtmlUrl, arxivAbsUrl, arxivPdfUrl, sanitizeArticleHtml, extractOutline } from './article'

describe('arxiv url builders', () => {
  it('builds html/abs/pdf urls', () => {
    expect(arxivHtmlUrl('2401.00001')).toBe('https://arxiv.org/html/2401.00001')
    expect(arxivAbsUrl('2401.00001')).toBe('https://arxiv.org/abs/2401.00001')
    expect(arxivPdfUrl('2401.00001')).toBe('https://arxiv.org/pdf/2401.00001')
  })
})

describe('sanitizeArticleHtml', () => {
  const html = `<!DOCTYPE html><html><head>
    <link rel="stylesheet" href="/static/arxiv.css">
    <script>alert('x')</script>
  </head><body>
    <p onclick="steal()">hello</p>
    <a href="javascript:alert(1)">bad</a>
    <iframe src="https://evil.example"></iframe>
    <p>world</p>
  </body></html>`

  it('injects a base href pointing at the arxiv html directory', () => {
    expect(sanitizeArticleHtml(html)).toContain('<base href="https://arxiv.org/html/">')
  })

  it('converts SVG <object> figures into <img> and drops other objects', () => {
    const withObjects = `<html><body>
      <object type="image/svg+xml" data="2601.21998v2/a.svg" width="10" height="5"></object>
      <object type="text/html" data="evil.html"></object>
    </body></html>`
    const out = sanitizeArticleHtml(withObjects)
    expect(out).toContain('<img')
    expect(out).toContain('2601.21998v2/a.svg')
    expect(out).not.toContain('<object')
  })

  it('strips scripts, iframes and event handlers', () => {
    const out = sanitizeArticleHtml(html)
    expect(out).not.toContain('<script')
    expect(out).not.toContain('alert(')
    expect(out).not.toContain('onclick')
    expect(out).not.toContain('<iframe')
    expect(out).not.toContain('javascript:')
  })

  it('keeps the stylesheet and body text', () => {
    const out = sanitizeArticleHtml(html)
    expect(out).toContain('/static/arxiv.css')
    expect(out).toContain('hello')
    expect(out).toContain('world')
  })
})

describe('extractOutline', () => {
  it('reads heading levels, ids and text', () => {
    const html = `<html><body>
      <h1 id="S1">Introduction</h1>
      <h2 id="S2"> Methods </h2>
      <h3>No id</h3>
    </body></html>`
    expect(extractOutline(html)).toEqual([
      { id: 'S1', text: 'Introduction', level: 1 },
      { id: 'S2', text: 'Methods', level: 2 },
    ])
  })

  it('returns an empty list when there are no headings', () => {
    expect(extractOutline('<html><body><p>x</p></body></html>')).toEqual([])
  })

  it('reads the LaTeXML shape where the id is on the section', () => {
    const html = `<html><body>
      <section id="S1" class="ltx_section"><h2 class="ltx_title ltx_title_section">Introduction</h2></section>
      <section id="S2.SS1" class="ltx_subsection"><h3 class="ltx_title">Details</h3></section>
    </body></html>`
    expect(extractOutline(html)).toEqual([
      { id: 'S1', text: 'Introduction', level: 2 },
      { id: 'S2.SS1', text: 'Details', level: 3 },
    ])
  })
})

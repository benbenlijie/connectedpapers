const ARXIV_BASE = 'https://arxiv.org'

export function arxivHtmlUrl(id: string): string {
  return `${ARXIV_BASE}/html/${encodeURIComponent(id)}`
}

export function arxivAbsUrl(id: string): string {
  return `${ARXIV_BASE}/abs/${encodeURIComponent(id)}`
}

export function arxivPdfUrl(id: string): string {
  return `${ARXIV_BASE}/pdf/${encodeURIComponent(id)}`
}

export interface OutlineItem {
  id: string
  text: string
  level: number
}

const STRIP_TAGS = ['script', 'iframe', 'object', 'embed', 'noscript']

/**
 * Defensive sanitize for third-party (arXiv) HTML before it is rendered in a
 * sandboxed same-origin iframe: drop active content and pointing handlers, and
 * inject a <base> so the page's absolute asset paths resolve against arxiv.org.
 */
export function sanitizeArticleHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  for (const tag of STRIP_TAGS) {
    doc.querySelectorAll(tag).forEach((el) => el.remove())
  }

  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase()
      const value = attr.value.trim().toLowerCase()
      if (name.startsWith('on')) el.removeAttribute(attr.name)
      else if ((name === 'href' || name === 'src' || name === 'xlink:href') && value.startsWith('javascript:')) {
        el.removeAttribute(attr.name)
      }
    }
  })

  const head = doc.querySelector('head') ?? doc.documentElement
  head.querySelectorAll('base').forEach((el) => el.remove())
  const base = doc.createElement('base')
  base.setAttribute('href', `${ARXIV_BASE}/`)
  head.insertBefore(base, head.firstChild)

  return `<!DOCTYPE html>${doc.documentElement.outerHTML}`
}

export function extractOutline(html: string): OutlineItem[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const out: OutlineItem[] = []
  const seen = new Set<string>()
  const push = (id: string | null, text: string, level: number) => {
    if (!id || !text || seen.has(id)) return
    seen.add(id)
    out.push({ id, text, level })
  }

  // Covers both plain heading ids and LaTeXML, where the id lives on the
  // enclosing <section> and the heading itself has no id.
  doc.querySelectorAll('h1[id], h2[id], h3[id], h4[id], section[id]').forEach((el) => {
    if (el.tagName === 'SECTION') {
      const heading = el.querySelector('h1, h2, h3, h4')
      if (heading) push(el.getAttribute('id'), (heading.textContent ?? '').trim(), Number(heading.tagName.slice(1)))
    } else {
      push(el.getAttribute('id'), (el.textContent ?? '').trim(), Number(el.tagName.slice(1)))
    }
  })
  return out
}

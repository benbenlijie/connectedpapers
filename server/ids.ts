export type IdKind = 'doi' | 'arxiv' | 'openalex' | 's2' | 'unknown'

export interface ResolvedId {
  raw: string
  kind: IdKind
  s2Path: string
  doi?: string
  arxivId?: string
  openalexWorkId?: string
}

const ARXIV = /\d{4}\.\d{4,5}(?:v\d+)?/

export function resolvePaperId(input: string): ResolvedId {
  const raw = String(input).trim()

  const doiArxiv = raw.match(/10\.48550\/arxiv\.(\d{4}\.\d{4,5}(?:v\d+)?)/i)
  if (doiArxiv) return { raw, kind: 'arxiv', arxivId: doiArxiv[1], s2Path: `ARXIV:${doiArxiv[1]}` }

  if (raw.includes('doi.org') && /arxiv/i.test(raw)) {
    const m = raw.match(new RegExp(`arxiv[./](${ARXIV.source})`, 'i'))
    if (m) return { raw, kind: 'arxiv', arxivId: m[1], s2Path: `ARXIV:${m[1]}` }
  }
  if (/^10\./.test(raw) || /^https?:\/\/(dx\.)?doi\.org\//.test(raw)) {
    const doi = raw.replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
    return { raw, kind: 'doi', doi, s2Path: `DOI:${doi}` }
  }
  if (new RegExp(`^${ARXIV.source}$`).test(raw)) return { raw, kind: 'arxiv', arxivId: raw, s2Path: `ARXIV:${raw}` }

  const oalex = raw.match(/(W\d{5,})/)
  if (oalex) return { raw, kind: 'openalex', openalexWorkId: oalex[1], s2Path: oalex[1] }

  return { raw, kind: 's2', s2Path: raw }
}

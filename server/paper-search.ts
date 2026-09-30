import type { PaperSection } from './paper-content'

export interface SearchHit {
  sectionIdx: number
  heading: string
  text: string
  score: number
}

const STOP = new Set(['the', 'a', 'an', 'of', 'to', 'and', 'in', 'on', 'for', 'with', 'is', 'are', 'we', 'as'])

export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOP.has(t))
}

function windows(text: string, size = 400): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/)
  const out: string[] = []
  let cur = ''
  for (const s of sentences) {
    if (cur.length + s.length > size && cur) {
      out.push(cur.trim())
      cur = ''
    }
    cur += s + ' '
  }
  if (cur.trim()) out.push(cur.trim())
  return out.length > 0 ? out : [text]
}

export function rankSections(sections: PaperSection[], query: string, limit = 8): SearchHit[] {
  const tokens = tokenize(query)
  if (tokens.length === 0) return []
  const hits: SearchHit[] = []
  for (const section of sections) {
    for (const text of windows(section.text)) {
      const lower = text.toLowerCase()
      let matches = 0
      for (const token of tokens) {
        let i = lower.indexOf(token)
        while (i !== -1) {
          matches += 1
          i = lower.indexOf(token, i + token.length)
        }
      }
      if (matches === 0) continue
      hits.push({
        sectionIdx: section.idx,
        heading: section.heading,
        text,
        score: matches / Math.sqrt(text.split(/\s+/).length || 1),
      })
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}

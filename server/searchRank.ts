/** 关键词相关性打分：标题包含完整查询加权，再按命中的查询分词数累加。 */
export function relevanceScore(title: unknown, query: string): number {
  const t = typeof title === 'string' ? title.toLowerCase() : ''
  const q = query.trim().toLowerCase()
  if (!t || !q) return 0
  let score = 0
  if (t.includes(q)) score += 10
  const tokens = q.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  for (const tok of tokens) if (t.includes(tok)) score += 1
  return score
}

/** 去重后按相关性稳定排序：同分保留上游原始顺序。 */
export function rankSearchResults<T extends Record<string, any>>(papers: T[], query: string): T[] {
  const seen = new Set<string>()
  const list: T[] = []
  for (const p of papers) {
    const key = p.doi || p.semantic_scholar_id || p.openalex_id || p.title
    if (key && !seen.has(key)) {
      seen.add(key)
      list.push(p)
    }
  }
  return list
    .map((p, i) => ({ p, i, score: relevanceScore(p.title, query) }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((x) => x.p)
}

export const SEARCH_HISTORY_LIMIT = 20

export function parseHistory(raw: string | null): string[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const out: string[] = []
  for (const item of parsed) {
    if (typeof item !== 'string') continue
    const value = item.trim()
    if (value && !out.includes(value)) out.push(value)
    if (out.length >= SEARCH_HISTORY_LIMIT) break
  }
  return out
}

export function serializeHistory(list: string[]): string {
  return JSON.stringify(list)
}

export function addToHistory(list: string[], query: string, limit = SEARCH_HISTORY_LIMIT): string[] {
  const value = query.trim()
  if (!value) return list
  return [value, ...list.filter((q) => q !== value)].slice(0, limit)
}

export function removeFromHistory(list: string[], query: string): string[] {
  return list.filter((q) => q !== query)
}

export function filterHistory(list: string[], input: string, limit = SEARCH_HISTORY_LIMIT): string[] {
  const needle = input.trim().toLowerCase()
  const matches = needle ? list.filter((q) => q.toLowerCase().includes(needle)) : list
  return matches.slice(0, limit)
}

export type Notes = Record<string, string>

export function parseNotes(raw: string | null): Notes {
  if (!raw) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
  const out: Notes = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'string') out[key] = value
  }
  return out
}

export function serializeNotes(notes: Notes): string {
  return JSON.stringify(notes)
}

export function hasNote(notes: Notes, id: string | null | undefined): boolean {
  if (!id) return false
  return (notes[id] ?? '').trim().length > 0
}

export function withNote(notes: Notes, id: string, text: string): Notes {
  const next = { ...notes }
  if (text.trim() === '') delete next[id]
  else next[id] = text
  return next
}

export function annotatedIds(notes: Notes): Set<string> {
  const ids = new Set<string>()
  for (const [id, text] of Object.entries(notes)) {
    if (text.trim() !== '') ids.add(id)
  }
  return ids
}

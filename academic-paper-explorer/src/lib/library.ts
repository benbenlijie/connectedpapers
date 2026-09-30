export interface Collection {
  id: string
  name: string
  paperIds: string[]
  createdAt?: string
}

export interface SavedSearch {
  id: string
  query: string
  query_type: string
  createdAt?: string
}

export interface Library {
  favorites: string[]
  collections: Collection[]
  savedSearches: SavedSearch[]
}

export function emptyLibrary(): Library {
  return { favorites: [], collections: [], savedSearches: [] }
}

function newId(prefix: string): string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const item of value) {
    if (typeof item === 'string' && item && !out.includes(item)) out.push(item)
  }
  return out
}

export function parseLibrary(raw: string | null): Library {
  if (!raw) return emptyLibrary()
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return emptyLibrary()
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return emptyLibrary()

  const data = parsed as Record<string, unknown>
  const collections: Collection[] = []
  if (Array.isArray(data.collections)) {
    for (const item of data.collections) {
      if (typeof item !== 'object' || item === null) continue
      const c = item as Record<string, unknown>
      if (typeof c.id !== 'string' || typeof c.name !== 'string') continue
      collections.push({
        id: c.id,
        name: c.name,
        paperIds: uniqueStrings(c.paperIds),
        ...(typeof c.createdAt === 'string' ? { createdAt: c.createdAt } : {}),
      })
    }
  }

  const savedSearches: SavedSearch[] = []
  if (Array.isArray(data.savedSearches)) {
    for (const item of data.savedSearches) {
      if (typeof item !== 'object' || item === null) continue
      const s = item as Record<string, unknown>
      if (typeof s.id !== 'string' || typeof s.query !== 'string') continue
      savedSearches.push({
        id: s.id,
        query: s.query,
        query_type: typeof s.query_type === 'string' ? s.query_type : 'keyword',
        ...(typeof s.createdAt === 'string' ? { createdAt: s.createdAt } : {}),
      })
    }
  }

  return { favorites: uniqueStrings(data.favorites), collections, savedSearches }
}

export function serializeLibrary(lib: Library): string {
  return JSON.stringify(lib)
}

export function isFavorite(lib: Library, id: string): boolean {
  return lib.favorites.includes(id)
}

export function toggleFavorite(lib: Library, id: string): Library {
  const favorites = lib.favorites.includes(id)
    ? lib.favorites.filter((f) => f !== id)
    : [...lib.favorites, id]
  return { ...lib, favorites }
}

export function addCollection(lib: Library, name: string, id = newId('col')): Library {
  const trimmed = name.trim()
  if (!trimmed) return lib
  return {
    ...lib,
    collections: [
      ...lib.collections,
      { id, name: trimmed, paperIds: [], createdAt: new Date().toISOString() },
    ],
  }
}

export function removeCollection(lib: Library, id: string): Library {
  return { ...lib, collections: lib.collections.filter((c) => c.id !== id) }
}

export function addToCollection(lib: Library, collectionId: string, paperId: string): Library {
  return {
    ...lib,
    collections: lib.collections.map((c) =>
      c.id === collectionId && !c.paperIds.includes(paperId)
        ? { ...c, paperIds: [...c.paperIds, paperId] }
        : c,
    ),
  }
}

export function removeFromCollection(lib: Library, collectionId: string, paperId: string): Library {
  return {
    ...lib,
    collections: lib.collections.map((c) =>
      c.id === collectionId ? { ...c, paperIds: c.paperIds.filter((p) => p !== paperId) } : c,
    ),
  }
}

export function addSavedSearch(
  lib: Library,
  query: string,
  queryType: string,
  id = newId('search'),
): Library {
  const trimmed = query.trim()
  if (!trimmed) return lib
  if (lib.savedSearches.some((s) => s.query === trimmed && s.query_type === queryType)) return lib
  return {
    ...lib,
    savedSearches: [
      ...lib.savedSearches,
      { id, query: trimmed, query_type: queryType, createdAt: new Date().toISOString() },
    ],
  }
}

export function removeSavedSearch(lib: Library, id: string): Library {
  return { ...lib, savedSearches: lib.savedSearches.filter((s) => s.id !== id) }
}

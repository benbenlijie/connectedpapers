export type ReadingStatus = 'to_read' | 'reading' | 'done'

export interface ReadingEntry {
  status: ReadingStatus
  progress?: number
  updatedAt?: string
}

export type ReadingMap = Record<string, ReadingEntry>

export const READING_STATUSES: { value: ReadingStatus; label: string }[] = [
  { value: 'to_read', label: '待读' },
  { value: 'reading', label: '在读' },
  { value: 'done', label: '已读' },
]

const STATUS_VALUES: ReadingStatus[] = ['to_read', 'reading', 'done']

function isStatus(value: unknown): value is ReadingStatus {
  return typeof value === 'string' && (STATUS_VALUES as string[]).includes(value)
}

function clampProgress(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.min(100, Math.max(0, Math.round(value)))
}

export function parseReading(raw: string | null): ReadingMap {
  if (!raw) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}

  const out: ReadingMap = {}
  for (const [id, value] of Object.entries(parsed)) {
    if (typeof value !== 'object' || value === null) continue
    const entry = value as Record<string, unknown>
    if (!isStatus(entry.status)) continue
    const progress = clampProgress(entry.progress)
    out[id] = {
      status: entry.status,
      ...(progress !== undefined ? { progress } : {}),
      ...(typeof entry.updatedAt === 'string' ? { updatedAt: entry.updatedAt } : {}),
    }
  }
  return out
}

export function serializeReading(map: ReadingMap): string {
  return JSON.stringify(map)
}

export function withStatus(
  map: ReadingMap,
  id: string,
  status: ReadingStatus | null,
  now: string = new Date().toISOString(),
): ReadingMap {
  const next = { ...map }
  if (status === null) {
    delete next[id]
    return next
  }
  next[id] = { ...next[id], status, updatedAt: now }
  return next
}

export function withProgress(
  map: ReadingMap,
  id: string,
  progress: number,
  now: string = new Date().toISOString(),
): ReadingMap {
  const value = clampProgress(progress) ?? 0
  const existing = map[id]
  return {
    ...map,
    [id]: { status: existing?.status ?? 'reading', progress: value, updatedAt: now },
  }
}

export function statusLabel(status: ReadingStatus): string {
  return READING_STATUSES.find((s) => s.value === status)?.label ?? status
}

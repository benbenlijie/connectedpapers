import type { Database } from 'bun:sqlite'
import { createHash } from 'node:crypto'
import { db as defaultDb } from './db'

export interface TranslationRow {
  hash: string
  target: string
  source: string
  translated: string
  provider?: string
}

/** Cache key is per (target, source) so the same text is reused across providers. */
export function translationHash(target: string, source: string): string {
  return createHash('sha256').update(`${target}\n${source}`).digest('hex').slice(0, 32)
}

export function getCachedTranslations(hashes: string[], dbIn: Database = defaultDb): Map<string, string> {
  const out = new Map<string, string>()
  if (hashes.length === 0) return out
  const placeholders = hashes.map(() => '?').join(',')
  const rows = dbIn
    .query(`select hash, translated_text from translations where hash in (${placeholders})`)
    .all(...hashes) as { hash: string; translated_text: string }[]
  for (const row of rows) out.set(row.hash, row.translated_text)
  return out
}

export function cacheTranslations(rows: TranslationRow[], dbIn: Database = defaultDb): void {
  if (rows.length === 0) return
  const stmt = dbIn.query(
    `insert into translations (hash, target_lang, source_text, translated_text, provider)
     values (?,?,?,?,?)
     on conflict(hash) do update set translated_text=excluded.translated_text, provider=excluded.provider`,
  )
  for (const r of rows) stmt.run(r.hash, r.target, r.source, r.translated, r.provider ?? null)
}

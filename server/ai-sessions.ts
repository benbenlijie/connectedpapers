import type { Database } from 'bun:sqlite'
import { db as defaultDb } from './db'

export function getSession(arxivId: string, dbIn: Database = defaultDb): string | null {
  const row = dbIn.query('select session_id from ai_sessions where arxiv_id=?').get(arxivId) as
    | { session_id: string }
    | null
  return row?.session_id ?? null
}

export function setSession(arxivId: string, sessionId: string, dbIn: Database = defaultDb): void {
  dbIn.run(
    `insert into ai_sessions (arxiv_id, session_id, updated_at) values (?,?,datetime('now'))
     on conflict(arxiv_id) do update set session_id=excluded.session_id, updated_at=datetime('now')`,
    [arxivId, sessionId],
  )
}

export function getArxivBySession(sessionId: string, dbIn: Database = defaultDb): string | null {
  const row = dbIn.query('select arxiv_id from ai_sessions where session_id=?').get(sessionId) as
    | { arxiv_id: string }
    | null
  return row?.arxiv_id ?? null
}

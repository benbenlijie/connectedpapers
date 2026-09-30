import { json, ApiError } from '../errors'
import { db } from '../db'
import { getRelations } from '../relations'

export async function neighborsRoute(rawId: string): Promise<Response> {
  const id = decodeURIComponent(rawId ?? '').trim()
  if (!id) throw new ApiError('VALIDATION_FAILED', '缺少论文ID')

  const relations = getRelations(id)
  const ids = new Set<string>()
  for (const r of relations) {
    ids.add(r.from_id)
    ids.add(r.to_id)
  }

  const papers =
    ids.size > 0
      ? (db
          .query(
            `select id, title, publication_year, citation_count, authors_text, venue, url, pdf_url, fields_of_study
             from papers where id in (${[...ids].map(() => '?').join(',')})`,
          )
          .all(...ids) as unknown[])
      : []

  return json({ data: { relations, papers } })
}

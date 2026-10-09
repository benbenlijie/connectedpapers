import type { Database } from 'bun:sqlite'
import { db as defaultDb } from './db'
import type { S2Paper } from './s2'

export function upsertPaper(
  p: Partial<S2Paper> & { paperId: string },
  dbIn: Database = defaultDb,
): void {
  const fields = JSON.stringify(p.fieldsOfStudy ?? [])
  dbIn.run(
    `insert into papers (id, doi, arxiv_id, semantic_scholar_id, title, abstract, publication_year, citation_count,
       reference_count, authors_text, venue, url, pdf_url, fields_of_study, is_open_access, source, raw, fetched_at, updated_at)
     values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))
     on conflict(id) do update set
       doi=excluded.doi, arxiv_id=excluded.arxiv_id, is_open_access=excluded.is_open_access,
       title=excluded.title, abstract=excluded.abstract, publication_year=excluded.publication_year,
       citation_count=excluded.citation_count, reference_count=excluded.reference_count,
       authors_text=excluded.authors_text, venue=excluded.venue, url=excluded.url, pdf_url=excluded.pdf_url,
       fields_of_study=excluded.fields_of_study, raw=excluded.raw, fetched_at=datetime('now'), updated_at=datetime('now')`,
    [
      p.paperId, p.externalIds?.DOI ?? null, p.externalIds?.ArXiv ?? null, p.paperId, p.title ?? '', p.abstract ?? null, p.year ?? null, p.citationCount ?? 0,
      p.references?.length ?? 0, (p.authors ?? []).map((a) => a.name).join(', '), p.venue ?? null,
      p.url ?? null, p.openAccessPdf?.url ?? null, fields, p.openAccessPdf?.url ? 1 : 0, 'semantic_scholar', JSON.stringify(p),
    ],
  )
}

export function upsertCitation(citing: string, cited: string, dbIn: Database = defaultDb): void {
  dbIn.run('insert or ignore into citations (citing_paper_id, cited_paper_id) values (?,?)', [citing, cited])
}

/** 确保 papers 表存在该 id 的最小行，避免 citations 外键失败。 */
export function ensurePaperStub(paperId: string, dbIn: Database = defaultDb): void {
  dbIn.run('insert or ignore into papers (id, title) values (?, ?)', [paperId, paperId])
}

/**
 * Read a paper back out of SQLite in Semantic Scholar shape.
 *
 * `upsertPaper` keeps the original payload in `raw`, so a cached paper replays
 * with its embedded `references` / `citations` intact. That is what lets
 * `/api/connect` keep answering from local knowledge when the upstream API is
 * rate limited or down, instead of failing the whole request.
 */
export function getPaper(
  id: string,
  dbIn: Database = defaultDb,
): (Partial<S2Paper> & { paperId: string }) | null {
  const row = dbIn
    .query(
      `select id, title, abstract, publication_year, citation_count, authors_text, venue, url,
              fields_of_study, raw
         from papers
        where id = ? or semantic_scholar_id = ? or doi = ? or openalex_id = ? or arxiv_id = ?
        limit 1`,
    )
    .get(id, id, id, id, id) as Record<string, unknown> | null
  if (!row) return null

  let parsed: Partial<S2Paper> | null = null
  if (typeof row.raw === 'string' && row.raw) {
    try {
      parsed = JSON.parse(row.raw) as Partial<S2Paper>
    } catch {
      parsed = null // a corrupt cache row must not take the request down
    }
  }

  const paperId = parsed?.paperId || (row.id as string)
  const authors =
    parsed?.authors ??
    String(row.authors_text ?? '')
      .split(', ')
      .filter(Boolean)
      .map((name) => ({ name }))

  let fields: string[] = []
  try {
    fields = JSON.parse(String(row.fields_of_study ?? '[]')) as string[]
  } catch {
    fields = []
  }

  return {
    ...(parsed ?? {}),
    paperId,
    title: parsed?.title || (row.title as string) || paperId,
    abstract: parsed?.abstract ?? (row.abstract as string | null) ?? undefined,
    year: parsed?.year ?? (row.publication_year as number | null) ?? undefined,
    citationCount: parsed?.citationCount ?? (row.citation_count as number) ?? 0,
    venue: parsed?.venue ?? (row.venue as string | null) ?? undefined,
    url: parsed?.url ?? (row.url as string | null) ?? undefined,
    authors,
    fieldsOfStudy: parsed?.fieldsOfStudy ?? fields,
  }
}

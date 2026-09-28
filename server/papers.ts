import { db } from './db'
import type { S2Paper } from './s2'

export function upsertPaper(p: Partial<S2Paper> & { paperId: string }): void {
  const fields = JSON.stringify(p.fieldsOfStudy ?? [])
  db.run(
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

export function upsertCitation(citing: string, cited: string): void {
  db.run('insert or ignore into citations (citing_paper_id, cited_paper_id) values (?,?)', [citing, cited])
}

/** 确保 papers 表存在该 id 的最小行，避免 citations 外键失败。 */
export function ensurePaperStub(paperId: string): void {
  db.run('insert or ignore into papers (id, title) values (?, ?)', [paperId, paperId])
}

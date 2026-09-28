import type { S2Paper } from './s2'

/** Shared S2 paper shape so search and details responses agree. */
export function normalizeS2Paper(p: S2Paper) {
  return {
    id: p.paperId,
    semantic_scholar_id: p.paperId,
    title: p.title ?? '',
    abstract: p.abstract ?? null,
    publication_year: p.year ?? null,
    year: p.year,
    citation_count: p.citationCount ?? 0,
    authors: (p.authors ?? []).map((a) => a.name).join(', '),
    venue: p.venue ?? null,
    journal: p.journal ?? null,
    url: p.url ?? null,
    pdf_url: p.openAccessPdf?.url ?? null,
    doi: p.externalIds?.DOI ?? null,
    fields_of_study: p.fieldsOfStudy ?? [],
    reference_count: p.references?.length ?? 0,
    is_open_access: Boolean(p.openAccessPdf?.url),
    references: p.references ?? [],
    citations: p.citations ?? [],
    openAccessPdf: p.openAccessPdf ?? null,
  }
}

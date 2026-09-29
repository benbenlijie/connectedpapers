export type Paper = {
  id: string
  semantic_scholar_id?: string
  openalex_id?: string
  title: string
  abstract?: string
  publication_year?: number
  year?: number
  citation_count: number
  authors: string
  venue?: string
  journal?: string
  url?: string
  pdf_url?: string
  doi?: string
  arxiv_id?: string
  fields_of_study?: string[]
  page_rank_score?: number
  cluster_id?: number
  source: 'semantic_scholar' | 'openalex' | 'crossref'
}

export type NetworkNode = {
  id: string
  label: string
  title: string
  abstract?: string
  year?: number
  citationCount: number
  authors: string
  venue?: string
  url?: string
  pdfUrl?: string
  fieldsOfStudy?: string[]
  isRoot: boolean
  pageRankScore: number
  clusterId: number
  size: number
  color: string
}

export type NetworkEdge = { from: string; to: string; type: 'reference' | 'citation'; weight: number }
export type NetworkData = { nodes: NetworkNode[]; edges: NetworkEdge[] }
export type SearchQuery = { query: string; query_type: 'keyword' | 'doi' | 'arxiv' | 's2_id' }

export type PaperDetails = {
  paper: {
    id: string
    title: string
    abstract?: string
    year?: number
    publication_year?: number
    citation_count: number
    authors: Array<{ id?: string; name: string; url?: string; affiliations?: string[] }> | string
    venue?: string
    journal?: string
    url?: string
    pdf_url?: string
    doi?: string
    arxiv_id?: string
    fields_of_study?: string[]
    references?: Array<{ paperId: string; title: string; year?: number; citationCount?: number }>
    citations?: Array<{ paperId: string; title: string; year?: number; citationCount?: number }>
  }
  recommendations: Array<{ paperId: string; title: string; year?: number; citationCount?: number; authors?: Array<{ name: string }>; venue?: string }>
  citation_contexts: Array<{ contexts?: string[]; citingPaper: { paperId: string; title: string; year?: number }; isInfluential: boolean }>
  metrics: { h_index: number; impact_factor: string; altmetric_score: number }
}

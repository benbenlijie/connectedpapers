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

export type EdgeType = 'reference' | 'citation' | 'related' | 'coupling' | 'semantic'
export type NetworkEdge = { from: string; to: string; type: EdgeType; weight: number }
export type NetworkData = { nodes: NetworkNode[]; edges: NetworkEdge[] }
export type SearchQuery = { query: string; query_type: 'keyword' | 'doi' | 'arxiv' | 's2_id' }

export type LineagePaper = {
  paperId: string
  title: string
  year?: number
  citationCount?: number
  venue?: string
  authors?: string
  isInfluential?: boolean
}

export type PaperLineage = { root_id: string; prior: LineagePaper[]; followUps: LineagePaper[] }

/** How two papers turned out to be connected. */
export type ConnectionKind =
  | 'same_paper'
  | 'direct'
  | 'citation_path'
  | 'coupling'
  | 'co_citation'
  | 'semantic_bridge'

export type ConnectionHop = {
  /** Stored relation direction (citing -> cited), not the walk direction. */
  from: string
  to: string
  type: EdgeType
  forward: boolean
  /** Pre-rendered Chinese sentence such as "A 引用了 X". */
  text: string
}

export type ConnectionPath = {
  kind: ConnectionKind
  /** Paper ids in walk order, starting at the from-paper. */
  nodeIds: string[]
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  hops: ConnectionHop[]
  hopCount: number
  score: number
  summary: string
}

export type ConnectionSignals = {
  sharedReferences: NetworkNode[]
  sharedCiters: NetworkNode[]
  semanticSimilarity: number | null
  sharedFields: string[]
  sharedAuthors: string[]
}

export type ConnectionStats = {
  expanded: number
  nodes: number
  edges: number
  elapsedMs: number
  source: 'local' | 'live'
  truncated: boolean
  /** The upstream API could not be reached, so this answer is cache-only. */
  upstreamUnavailable: boolean
}

export type PaperConnection = {
  from: NetworkNode
  to: NetworkNode
  found: boolean
  best: ConnectionPath | null
  alternatives: ConnectionPath[]
  signals: ConnectionSignals
  stats: ConnectionStats
}


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

import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import type { Paper } from '../types/domain'

export function resolveClientId(p: Paper | null): string | null {
  if (!p) return null
  return p.semantic_scholar_id || p.doi || p.openalex_id || p.id || null
}

export function usePaperNetwork(paper: Paper | null, depth?: number, maxNodes?: number) {
  const paperId = resolveClientId(paper)
  const year = paper?.publication_year ?? paper?.year ?? 0
  const citations = paper?.citation_count ?? 0
  const adaptive = year < 2015 || citations > 1000
  const resolvedDepth = depth ?? (adaptive ? 1 : 2)
  const resolvedMaxNodes = maxNodes ?? (adaptive ? 50 : 100)
  return useQuery({
    queryKey: ['network', paperId, resolvedDepth, resolvedMaxNodes],
    enabled: !!paperId,
    queryFn: () => api.networkWithPolling(paperId!, resolvedDepth, resolvedMaxNodes),
    staleTime: Infinity,
    retry: 1,
  })
}

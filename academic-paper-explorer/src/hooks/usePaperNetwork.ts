import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import type { Paper } from '../types/domain'

export function resolveClientId(p: Paper | null): string | null {
  if (!p) return null
  return p.semantic_scholar_id || p.doi || p.openalex_id || p.id || null
}

export function usePaperNetwork(paper: Paper | null, depth = 2, maxNodes = 100) {
  const paperId = resolveClientId(paper)
  return useQuery({
    queryKey: ['network', paperId, depth, maxNodes],
    enabled: !!paperId,
    queryFn: () => api.networkWithPolling(paperId!, depth, maxNodes),
    staleTime: Infinity,
    retry: 1,
  })
}

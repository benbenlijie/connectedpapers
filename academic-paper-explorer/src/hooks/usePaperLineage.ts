import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export function usePaperLineage(paperId: string | null) {
  return useQuery({
    queryKey: ['paper-lineage', paperId],
    enabled: !!paperId,
    queryFn: () => api.lineage(paperId!),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
}

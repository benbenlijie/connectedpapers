import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export function usePaperDetails(paperId: string | null) {
  return useQuery({
    queryKey: ['paper-details', paperId],
    enabled: !!paperId,
    queryFn: () => api.details(paperId!),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })
}

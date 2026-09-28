import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export function useSearchPapers(params: { query: string; query_type: string } | null) {
  return useQuery({
    queryKey: ['search', params],
    enabled: !!params,
    queryFn: () => api.search(params!.query, params!.query_type),
    staleTime: 5 * 60 * 1000,
  })
}

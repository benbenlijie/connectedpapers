import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, Paper, NetworkData, PaperDetails, SearchQuery } from '../lib/supabase'
import toast from 'react-hot-toast'

// 搜索论文
export function useSearchPapers() {
  return useMutation({
    mutationFn: async (searchParams: SearchQuery): Promise<{ papers: Paper[], total_count: number }> => {
      const { data, error } = await supabase.functions.invoke('search-papers', {
        body: searchParams
      })
      
      if (error) {
        throw new Error(error.message || '搜索失败')
      }
      
      return data.data
    },
    onError: (error: Error) => {
      toast.error(error.message || '搜索失败，请重试')
    },
    onSuccess: (data) => {
      toast.success(`找到 ${data.total_count} 篇相关论文`)
    }
  })
}

// 获取论文网络
export function useFetchPaperNetwork() {
  return useMutation({
    mutationFn: async (params: { paper_id: string, depth?: number, max_nodes?: number }): Promise<NetworkData> => {
      const { data, error } = await supabase.functions.invoke('fetch-paper-network', {
        body: params
      })
      
      if (error) {
        throw new Error(error.message || '网络构建失败')
      }
      
      return data.data
    },
    onError: (error: Error) => {
      toast.error(error.message || '网络构建失败，请重试')
    },
    onSuccess: (data) => {
      toast.success(`网络构建完成，包含 ${data.nodes.length} 个节点`)
    }
  })
}

// 获取论文详情
export function useFetchPaperDetails(paperId: string | null) {
  return useQuery({
    queryKey: ['paper-details', paperId],
    queryFn: async (): Promise<PaperDetails> => {
      if (!paperId) throw new Error('Paper ID is required')
      
      const { data, error } = await supabase.functions.invoke('fetch-paper-details', {
        body: { paper_id: paperId }
      })
      
      if (error) {
        throw new Error(error.message || '获取论文详情失败')
      }
      
      return data.data
    },
    enabled: !!paperId,
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    retry: 2
  })
}
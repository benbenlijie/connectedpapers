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
      console.log('发起网络构建请求:', params)
      
      const { data, error } = await supabase.functions.invoke('fetch-paper-network', {
        body: params
      })
      
      console.log('Edge Function响应:', { data, error })
      
      if (error) {
        // 尝试解析错误信息
        let errorMessage = '网络构建失败'
        
        if (error.message) {
          errorMessage = error.message
        }
        
        // 如果有详细的错误代码，提供更具体的错误信息
        if (typeof error === 'object' && error.code) {
          switch (error.code) {
            case 'PAPER_NOT_FOUND':
              errorMessage = '找不到指定的论文，请检查论文ID是否正确'
              break
            case 'PAPER_FETCH_FAILED':
              errorMessage = '无法从数据源获取论文信息，可能是API速率限制，请稍后重试'
              break
            case 'SUPABASE_CONFIG_MISSING':
              errorMessage = '服务配置错误，请联系管理员'
              break
            case 'NETWORK_BUILD_FAILED':
              errorMessage = '网络构建过程中出现错误，请重试'
              break
            case 'INVALID_JSON':
              errorMessage = '请求格式错误，请重试'
              break
            case 'MISSING_PAPER_ID':
              errorMessage = '论文ID缺失，请选择有效的论文'
              break
            case 'INTERNAL_SERVER_ERROR':
              errorMessage = '服务器内部错误，请稍后重试'
              break
            default:
              // 检查是否包含403错误信息
              if (error.message && error.message.includes('403')) {
                errorMessage = 'API访问受限，这可能是由于速率限制。请稍等片刻后重试，或联系管理员配置API密钥'
              } else if (error.message && error.message.includes('429')) {
                errorMessage = 'API请求过于频繁，请稍等片刻后重试'
              } else {
                errorMessage = error.message || '网络构建失败，请重试'
              }
          }
        } else if (error.message && error.message.includes('Edge Function returned a non-2xx status code')) {
          errorMessage = 'API服务暂时不可用，这可能是由于速率限制。请稍等片刻后重试'
        }
        
        throw new Error(errorMessage)
      }
      
      if (!data || !data.data) {
        throw new Error('服务返回数据格式错误')
      }
      
      // 如果有警告信息，记录下来
      if (data.warning) {
        console.warn('网络构建警告:', data.warning)
      }
      
      return { 
        ...data.data, 
        _warning: data.warning // 将警告信息传递给成功回调
      }
    },
    onError: (error: Error) => {
      console.error('网络构建失败:', error)
      toast.error(error.message || '网络构建失败，请重试')
    },
    onSuccess: (data: any) => {
      console.log('网络构建成功:', data)
      
      // 检查是否有警告信息
      if (data._warning) {
        toast.success(`网络构建完成 (${data._warning})，包含 ${data.nodes.length} 个节点`)
      } else {
        toast.success(`网络构建完成，包含 ${data.nodes.length} 个节点`)
      }
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
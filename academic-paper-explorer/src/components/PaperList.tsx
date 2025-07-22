import React from 'react'
import { FileText, ExternalLink, Calendar, Quote, Users } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useFetchPaperNetwork } from '../hooks/useApiQueries'
import { Paper } from '../lib/supabase'

const PaperList: React.FC = () => {
  const {
    searchResults,
    selectedPaper,
    setSelectedPaper,
    setNetworkData,
    setIsLoadingNetwork,
    filters
  } = useAppStore()

  const networkMutation = useFetchPaperNetwork()

  // 应用过滤器
  const filteredResults = searchResults.filter(paper => {
    const year = paper.publication_year
    const citations = paper.citation_count
    
    // 年份过滤
    if (year && (year < filters.yearRange[0] || year > filters.yearRange[1])) {
      return false
    }
    
    // 引用数过滤
    if (citations < filters.minCitations) {
      return false
    }
    
    // 学科领域过滤
    if (filters.selectedFields.length > 0) {
      const paperFields = paper.fields_of_study || []
      const hasMatchingField = filters.selectedFields.some(field => 
        paperFields.some(paperField => 
          paperField.toLowerCase().includes(field.toLowerCase())
        )
      )
      if (!hasMatchingField) return false
    }
    
    // 期刊/会议过滤
    if (filters.selectedVenues.length > 0) {
      const venue = paper.venue || paper.journal || ''
      const hasMatchingVenue = filters.selectedVenues.some(selectedVenue => 
        venue.toLowerCase().includes(selectedVenue.toLowerCase())
      )
      if (!hasMatchingVenue) return false
    }
    
    return true
  })

  const handlePaperSelect = async (paper: Paper) => {
    setSelectedPaper(paper)
    
    // 获取论文网络
    setIsLoadingNetwork(true)
    try {
      const paperId = paper.semantic_scholar_id || paper.openalex_id || paper.id
      const networkData = await networkMutation.mutateAsync({
        paper_id: paperId,
        depth: 1,
        max_nodes: 200
      })
      setNetworkData(networkData)
    } catch (error) {
      console.error('获取网络数据失败:', error)
    } finally {
      setIsLoadingNetwork(false)
    }
  }

  const formatAuthors = (authors: string) => {
    if (!authors) return '未知作者'
    const authorList = authors.split(', ')
    if (authorList.length > 3) {
      return `${authorList.slice(0, 3).join(', ')} 等`
    }
    return authors
  }

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'semantic_scholar': return 'bg-blue-600'
      case 'openalex': return 'bg-green-600'
      case 'crossref': return 'bg-purple-600'
      default: return 'bg-gray-600'
    }
  }

  if (searchResults.length === 0) {
    return (
      <div className="p-6 text-center">
        <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400">暂无搜索结果</p>
        <p className="text-sm text-gray-500 mt-2">
          请在上方搜索框中输入查询内容
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-400">
            共 {searchResults.length} 篇论文
            {filteredResults.length !== searchResults.length && (
              <span className="text-yellow-400"> (过滤后 {filteredResults.length} 篇)</span>
            )}
          </span>
        </div>
        
        <div className="space-y-3">
          {filteredResults.map((paper) => (
            <div
              key={paper.id || paper.semantic_scholar_id || paper.openalex_id}
              onClick={() => handlePaperSelect(paper)}
              className={`
                p-4 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer transition-all duration-200
                ${selectedPaper?.id === paper.id ? 'ring-2 ring-blue-500 bg-gray-600' : ''}
              `}
            >
              {/* 标题和源标识 */}
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-medium text-white line-clamp-2 flex-1">
                  {paper.title}
                </h3>
                <span className={`ml-2 px-2 py-1 text-xs text-white rounded ${getSourceBadgeColor(paper.source)}`}>
                  {paper.source.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              
              {/* 作者 */}
              <div className="flex items-center text-xs text-gray-300 mb-2">
                <Users className="w-3 h-3 mr-1" />
                <span className="line-clamp-1">{formatAuthors(paper.authors)}</span>
              </div>
              
              {/* 年份和期刊 */}
              {(paper.publication_year || paper.venue) && (
                <div className="flex items-center text-xs text-gray-400 mb-2">
                  <Calendar className="w-3 h-3 mr-1" />
                  <span>
                    {paper.publication_year && paper.publication_year}
                    {paper.publication_year && paper.venue && ' · '}
                    {paper.venue}
                  </span>
                </div>
              )}
              
              {/* 引用数和DOI */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center text-gray-400">
                  <Quote className="w-3 h-3 mr-1" />
                  <span>{paper.citation_count} 引用</span>
                </div>
                
                {paper.url && (
                  <a
                    href={paper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center text-blue-400 hover:text-blue-300"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              
              {/* 摘要预览 */}
              {paper.abstract && (
                <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                  {paper.abstract}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PaperList
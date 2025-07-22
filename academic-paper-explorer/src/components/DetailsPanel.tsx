import React from 'react'
import { ExternalLink, Download, Calendar, Quote, Users, BookOpen, Award, TrendingUp, Globe } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useFetchPaperDetails } from '../hooks/useApiQueries'

const DetailsPanel: React.FC = () => {
  const { selectedNodeId, selectedPaper } = useAppStore()
  
  // 优先使用选中的节点ID，其次使用选中的论文ID
  const paperId = selectedNodeId || (selectedPaper?.semantic_scholar_id || selectedPaper?.openalex_id || selectedPaper?.id)
  const { data: paperDetails, isLoading, error } = useFetchPaperDetails(paperId)

  if (!selectedPaper && !selectedNodeId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-6">
          <BookOpen className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">论文详情</h3>
          <p className="text-gray-500 text-sm">
            选择一篇论文或点击网络图中的节点
            <br />
            查看详细信息
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">加载详情中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-red-500 mb-4">加载失败</div>
          <p className="text-gray-500 text-sm">{error.message}</p>
        </div>
      </div>
    )
  }

  const paper = paperDetails?.paper || selectedPaper
  if (!paper) return null

  const metrics = paperDetails?.metrics
  const recommendations = paperDetails?.recommendations || []
  const citationContexts = paperDetails?.citation_contexts || []

  // 获取年份信息，兼容不同字段
  const paperYear = paper.year || paper.publication_year

  return (
    <div className="h-full overflow-y-auto">
      {/* 标题栏 */}
      <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 z-10">
        <h2 className="text-lg font-semibold text-white">论文详情</h2>
      </div>

      <div className="p-4 space-y-6">
        {/* 基本信息 */}
        <div>
          <h3 className="text-base font-medium text-white mb-3 line-clamp-3">
            {paper.title}
          </h3>
          
          {/* 作者 */}
          <div className="flex items-start space-x-2 mb-3">
            <Users className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-300">
              {Array.isArray(paper.authors) ? (
                <div className="space-y-1">
                  {paper.authors.slice(0, 5).map((author, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span>{typeof author === 'string' ? author : author.name}</span>
                      {typeof author === 'object' && author.url && (
                        <a
                          href={author.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                  {paper.authors.length > 5 && (
                    <span className="text-gray-400">... 等 {paper.authors.length} 人</span>
                  )}
                </div>
              ) : (
                <span>{paper.authors || '未知作者'}</span>
              )}
            </div>
          </div>

          {/* 发表信息 */}
          <div className="space-y-2 text-sm text-gray-400">
            {paperYear && (
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>{paperYear}</span>
                {paper.venue && <span>· {paper.venue}</span>}
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Quote className="w-4 h-4" />
              <span>{paper.citation_count || 0} 引用</span>
            </div>
          </div>
        </div>

        {/* 指标 */}
        {metrics && (
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-white mb-3 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              学术指标
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-400">H指数</div>
                <div className="text-white font-medium">{metrics.h_index}</div>
              </div>
              <div>
                <div className="text-gray-400">影响因子</div>
                <div className="text-white font-medium">{metrics.impact_factor}</div>
              </div>
            </div>
          </div>
        )}

        {/* 摘要 */}
        {paper.abstract && (
          <div>
            <h4 className="text-sm font-medium text-white mb-2">摘要</h4>
            <p className="text-sm text-gray-300 leading-relaxed">
              {paper.abstract}
            </p>
          </div>
        )}

        {/* 学科领域 */}
        {paper.fields_of_study && paper.fields_of_study.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-white mb-2">学科领域</h4>
            <div className="flex flex-wrap gap-2">
              {paper.fields_of_study.slice(0, 6).map((field, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-600 bg-opacity-20 text-blue-300 text-xs rounded"
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 链接 */}
        <div className="space-y-2">
          {paper.url && (
            <a
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 text-sm"
            >
              <Globe className="w-4 h-4" />
              <span>查看原文</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          
          {paper.pdf_url && (
            <a
              href={paper.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-green-400 hover:text-green-300 text-sm"
            >
              <Download className="w-4 h-4" />
              <span>下载PDF</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* 相关推荐 */}
        {recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-white mb-3 flex items-center">
              <Award className="w-4 h-4 mr-2" />
              相关推荐
            </h4>
            <div className="space-y-3">
              {recommendations.slice(0, 5).map((rec, index) => (
                <div key={index} className="bg-gray-700 rounded p-3">
                  <h5 className="text-sm font-medium text-white mb-1 line-clamp-2">
                    {rec.title}
                  </h5>
                  <div className="text-xs text-gray-400">
                    {rec.authors?.map(a => a.name).join(', ')}
                    {rec.year && ` · ${rec.year}`}
                    {rec.citationCount && ` · ${rec.citationCount} 引用`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 引用上下文 */}
        {citationContexts.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-white mb-3">引用上下文</h4>
            <div className="space-y-3">
              {citationContexts.slice(0, 3).map((context, index) => (
                <div key={index} className="bg-gray-700 rounded p-3">
                  <div className="text-sm text-white mb-2">
                    {context.citingPaper.title}
                  </div>
                  {context.contexts && context.contexts.length > 0 && (
                    <div className="text-xs text-gray-300 italic">
                      "{context.contexts[0]}"
                    </div>
                  )}
                  {context.isInfluential && (
                    <div className="mt-2">
                      <span className="px-2 py-1 bg-yellow-600 bg-opacity-20 text-yellow-300 text-xs rounded">
                        重要引用
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DetailsPanel
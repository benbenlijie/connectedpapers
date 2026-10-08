import React, { useState } from 'react'
import { FileText, ExternalLink, Calendar, Quote, Users, Loader2, AlertCircle, GitCompare, Star } from 'lucide-react'
import { useUiStore } from '../store/useUiStore'
import { useReadingStore } from '../store/useReadingStore'
import { useLibraryStore } from '../store/useLibraryStore'
import { READING_STATUSES, statusLabel, type ReadingStatus } from '../lib/reading'
import { useSearchPapers } from '../hooks/useSearchPapers'
import { Paper } from '../types/domain'

const STATUS_BADGE: Record<ReadingStatus, string> = {
  to_read: 'bg-amber-600',
  reading: 'bg-sky-600',
  done: 'bg-emerald-600',
}

const PaperList: React.FC = () => {
  const {
    selectedPaper,
    selectRootPaper,
    comparePaper,
    setComparePaper,
    filters,
    submittedQuery
  } = useUiStore()
  const readingEntries = useReadingStore((s) => s.entries)
  const setReadingStatus = useReadingStore((s) => s.setStatus)
  const library = useLibraryStore((s) => s.library)
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite)
  const [onlyList, setOnlyList] = useState(false)
  const [favOnly, setFavOnly] = useState(false)
  const [collectionFilter, setCollectionFilter] = useState('')
  const [hover, setHover] = useState<{ paper: Paper; x: number; y: number } | null>(null)

  const { data, isFetching, error, refetch } = useSearchPapers(submittedQuery)
  const searchResults = data?.papers ?? []
  const searchWarning = data?.warning

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

  const paperKey = (p: Paper) => p.id || p.semantic_scholar_id || p.openalex_id || p.doi || ''
  const collection = library.collections.find((c) => c.id === collectionFilter)
  const visibleResults = filteredResults.filter((p) => {
    const key = paperKey(p)
    if (onlyList && !readingEntries[key]) return false
    if (favOnly && !library.favorites.includes(key)) return false
    if (collection && !collection.paperIds.includes(key)) return false
    return true
  })

  const handlePaperSelect = (paper: Paper) => {
    selectRootPaper(paper)
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

  if (isFetching && !data) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
        <p className="text-gray-400">搜索中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-400">搜索失败</p>
        <p className="text-sm text-gray-500 mt-2 break-words">
          {error.message}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
        >
          重试
        </button>
      </div>
    )
  }

  if (searchResults.length === 0) {
    const modeLabel: Record<string, string> = {
      keyword: '关键词',
      doi: 'DOI',
      arxiv: 'arXiv ID',
      s2_id: 'Semantic Scholar ID',
    }
    return (
      <div className="p-6 text-center">
        <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        {submittedQuery ? (
          <>
            <p className="text-gray-300">
              未找到与「
              <span className="font-medium text-white break-words">{submittedQuery.query}</span>
              」相关的论文
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {submittedQuery.query_type === 'keyword'
                ? '试试更换关键词、检查拼写，或改用 DOI / arXiv ID / Semantic Scholar ID 精确查找。'
                : `请检查所填 ${modeLabel[submittedQuery.query_type] ?? '查询内容'} 是否正确，或改用关键词搜索。`}
            </p>
          </>
        ) : (
          <>
            <p className="text-gray-400">暂无搜索结果</p>
            <p className="text-sm text-gray-500 mt-2">
              请在上方搜索框中输入查询内容
            </p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-400">
            共 {searchResults.length} 篇论文
            {visibleResults.length !== searchResults.length && (
              <span className="text-yellow-400"> (过滤后 {visibleResults.length} 篇)</span>
            )}
          </span>
          <label className="flex cursor-pointer items-center gap-1 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={onlyList}
              onChange={(e) => setOnlyList(e.target.checked)}
              className="accent-blue-500"
            />
            仅看阅读清单
          </label>
          <label className="flex cursor-pointer items-center gap-1 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={favOnly}
              onChange={(e) => setFavOnly(e.target.checked)}
              className="accent-yellow-500"
            />
            仅看收藏
          </label>
          <select
            aria-label="集合筛选"
            value={collectionFilter}
            onChange={(e) => setCollectionFilter(e.target.value)}
            className="rounded bg-gray-700 px-1 py-0.5 text-xs text-gray-200"
          >
            <option value="">全部集合</option>
            {library.collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {searchWarning && (
          <div className="mb-3 flex items-start space-x-2 rounded-lg bg-yellow-900/30 border border-yellow-700/50 px-3 py-2">
            <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <span className="text-xs text-yellow-300">{searchWarning}</span>
          </div>
        )}
        
        <div className="space-y-3">
          {visibleResults.map((paper) => (
            <div
              key={paper.id || paper.semantic_scholar_id || paper.openalex_id}
              onClick={() => handlePaperSelect(paper)}
              onMouseEnter={(e) => setHover({ paper, x: e.clientX, y: e.clientY })}
              onMouseMove={(e) => setHover({ paper, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHover(null)}
              className={`
                p-4 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer transition-all duration-200
                ${selectedPaper?.id === paper.id ? 'ring-2 ring-blue-500 bg-gray-600' : ''}
                ${comparePaper?.id === paper.id ? 'ring-2 ring-cyan-400' : ''}
              `}
            >
              {/* 标题和源标识 */}
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-medium text-white line-clamp-2 flex-1">
                  {paper.title}
                </h3>
                <button
                  type="button"
                  aria-label={library.favorites.includes(paperKey(paper)) ? '取消收藏' : '收藏'}
                  aria-pressed={library.favorites.includes(paperKey(paper))}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(paperKey(paper))
                  }}
                  className={`ml-2 flex-shrink-0 rounded p-1 hover:bg-gray-500 ${
                    library.favorites.includes(paperKey(paper)) ? 'text-yellow-400' : 'text-gray-400'
                  }`}
                  title="收藏"
                >
                  <Star className={`w-4 h-4 ${library.favorites.includes(paperKey(paper)) ? 'fill-current' : ''}`} />
                </button>
                <button
                  type="button"
                  aria-label="对比"
                  aria-pressed={comparePaper?.id === paper.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    setComparePaper(comparePaper?.id === paper.id ? null : paper)
                  }}
                  className={`ml-2 flex-shrink-0 rounded p-1 hover:bg-gray-500 ${
                    comparePaper?.id === paper.id ? 'text-blue-400' : 'text-gray-400'
                  }`}
                  title="加入对比"
                >
                  <GitCompare className="w-4 h-4" />
                </button>
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
              
              {/* 阅读状态 */}
              <div className="mt-2 flex items-center gap-2">
                <select
                  aria-label="阅读状态"
                  value={readingEntries[paperKey(paper)]?.status ?? ''}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation()
                    setReadingStatus(paperKey(paper), (e.target.value || null) as ReadingStatus | null)
                  }}
                  className="rounded bg-gray-600 px-1 py-0.5 text-xs text-gray-100"
                >
                  <option value="">未标记</option>
                  {READING_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {readingEntries[paperKey(paper)] && (
                  <span
                    className={`rounded px-2 py-0.5 text-xs text-white ${
                      STATUS_BADGE[readingEntries[paperKey(paper)]!.status]
                    }`}
                  >
                    {statusLabel(readingEntries[paperKey(paper)]!.status)}
                    {typeof readingEntries[paperKey(paper)]!.progress === 'number' &&
                      ` · ${readingEntries[paperKey(paper)]!.progress}%`}
                  </span>
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

      {hover && <PaperHoverTooltip paper={hover.paper} x={hover.x} y={hover.y} />}
    </div>
  )
}

const TOOLTIP_WIDTH = 340

const PaperHoverTooltip: React.FC<{ paper: Paper; x: number; y: number }> = ({ paper, x, y }) => {
  const offset = 16
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : TOOLTIP_WIDTH + x + offset
  const left =
    x + offset + TOOLTIP_WIDTH > viewportWidth ? Math.max(offset, x - TOOLTIP_WIDTH - offset) : x + offset
  const top = typeof window !== 'undefined' ? Math.min(y + offset, window.innerHeight - 180) : y + offset

  const year = paper.publication_year ?? paper.year
  const venue = paper.venue || paper.journal

  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 rounded-lg border border-gray-600 bg-gray-800/95 p-3 text-xs text-gray-100 shadow-xl"
      style={{ left, top, width: TOOLTIP_WIDTH }}
    >
      <div className="mb-1 font-medium text-white">{paper.title || '未命名论文'}</div>
      <div className="space-y-0.5 break-words text-gray-400">
        {paper.authors && <div>{paper.authors}</div>}
        {(year || venue) && (
          <div>
            {year}
            {year && venue ? ' · ' : ''}
            {venue}
          </div>
        )}
        <div>{paper.citation_count} 引用</div>
        {paper.doi && <div className="text-gray-500">DOI: {paper.doi}</div>}
      </div>
      {paper.abstract && (
        <p className="mt-2 line-clamp-4 text-gray-400">{paper.abstract}</p>
      )}
    </div>
  )
}

export default PaperList
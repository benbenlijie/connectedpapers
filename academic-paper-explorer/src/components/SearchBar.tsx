import React, { useState } from 'react'
import { Search, Loader2, History, X } from 'lucide-react'
import { useUiStore } from '../store/useUiStore'
import { useSearchPapers } from '../hooks/useSearchPapers'
import { useSearchHistoryStore } from '../store/useSearchHistoryStore'
import { filterHistory } from '../lib/searchHistory'

const SearchBar: React.FC = () => {
  const { submittedQuery, submitQuery } = useUiStore()
  const entries = useSearchHistoryStore((s) => s.entries)
  const recordHistory = useSearchHistoryStore((s) => s.record)
  const removeHistory = useSearchHistoryStore((s) => s.remove)
  const clearHistory = useSearchHistoryStore((s) => s.clear)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'keyword' | 'doi' | 'arxiv' | 's2_id'>('keyword')
  const [showHistory, setShowHistory] = useState(false)

  const { isFetching: isSearching } = useSearchPapers(submittedQuery)
  const suggestions = showHistory ? filterHistory(entries, searchQuery) : []

  const runSearch = (query: string) => {
    const value = query.trim()
    if (!value) return
    recordHistory(value)
    submitQuery({ query: value, query_type: searchType })
    setShowHistory(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    runSearch(searchQuery)
  }

  const searchTypeOptions = [
    { value: 'keyword', label: '关键词' },
    { value: 'doi', label: 'DOI' },
    { value: 'arxiv', label: 'arXiv ID' },
    { value: 's2_id', label: 'Semantic Scholar ID' }
  ]

  const getPlaceholder = () => {
    switch (searchType) {
      case 'doi':
        return '输入DOI，例如: 10.1038/nature12373'
      case 'arxiv':
        return '输入arXiv ID，例如: 1706.03762'
      case 's2_id':
        return '输入Semantic Scholar ID'
      default:
        return '输入关键词，例如: attention mechanism, machine learning'
    }
  }

  return (
    <form onSubmit={handleSearch} className="flex items-center space-x-4">
      {/* 搜索类型选择 */}
      <select
        value={searchType}
        onChange={(e) => setSearchType(e.target.value as any)}
        className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {searchTypeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* 搜索输入框 */}
      <div className="flex-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isSearching ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setShowHistory(true)}
          onBlur={() => window.setTimeout(() => setShowHistory(false), 120)}
          placeholder={getPlaceholder()}
          className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isSearching}
        />

        {suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-gray-600 bg-gray-700 shadow-lg">
            <div className="flex items-center justify-between px-3 py-1.5 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <History className="h-3 w-3" /> 搜索历史
              </span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => clearHistory()}
                className="hover:text-white"
              >
                清空
              </button>
            </div>
            <ul className="max-h-64 overflow-y-auto">
              {suggestions.map((q) => (
                <li key={q} className="flex items-center hover:bg-gray-600">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSearchQuery(q)
                      runSearch(q)
                    }}
                    className="flex-1 truncate px-3 py-1.5 text-left text-sm text-gray-100"
                  >
                    {q}
                  </button>
                  <button
                    type="button"
                    aria-label={`删除历史 ${q}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => removeHistory(q)}
                    className="mr-2 rounded p-1 text-gray-400 hover:bg-gray-500 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 搜索按钮 */}
      <button
        type="submit"
        disabled={isSearching || !searchQuery.trim()}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
      >
        {isSearching ? '搜索中...' : '搜索'}
      </button>

      {/* 快捷示例 */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-400">示例:</span>
        <button
          type="button"
          onClick={() => {
            setSearchType('keyword')
            setSearchQuery('attention mechanism')
          }}
          className="text-sm text-blue-400 hover:text-blue-300 underline"
        >
          attention mechanism
        </button>
        <span className="text-gray-600">|</span>
        <button
          type="button"
          onClick={() => {
            setSearchType('doi')
            setSearchQuery('10.48550/arXiv.1706.03762')
          }}
          className="text-sm text-blue-400 hover:text-blue-300 underline"
        >
          Transformer论文
        </button>
      </div>
    </form>
  )
}

export default SearchBar
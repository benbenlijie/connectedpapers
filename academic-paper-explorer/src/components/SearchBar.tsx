import React, { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useSearchPapers } from '../hooks/useApiQueries'

const SearchBar: React.FC = () => {
  const {
    searchQuery,
    searchType,
    isSearching,
    setSearchQuery,
    setSearchType,
    setIsSearching,
    setSearchResults
  } = useAppStore()

  const searchMutation = useSearchPapers()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const result = await searchMutation.mutateAsync({
        query: searchQuery,
        query_type: searchType
      })
      setSearchResults(result.papers)
    } finally {
      setIsSearching(false)
    }
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
          placeholder={getPlaceholder()}
          className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isSearching}
        />
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
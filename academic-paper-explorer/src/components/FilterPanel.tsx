import React, { useState } from 'react'
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

const FilterPanel: React.FC = () => {
  const { filters, updateFilters, resetFilters, searchResults } = useAppStore()
  const [isExpanded, setIsExpanded] = useState(false)

  // 从搜索结果中提取可用的过滤选项
  const availableYears = Array.from(
    new Set(
      searchResults
        .map(paper => paper.publication_year)
        .filter(Boolean)
        .sort((a, b) => b! - a!)
    )
  )

  const availableFields = Array.from(
    new Set(
      searchResults
        .flatMap(paper => paper.fields_of_study || [])
        .filter(Boolean)
    )
  ).sort()

  const availableVenues = Array.from(
    new Set(
      searchResults
        .map(paper => paper.venue || paper.journal)
        .filter(Boolean)
    )
  ).sort()

  const minYear = Math.min(...availableYears.filter(Boolean)) || 1990
  const maxYear = Math.max(...availableYears.filter(Boolean)) || new Date().getFullYear()

  const handleYearRangeChange = (index: number, value: number) => {
    const newRange: [number, number] = [...filters.yearRange]
    newRange[index] = value
    updateFilters({ yearRange: newRange })
  }

  const handleFieldToggle = (field: string) => {
    const currentFields = filters.selectedFields
    const newFields = currentFields.includes(field)
      ? currentFields.filter(f => f !== field)
      : [...currentFields, field]
    updateFilters({ selectedFields: newFields })
  }

  const handleVenueToggle = (venue: string) => {
    const currentVenues = filters.selectedVenues
    const newVenues = currentVenues.includes(venue)
      ? currentVenues.filter(v => v !== venue)
      : [...currentVenues, venue]
    updateFilters({ selectedVenues: newVenues })
  }

  const getFilterCount = () => {
    let count = 0
    if (filters.minCitations > 0) count++
    if (filters.selectedFields.length > 0) count++
    if (filters.selectedVenues.length > 0) count++
    if (filters.yearRange[0] !== minYear || filters.yearRange[1] !== maxYear) count++
    return count
  }

  if (searchResults.length === 0) {
    return null
  }

  return (
    <div className="border-t border-gray-700">
      {/* 过滤器头部 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-200">过滤器</span>
          {getFilterCount() > 0 && (
            <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
              {getFilterCount()}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* 过滤器内容 */}
      {isExpanded && (
        <div className="p-4 space-y-4 border-t border-gray-700">
          {/* 重置按钮 */}
          <div className="flex justify-end">
            <button
              onClick={resetFilters}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1"
            >
              <X className="w-3 h-3" />
              <span>清除过滤</span>
            </button>
          </div>

          {/* 年份范围 */}
          <div>
            <label className="text-xs font-medium text-gray-300 mb-2 block">
              发表年份
            </label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min={minYear}
                  max={maxYear}
                  value={filters.yearRange[0]}
                  onChange={(e) => handleYearRangeChange(0, parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-xs text-gray-400 w-12">{filters.yearRange[0]}</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min={minYear}
                  max={maxYear}
                  value={filters.yearRange[1]}
                  onChange={(e) => handleYearRangeChange(1, parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-xs text-gray-400 w-12">{filters.yearRange[1]}</span>
              </div>
            </div>
          </div>

          {/* 最小引用数 */}
          <div>
            <label className="text-xs font-medium text-gray-300 mb-2 block">
              最小引用数: {filters.minCitations}
            </label>
            <input
              type="range"
              min={0}
              max={1000}
              step={10}
              value={filters.minCitations}
              onChange={(e) => updateFilters({ minCitations: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* 学科领域 */}
          {availableFields.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-300 mb-2 block">
                学科领域
              </label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {availableFields.slice(0, 10).map((field) => (
                  <label key={field} className="flex items-center space-x-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.selectedFields.includes(field)}
                      onChange={() => handleFieldToggle(field)}
                      className="rounded"
                    />
                    <span className="text-gray-300 line-clamp-1">{field}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 期刊/会议 */}
          {availableVenues.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-300 mb-2 block">
                期刊/会议
              </label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {availableVenues.slice(0, 10).map((venue) => (
                  <label key={venue} className="flex items-center space-x-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.selectedVenues.includes(venue)}
                      onChange={() => handleVenueToggle(venue)}
                      className="rounded"
                    />
                    <span className="text-gray-300 line-clamp-1">{venue}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default FilterPanel
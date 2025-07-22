import React from 'react'
import SearchBar from '../components/SearchBar'
import PaperList from '../components/PaperList'
import NetworkGraph from '../components/NetworkGraph'
import DetailsPanel from '../components/DetailsPanel'
import FilterPanel from '../components/FilterPanel'
import { useAppStore } from '../store/useAppStore'

const HomePage: React.FC = () => {
  const { selectedPaper, networkData } = useAppStore()

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部导航栏 */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-blue-400">
              学术论文关联网络分析平台
            </h1>
            <div className="text-sm text-gray-400">
              Academic Paper Network Explorer
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              类似Connected Papers的交互式学术探索工具
            </div>
          </div>
        </div>
      </header>

      {/* 搜索栏 */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
        <SearchBar />
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧论文列表 */}
        <div className="w-80 border-r border-gray-700 bg-gray-800 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-gray-200">论文列表</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <PaperList />
          </div>
          {/* 过滤器 */}
          <div className="border-t border-gray-700">
            <FilterPanel />
          </div>
        </div>

        {/* 中间网络图 */}
        <div className="flex-1 relative bg-gray-900">
          {selectedPaper ? (
            <NetworkGraph />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-300 mb-2">
                  开始探索学术网络
                </h3>
                <p className="text-gray-500 max-w-md">
                  请在上方搜索框中输入DOI、arXiv ID、Semantic Scholar ID或关键词，
                  然后选择一篇论文来生成引用网络图。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 右侧详情面板 */}
        <div className="w-96 border-l border-gray-700 bg-gray-800 overflow-hidden">
          <DetailsPanel />
        </div>
      </div>

      {/* 底部状态栏 */}
      <footer className="bg-gray-800 border-t border-gray-700 px-6 py-2">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center space-x-4">
            {networkData && (
              <span>
                网络: {networkData.nodes.length} 节点, {networkData.edges.length} 边
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span>数据源: OpenAlex · Semantic Scholar · CrossRef</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomePage
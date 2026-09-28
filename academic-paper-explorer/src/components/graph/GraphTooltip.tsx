import React from 'react'
import type { GraphNode } from '../../graph/graphAdapter'

interface Props {
  node: GraphNode
  x: number
  y: number
}

const GraphTooltip: React.FC<Props> = ({ node, x, y }) => (
  <div
    className="pointer-events-none absolute z-20 max-w-xs rounded-lg border border-gray-600 bg-gray-800/95 p-3 text-xs text-gray-100 shadow-lg"
    style={{ left: x + 14, top: y + 14 }}
  >
    <div className="mb-1 font-medium text-white line-clamp-3">{node.title || node.label}</div>
    <div className="space-y-0.5 text-gray-400">
      {node.authors && <div className="line-clamp-1">{node.authors}</div>}
      <div>
        {node.year ? `${node.year} · ` : ''}
        {node.citationCount} 引用
      </div>
      {node.venue && <div className="line-clamp-1">{node.venue}</div>}
      {node.isRoot && <div className="text-orange-400">根论文</div>}
    </div>
  </div>
)

export default GraphTooltip

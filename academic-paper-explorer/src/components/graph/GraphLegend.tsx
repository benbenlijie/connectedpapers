import React from 'react'
import { useUiStore } from '../../store/useUiStore'
import { colorFor, EDGE_COLORS } from '../../graph/encoding'
import type { GraphNode } from '../../graph/graphAdapter'
import type { EdgeType } from '../../types/domain'

interface Props {
  nodes: GraphNode[]
}

const EDGE_LEGEND: { type: EdgeType; label: string }[] = [
  { type: 'citation', label: '引用关系' },
  { type: 'reference', label: '参考关系' },
  { type: 'related', label: '相关（推荐）' },
  { type: 'coupling', label: '文献耦合' },
  { type: 'semantic', label: '语义相近' },
]

const GraphLegend: React.FC<Props> = ({ nodes }) => {
  const { colorMode, hiddenEdgeTypes, toggleEdgeType } = useUiStore()

  let entries: { key: string; label: string; color: string }[] = []
  if (colorMode === 'cluster') {
    const seen = new Map<number, string>()
    for (const n of nodes) if (!seen.has(n.clusterId)) seen.set(n.clusterId, colorFor(n, 'cluster'))
    entries = [...seen.entries()].map(([id, color]) => ({ key: `c${id}`, label: `簇 ${id}`, color }))
  } else if (colorMode === 'field') {
    const seen = new Map<string, string>()
    for (const n of nodes) {
      const f = n.fieldsOfStudy?.[0]
      if (f && !seen.has(f)) seen.set(f, colorFor(n, 'field'))
    }
    entries = [...seen.entries()].map(([f, color]) => ({ key: f, label: f, color }))
  }

  return (
    <div className="absolute bottom-4 right-4 z-10 max-w-[220px] rounded-lg bg-gray-800/90 p-3 text-xs text-white">
      {colorMode === 'year' ? (
        <div>
          <div className="mb-1 text-gray-300">年份</div>
          <div
            className="h-2 w-40 rounded"
            style={{ background: 'linear-gradient(to right, hsl(220,70%,55%), hsl(0,70%,55%))' }}
          />
        </div>
      ) : (
        <div className="space-y-1">
          <div className="mb-1 text-gray-300">{colorMode === 'cluster' ? '聚类' : '学科领域'}</div>
          {entries.slice(0, 8).map((e) => (
            <div key={e.key} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: e.color }} />
              <span className="line-clamp-1">{e.label}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 space-y-1 border-t border-gray-600 pt-2 text-gray-300">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border-2 border-orange-500" />
          <span>根论文</span>
        </div>
        <div className="mb-1 mt-1 text-[10px] text-gray-500">点击边类型可显示/隐藏</div>
        {EDGE_LEGEND.map((e) => {
          const hidden = hiddenEdgeTypes.includes(e.type)
          return (
            <button
              key={e.type}
              type="button"
              aria-pressed={!hidden}
              onClick={() => toggleEdgeType(e.type)}
              className={`flex w-full items-center gap-2 text-left hover:text-white ${
                hidden ? 'opacity-40' : ''
              }`}
            >
              <span
                className="h-0.5 w-4"
                style={{ background: hidden ? '#4b5563' : EDGE_COLORS[e.type] }}
              />
              <span className={hidden ? 'line-through' : ''}>{e.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default GraphLegend

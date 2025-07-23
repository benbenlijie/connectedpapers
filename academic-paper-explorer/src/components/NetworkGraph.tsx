import React, { useEffect, useRef, useState } from 'react'
import { Loader2, ZoomIn, ZoomOut, RotateCcw, Maximize2, Play, Pause } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

const NetworkGraph: React.FC = () => {
  const {
    networkData,
    isLoadingNetwork,
    selectedNodeId,
    setSelectedNodeId,
    setHighlightedNodes,
    filters
  } = useAppStore()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [nodes, setNodes] = useState<any[]>([])
  const [edges, setEdges] = useState<any[]>([])

  // 更新canvas尺寸
  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current?.parentElement) {
        const parent = canvasRef.current.parentElement
        setDimensions({
          width: parent.clientWidth,
          height: parent.clientHeight
        })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // 处理网络数据
  useEffect(() => {
    if (!networkData) return

    // 过滤节点
    const filteredNodes = networkData.nodes.filter(node => {
      if (filters.yearRange && node.year) {
        return node.year >= filters.yearRange[0] && node.year <= filters.yearRange[1]
      }
      return true
    })

    // 布局算法（简化的力导向布局）
    const layoutNodes = filteredNodes.map((node, index) => {
      const angle = (index / filteredNodes.length) * 2 * Math.PI
      const radius = node.isRoot ? 50 : 150 + (index % 3) * 100
      const centerX = dimensions.width / 2
      const centerY = dimensions.height / 2
      
      return {
        ...node,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        size: Math.max(15, Math.min(40, node.size))
      }
    })

    // 过滤边
    const filteredEdges = networkData.edges.filter(edge => 
      filteredNodes.some(n => n.id === edge.from) && 
      filteredNodes.some(n => n.id === edge.to)
    )

    setNodes(layoutNodes)
    setEdges(filteredEdges)
  }, [networkData, filters, dimensions])

  // 绘制网络
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || nodes.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 清空画布
    ctx.fillStyle = '#111827'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // 应用变换
    ctx.save()
    ctx.translate(offset.x, offset.y)
    ctx.scale(zoom, zoom)

    // 绘制边
    edges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from)
      const toNode = nodes.find(n => n.id === edge.to)
      
      if (fromNode && toNode) {
        ctx.beginPath()
        ctx.moveTo(fromNode.x, fromNode.y)
        ctx.lineTo(toNode.x, toNode.y)
        ctx.strokeStyle = edge.type === 'citation' ? '#4ade80' : '#60a5fa'
        ctx.lineWidth = Math.max(1, edge.weight * 2)
        ctx.globalAlpha = Math.max(0.3, edge.weight)
        ctx.stroke()
        
        // 绘制箭头
        const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x)
        const arrowLength = 15
        const arrowAngle = Math.PI / 6
        
        const endX = toNode.x - Math.cos(angle) * toNode.size
        const endY = toNode.y - Math.sin(angle) * toNode.size
        
        ctx.beginPath()
        ctx.moveTo(endX, endY)
        ctx.lineTo(
          endX - arrowLength * Math.cos(angle - arrowAngle),
          endY - arrowLength * Math.sin(angle - arrowAngle)
        )
        ctx.moveTo(endX, endY)
        ctx.lineTo(
          endX - arrowLength * Math.cos(angle + arrowAngle),
          endY - arrowLength * Math.sin(angle + arrowAngle)
        )
        ctx.stroke()
      }
    })

    // 绘制节点
    nodes.forEach(node => {
      ctx.globalAlpha = 1
      
      // 节点主体
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.size, 0, 2 * Math.PI)
      ctx.fillStyle = node.color
      ctx.fill()
      
      // 节点边框
      ctx.strokeStyle = node.isRoot ? '#ff6b35' : '#ffffff'
      ctx.lineWidth = node.isRoot ? 3 : 1
      ctx.stroke()
      
      // 高亮效果
      if (selectedNodeId === node.id) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.size + 5, 0, 2 * Math.PI)
        ctx.strokeStyle = '#ffd700'
        ctx.lineWidth = 3
        ctx.stroke()
      }
      
      // 节点标签
      if (zoom > 0.5) {
        ctx.fillStyle = '#ffffff'
        ctx.font = `${Math.max(10, 12 * zoom)}px Inter, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        const label = node.title.length > 20 ? node.title.substring(0, 20) + '...' : node.title
        ctx.fillText(label, node.x, node.y + node.size + 15)
      }
    })

    ctx.restore()
  }, [nodes, edges, dimensions, zoom, offset, selectedNodeId])

  // 鼠标事件处理
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = (e.clientX - rect.left - offset.x) / zoom
    const y = (e.clientY - rect.top - offset.y) / zoom

    // 检查是否点击了节点
    const clickedNode = nodes.find(node => {
      const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2)
      return distance <= node.size
    })

    if (clickedNode) {
      setSelectedNodeId(clickedNode.id)
      // 高亮相邻节点
      const connectedNodes = edges
        .filter(edge => edge.from === clickedNode.id || edge.to === clickedNode.id)
        .map(edge => edge.from === clickedNode.id ? edge.to : edge.from)
      setHighlightedNodes([clickedNode.id, ...connectedNodes])
    } else {
      setSelectedNodeId(null)
      setHighlightedNodes([])
      // 开始拖拽
      setIsDragging(true)
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(prev => Math.max(0.1, Math.min(3, prev * delta)))
  }

  // 控制功能
  const handleZoomIn = () => setZoom(prev => Math.min(3, prev * 1.2))
  const handleZoomOut = () => setZoom(prev => Math.max(0.1, prev / 1.2))
  const handleFit = () => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }
  const handleReset = () => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    setSelectedNodeId(null)
    setHighlightedNodes([])
  }

  if (isLoadingNetwork) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">正在构建网络图...</h3>
          <p className="text-gray-400">正在获取引用关系并计算网络结构</p>
        </div>
      </div>
    )
  }

  if (!networkData) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-gray-400">请选择一篇论文来生成网络图</p>
        </div>
      </div>
    )
  }

  // 处理空网络数据或错误数据
  if (!networkData.nodes || networkData.nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-yellow-400">网络数据为空</p>
          <p className="text-gray-400 text-sm mt-2">
            该论文可能没有可用的引用关系数据
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full bg-gray-900">
      {/* 网络画布 */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* 控制面板 */}
      <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-90 rounded-lg p-2 space-y-2">
        <button
          onClick={handleZoomIn}
          className="block w-full p-2 text-white hover:bg-gray-700 rounded transition-colors"
          title="放大"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        
        <button
          onClick={handleZoomOut}
          className="block w-full p-2 text-white hover:bg-gray-700 rounded transition-colors"
          title="缩小"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        
        <button
          onClick={handleFit}
          className="block w-full p-2 text-white hover:bg-gray-700 rounded transition-colors"
          title="适应屏幕"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        
        <button
          onClick={handleReset}
          className="block w-full p-2 text-white hover:bg-gray-700 rounded transition-colors"
          title="重置布局"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* 网络信息 */}
      <div className="absolute bottom-4 left-4 bg-gray-800 bg-opacity-90 rounded-lg px-3 py-2">
        <div className="text-sm text-white">
          {nodes.length} 节点 · {edges.length} 边 · 缩放: {(zoom * 100).toFixed(0)}%
        </div>
      </div>

      {/* 图例 */}
      <div className="absolute bottom-4 right-4 bg-gray-800 bg-opacity-90 rounded-lg p-3">
        <div className="text-xs text-white space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full border-2 border-orange-300"></div>
            <span>根论文</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-emerald-600 rounded-full"></div>
            <span>第一层</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-violet-600 rounded-full"></div>
            <span>第二层</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            <span>第三层</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-0.5 bg-green-400"></div>
            <span>引用关系</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-0.5 bg-blue-400"></div>
            <span>参考关系</span>
          </div>
        </div>
      </div>

      {/* 操作提示 */}
      <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-90 rounded-lg px-3 py-2">
        <div className="text-xs text-white space-y-1">
          <div>点击节点：选中论文</div>
          <div>拖拽：移动视图</div>
          <div>滚轮：缩放</div>
        </div>
      </div>
    </div>
  )
}

export default NetworkGraph
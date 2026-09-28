import { useEffect, useRef, useState } from 'react'
import type { NetworkEdge, NetworkNode } from '../types/domain'
import type { PositionedNode } from './computeLayout'

export function useLayout(
  nodes: NetworkNode[] | null,
  edges: NetworkEdge[] | null,
  width: number,
  height: number,
): PositionedNode[] {
  const [positions, setPositions] = useState<PositionedNode[]>([])
  const workerRef = useRef<Worker | null>(null)
  const reqId = useRef(0)

  useEffect(() => {
    workerRef.current = new Worker(new URL('./layout.worker.ts', import.meta.url), { type: 'module' })
    return () => workerRef.current?.terminate()
  }, [])

  useEffect(() => {
    const worker = workerRef.current
    if (!worker || !nodes || !edges || nodes.length === 0) {
      setPositions([])
      return
    }
    const id = ++reqId.current
    const onMessage = (e: MessageEvent<{ id: number; nodes: PositionedNode[] }>) => {
      if (e.data.id === id) setPositions(e.data.nodes)
    }
    worker.addEventListener('message', onMessage)
    worker.postMessage({ id, input: { nodes, edges, width, height } })
    return () => worker.removeEventListener('message', onMessage)
  }, [nodes, edges, width, height])

  return positions
}

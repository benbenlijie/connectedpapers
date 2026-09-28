/// <reference lib="webworker" />
import { computeLayout, type LayoutInput, type PositionedNode } from './computeLayout'

interface LayoutRequest { id: number; input: LayoutInput }
interface LayoutResponse { id: number; nodes: PositionedNode[] }

self.onmessage = (e: MessageEvent<LayoutRequest>) => {
  const { id, input } = e.data
  const nodes = computeLayout(input)
  const res: LayoutResponse = { id, nodes }
  ;(self as unknown as Worker).postMessage(res)
}

export {}

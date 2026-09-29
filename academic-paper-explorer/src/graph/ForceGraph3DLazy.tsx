import React, { forwardRef, useCallback } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import type { Object3D } from 'three'
import { createLabelSprite, truncateTitle } from './labels3d'
import type { GraphNode } from './graphAdapter'

interface Props {
  labelIds: Set<string>
  [key: string]: any
}

function buildLabelObject(node: GraphNode, labelIds: Set<string>): Object3D | null {
  if (!labelIds.has(node.id)) return null
  const sprite = createLabelSprite(truncateTitle(node.title || node.label), {
    height: Math.max(6, node.size),
  })
  sprite.position.set(0, Math.cbrt(node.size) * 2 + node.size / 2 + 4, 0)
  return sprite
}

const ForceGraph3DAny = ForceGraph3D as React.ComponentType<any>

/**
 * 3D graph wrapper. Kept behind the lazy boundary so `three` (pulled in via
 * labels3d / react-force-graph-3d) never lands in the initial bundle.
 */
const ForceGraph3DWithLabels = forwardRef<any, Props>(({ labelIds, ...props }, ref) => {
  const nodeThreeObject = useCallback(
    (node: object) => buildLabelObject(node as GraphNode, labelIds),
    [labelIds],
  )
  return <ForceGraph3DAny ref={ref} {...props} nodeThreeObject={nodeThreeObject} nodeThreeObjectExtend />
})

export default ForceGraph3DWithLabels

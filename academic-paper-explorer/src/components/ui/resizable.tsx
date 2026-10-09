import React from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { cn } from '../../lib/utils'

/**
 * Thin wrappers around `react-resizable-panels`, so the app has one place to
 * style the drag handles.
 *
 * Sizes are percentages (the library has no pixel API). Give every panel a
 * stable `id` + `order`, and pass `autoSaveId` to persist the user's layout in
 * localStorage. Handles are keyboard accessible too: focus one and use the
 * arrow keys.
 */

/** The little grip drawn in the middle of a divider (as a pseudo-element). */
const GRIP = [
  'before:pointer-events-none before:absolute before:left-1/2 before:top-1/2',
  'before:h-8 before:w-0.5 before:-translate-x-1/2 before:-translate-y-1/2',
  'before:rounded-full before:bg-gray-500 before:transition-colors before:content-[""]',
].join(' ')

const ResizablePanelGroup: React.FC<React.ComponentProps<typeof PanelGroup>> = ({ className, ...props }) => (
  <PanelGroup className={cn('group h-full w-full min-h-0 min-w-0', className)} {...props} />
)

const ResizablePanel: React.FC<React.ComponentProps<typeof Panel>> = ({ className, ...props }) => (
  <Panel className={cn('min-h-0 min-w-0', className)} {...props} />
)

interface ResizableHandleProps extends React.ComponentProps<typeof PanelResizeHandle> {
  /** Draw a short rounded grip in the middle of the divider. */
  withHandle?: boolean
}

const ResizableHandle: React.FC<ResizableHandleProps> = ({ className, withHandle, ...props }) => (
  <PanelResizeHandle
    className={cn(
      'relative flex w-1.5 flex-shrink-0 cursor-col-resize items-center justify-center bg-gray-700 outline-none transition-colors',
      'hover:bg-blue-500 focus-visible:bg-blue-500 data-[resize-handle-state=drag]:bg-blue-500',
      // Vertical groups swap the divider for a horizontal bar.
      'data-[panel-group-direction=vertical]:h-1.5 data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:cursor-row-resize',
      'data-[panel-group-direction=vertical]:before:h-0.5 data-[panel-group-direction=vertical]:before:w-8',
      withHandle && GRIP,
      withHandle && 'hover:before:bg-blue-200 data-[resize-handle-state=drag]:before:bg-blue-100',
      className,
    )}
    {...props}
  />
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }

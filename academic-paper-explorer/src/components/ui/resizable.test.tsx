import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './resizable'

function Layout() {
  return (
    <ResizablePanelGroup direction="horizontal" id="probe">
      <ResizablePanel id="left" order={1} defaultSize={25}>
        <span>left</span>
      </ResizablePanel>
      <ResizableHandle withHandle data-testid="handle" />
      <ResizablePanel id="right" order={2} defaultSize={75}>
        <span>right</span>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

describe('resizable panel primitives', () => {
  it('renders panels and a separator handle', () => {
    const { container, getByTestId } = render(<Layout />)
    expect(container.querySelectorAll('[data-panel]')).toHaveLength(2)
    const handle = getByTestId('handle')
    expect(handle).toHaveAttribute('role', 'separator')
    expect(handle).toHaveAttribute('data-panel-group-direction', 'horizontal')
  })

  it('exposes the panels with their ids so layouts can be persisted', () => {
    const { container } = render(<Layout />)
    const group = container.querySelector('[data-panel-group]') as HTMLElement
    expect(group).toHaveAttribute('data-panel-group-direction', 'horizontal')
    expect(group.querySelector('[data-panel-id="left"]')).toBeTruthy()
    expect(group.querySelector('[data-panel-id="right"]')).toBeTruthy()
  })

  it('marks the handle as draggable and draws the grip when asked', () => {
    const { getByTestId } = render(<Layout />)
    const handle = getByTestId('handle')
    expect(handle.className).toContain('cursor-col-resize')
    expect(handle).toHaveAttribute('data-panel-resize-handle-enabled', 'true')
    // The grip is a pseudo-element, so its styles show up as `before:` classes.
    expect(handle.className).toContain('before:absolute')
    expect(handle.className).toContain('before:bg-gray-500')
  })
})

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GraphToolbar from './GraphToolbar'

describe('GraphToolbar export menu', () => {
  it('invokes the export handlers for each menu item', () => {
    const png = vi.fn()
    const visible = vi.fn()
    const full = vi.fn()
    render(<GraphToolbar onExportPng={png} onExportJsonVisible={visible} onExportJsonFull={full} />)

    const open = () => fireEvent.click(screen.getByRole('button', { name: /导出/ }))
    open()
    fireEvent.click(screen.getByText('PNG（当前视图）'))
    open()
    fireEvent.click(screen.getByText('JSON（当前视图）'))
    open()
    fireEvent.click(screen.getByText('JSON（完整网络）'))

    expect(png).toHaveBeenCalledOnce()
    expect(visible).toHaveBeenCalledOnce()
    expect(full).toHaveBeenCalledOnce()
  })

  it('invokes the BibTeX and CSV handlers', () => {
    const bib = vi.fn()
    const csv = vi.fn()
    render(<GraphToolbar onExportBibtex={bib} onExportCsv={csv} />)
    const open = () => fireEvent.click(screen.getByRole('button', { name: /导出/ }))
    open()
    fireEvent.click(screen.getByText('BibTeX（当前视图）'))
    open()
    fireEvent.click(screen.getByText('CSV（当前视图）'))
    expect(bib).toHaveBeenCalledOnce()
    expect(csv).toHaveBeenCalledOnce()
  })

  it('toggles the node list', () => {
    const toggle = vi.fn()
    render(<GraphToolbar onToggleNodeList={toggle} />)
    fireEvent.click(screen.getByRole('button', { name: '节点列表' }))
    expect(toggle).toHaveBeenCalledOnce()
  })
})

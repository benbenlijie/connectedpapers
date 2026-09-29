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
})

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ReaderPage from './ReaderPage'

const ARTICLE = `<!DOCTYPE html><html><head><title>Paper</title></head><body>
  <h1 id="S1">Introduction</h1>
  <p>hello world</p>
</body></html>`

const realFetch = globalThis.fetch

function renderReader(path = '/read/2401.00001') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/read/:arxivId" element={<ReaderPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

let mockProviders: { name: string; kind: string }[] = []

beforeEach(() => {
  mockProviders = []
  globalThis.fetch = vi.fn(async (url: unknown) => {
    if (String(url).includes('/api/llm/status')) {
      return { ok: true, json: async () => ({ data: { providers: mockProviders } }) } as unknown as Response
    }
    return { ok: true, text: async () => ARTICLE } as unknown as Response
  }) as unknown as typeof fetch
})

afterEach(() => {
  globalThis.fetch = realFetch
})

describe('ReaderPage', () => {
  it('fetches, sanitizes and renders the article with its outline', async () => {
    renderReader()
    const frame = await screen.findByTestId('reader-frame')
    expect(frame.getAttribute('srcdoc')).toContain('hello world')
    expect(frame.getAttribute('srcdoc')).toContain('<base href="https://arxiv.org/">')
    expect(screen.getByRole('button', { name: 'Introduction' })).toBeInTheDocument()
  })

  it('shows a fallback with abs/pdf links when the fetch fails', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 404 }) as unknown as Response) as unknown as typeof fetch
    renderReader()
    expect(await screen.findByText(/无法加载/)).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links.some((l) => l.getAttribute('href') === 'https://arxiv.org/abs/2401.00001')).toBe(true)
  })

  it('links to the PDF as a fallback', async () => {
    renderReader()
    await screen.findByTestId('reader-frame')
    const links = screen.getAllByRole('link')
    expect(links.some((l) => l.getAttribute('href') === 'https://arxiv.org/pdf/2401.00001')).toBe(true)
  })

  it('disables translation when no provider is configured', async () => {
    renderReader()
    await screen.findByTestId('reader-frame')
    await waitFor(() => expect(screen.getByRole('button', { name: '翻译' })).toBeDisabled())
  })

  it('enables translation when a provider is configured', async () => {
    mockProviders = [{ name: 'browser', kind: 'browser' }]
    renderReader()
    await waitFor(() => expect(screen.getByRole('button', { name: '翻译' })).toBeEnabled())
  })
})

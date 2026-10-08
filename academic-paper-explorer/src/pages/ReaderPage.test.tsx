import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ReaderPage from './ReaderPage'
import { useReadingStore } from '../store/useReadingStore'
import { useHighlightsStore } from '../store/useHighlightsStore'
import { clearProviderCache } from '../lib/translator'

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
  localStorage.clear()
  clearProviderCache()
  useReadingStore.setState({ entries: {} })
  useHighlightsStore.setState({ highlights: {} })
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
    expect(frame.getAttribute('srcdoc')).toContain('<base href="https://arxiv.org/html/">')
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

  it('disables the AI assistant when no openai provider is configured', async () => {
    mockProviders = [{ name: 'browser', kind: 'browser' }]
    renderReader()
    await waitFor(() => expect(screen.getByRole('button', { name: /AI 助手/ })).toBeDisabled())
  })

  it('enables the AI assistant with an openai provider', async () => {
    mockProviders = [{ name: 'mtcode', kind: 'openai' }]
    renderReader()
    await waitFor(() => expect(screen.getByRole('button', { name: /AI 助手/ })).toBeEnabled())
  })

  it('marks the paper as reading when opened', async () => {
    renderReader('/read/2401.00001?pid=p1')
    await screen.findByTestId('reader-frame')
    await waitFor(() => expect(useReadingStore.getState().entries.p1?.status).toBe('reading'))
  })

  it('highlights translated text as well as the English source', async () => {
    renderReader()
    const frame = (await screen.findByTestId('reader-frame')) as HTMLIFrameElement
    const doc = frame.contentDocument!
    // jsdom does not load `srcdoc`, so give the iframe a real body first.
    doc.documentElement.innerHTML = '<head><title>Paper</title></head><body><p>hello world</p></body>'
    // Bind the reader's in-iframe listeners (idempotent: a real load may have
    // done it already).
    frame.dispatchEvent(new Event('load'))

    const block = doc.querySelector('p')!
    block.setAttribute('data-cn-src', '0')
    const node = doc.createElement('div')
    node.setAttribute('data-cn-translation', '')
    node.setAttribute('data-cn-for', '0')
    node.className = 'cn-translation'
    node.textContent = '你好，世界'
    block.insertAdjacentElement('afterend', node)

    const range = doc.createRange()
    range.setStart(node.firstChild!, 0)
    range.setEnd(node.firstChild!, 2)
    const sel = doc.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
    await act(async () => {
      doc.dispatchEvent(new Event('mouseup'))
    })

    expect(await screen.findByText('译文')).toBeInTheDocument()
    // The click that trails a text drag must not fold the translation out from
    // under the pending annotation.
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(node.textContent).toBe('你好，世界')

    fireEvent.click(screen.getByLabelText('高亮-绿'))
    expect(node.querySelector('mark[data-hl-id]')?.textContent).toBe('你好')
    expect(useHighlightsStore.getState().highlights['2401.00001']?.[0]).toMatchObject({
      blockIndex: 0,
      start: 0,
      end: 2,
      surface: 'translation',
      color: 'green',
    })
  })
})

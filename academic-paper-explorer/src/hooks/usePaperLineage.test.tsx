import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePaperLineage } from './usePaperLineage'
import type { PaperLineage } from '../types/domain'

const apiMock = vi.hoisted(() => ({ lineage: vi.fn() }))
vi.mock('../services/api', () => ({ api: { lineage: apiMock.lineage } }))

const data: PaperLineage = {
  root_id: 'p1',
  prior: [{ paperId: 'r1', title: 'Prior', year: 2018 }],
  followUps: [{ paperId: 'c1', title: 'Follow', isInfluential: true }],
}

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => apiMock.lineage.mockReset())

describe('usePaperLineage', () => {
  it('does not fetch without a paper id', async () => {
    renderHook(() => usePaperLineage(null), { wrapper })
    await new Promise((r) => setTimeout(r, 20))
    expect(apiMock.lineage).not.toHaveBeenCalled()
  })

  it('fetches lineage for a paper id', async () => {
    apiMock.lineage.mockResolvedValue(data)
    const { result } = renderHook(() => usePaperLineage('p1'), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual(data))
    expect(apiMock.lineage).toHaveBeenCalledWith('p1')
  })
})

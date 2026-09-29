import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useUiStore } from '../store/useUiStore'
import { resolveClientId } from './usePaperNetwork'
import { parseUrlState, serializeUrlState, paperStubFromId, type UrlState } from '../graph/urlState'

export function useUrlSync() {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.toString()
  const lastWritten = useRef<string | null>(null)
  const hydrated = useRef(false)

  // URL -> store. Skipped when the current search is one we just wrote, so we
  // never re-hydrate (and loop) on our own navigation.
  useEffect(() => {
    if (hydrated.current && search === lastWritten.current) return
    const s = parseUrlState(search)
    const store = useUiStore.getState()
    store.setSelectedPaper(s.paperId ? paperStubFromId(s.paperId) : null)
    store.setGraphParams(s.depth, s.maxNodes)
    store.setSelectedNodeId(s.selectedNodeId)
    store.setComparePaper(s.comparePaperId ? paperStubFromId(s.comparePaperId) : null)
    store.setCompareSelectedNodeId(s.compareSelectedNodeId)
    store.setGraphView(s.graphView)
    store.setColorMode(s.colorMode)
    store.setSizeMode(s.sizeMode)
    store.setTimelineYear(s.timelineYear)
    store.updateFilters({
      yearRange: s.yearRange,
      minCitations: s.minCitations,
      selectedFields: s.selectedFields,
      selectedVenues: s.selectedVenues,
    })
    lastWritten.current = search
    hydrated.current = true
  }, [search])

  // store -> URL. Root-paper changes push a history entry; everything else replaces.
  useEffect(() => {
    if (!hydrated.current) return
    const write = () => {
      const s = useUiStore.getState()
      const next: UrlState = {
        paperId: resolveClientId(s.selectedPaper),
        depth: s.graphDepth,
        maxNodes: s.graphMaxNodes,
        selectedNodeId: s.selectedNodeId,
        comparePaperId: resolveClientId(s.comparePaper),
        compareSelectedNodeId: s.compareSelectedNodeId,
        graphView: s.graphView,
        colorMode: s.colorMode,
        sizeMode: s.sizeMode,
        timelineYear: s.timelineYear,
        yearRange: s.filters.yearRange,
        minCitations: s.filters.minCitations,
        selectedFields: s.filters.selectedFields,
        selectedVenues: s.filters.selectedVenues,
      }
      const serialized = serializeUrlState(next)
      if (serialized === lastWritten.current) return
      const prev = lastWritten.current ? parseUrlState(lastWritten.current) : null
      const rootChanged =
        next.paperId !== (prev?.paperId ?? null) ||
        next.comparePaperId !== (prev?.comparePaperId ?? null)
      lastWritten.current = serialized
      setSearchParams(new URLSearchParams(serialized), { replace: !rootChanged })
    }
    const unsubscribe = useUiStore.subscribe(write)
    write()
    return unsubscribe
  }, [setSearchParams])
}

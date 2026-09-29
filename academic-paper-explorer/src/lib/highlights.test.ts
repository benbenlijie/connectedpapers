import { describe, it, expect } from 'vitest'
import {
  rangeToAnchor,
  anchorToRange,
  applyHighlight,
  removeHighlightNodes,
  clearHighlights,
  parseHighlights,
  serializeHighlights,
  withHighlight,
  removeHighlight,
  colorCss,
  type Highlight,
} from './highlights'

function doc(html: string): Document {
  return new DOMParser().parseFromString(`<html><body>${html}</body></html>`, 'text/html')
}

function blocks(d: Document): Element[] {
  return Array.from(d.querySelectorAll('p'))
}

describe('anchor round-trip', () => {
  it('maps a range to block offsets and back', () => {
    const d = doc('<p>Hello brave new world</p><p>Second paragraph</p>')
    const bs = blocks(d)
    const range = d.createRange()
    range.setStart(bs[0].firstChild!, 6)
    range.setEnd(bs[0].firstChild!, 11)

    expect(rangeToAnchor(range, bs)).toEqual({ blockIndex: 0, start: 6, end: 11 })
    expect(anchorToRange(d, bs[0], 6, 11)?.toString()).toBe('brave')
  })

  it('returns null when the range spans blocks', () => {
    const d = doc('<p>One</p><p>Two</p>')
    const bs = blocks(d)
    const range = d.createRange()
    range.setStart(bs[0].firstChild!, 1)
    range.setEnd(bs[1].firstChild!, 2)
    expect(rangeToAnchor(range, bs)).toBeNull()
  })
})

describe('applyHighlight', () => {
  it('wraps the selected text without changing block text', () => {
    const d = doc('<p>Hello brave new world</p>')
    const bs = blocks(d)
    const range = anchorToRange(d, bs[0], 6, 11)!
    applyHighlight(d, range, 'h1', 'yellow')
    const mark = d.querySelector('mark[data-hl-id="h1"]')!
    expect(mark.textContent).toBe('brave')
    expect(bs[0].textContent).toBe('Hello brave new world')
  })

  it('wraps across inline elements', () => {
    const d = doc('<p>Hello <em>brave</em> world</p>')
    const bs = blocks(d)
    const range = anchorToRange(d, bs[0], 4, 9)!
    expect(range.toString()).toBe('o bra')
    applyHighlight(d, range, 'h1', 'green')
    const marks = Array.from(d.querySelectorAll('mark[data-hl-id="h1"]'))
    expect(marks.map((m) => m.textContent).join('')).toBe('o bra')
    expect(bs[0].textContent).toBe('Hello brave world')
  })

  it('removes highlights and restores the text', () => {
    const d = doc('<p>Hello brave new world</p>')
    const bs = blocks(d)
    applyHighlight(d, anchorToRange(d, bs[0], 6, 11)!, 'h1', 'pink')
    removeHighlightNodes(d, 'h1')
    expect(d.querySelector('mark')).toBeNull()
    expect(bs[0].textContent).toBe('Hello brave new world')
  })

  it('clears every highlight', () => {
    const d = doc('<p>Hello brave new world</p>')
    const bs = blocks(d)
    applyHighlight(d, anchorToRange(d, bs[0], 0, 5)!, 'a', 'yellow')
    applyHighlight(d, anchorToRange(d, bs[0], 6, 11)!, 'b', 'green')
    clearHighlights(d)
    expect(d.querySelectorAll('mark')).toHaveLength(0)
  })
})

describe('map helpers', () => {
  const hl: Highlight = { id: 'h1', blockIndex: 0, start: 0, end: 5, text: 'Hello', color: 'yellow' }

  it('adds and removes highlights immutably', () => {
    const map = withHighlight({}, 'p1', hl)
    expect(map.p1).toHaveLength(1)
    expect(removeHighlight(map, 'p1', 'h1')).toEqual({ p1: [] })
  })

  it('round-trips through parse/serialize', () => {
    const map = withHighlight({}, 'p1', hl)
    expect(parseHighlights(serializeHighlights(map))).toEqual(map)
  })

  it('drops invalid entries', () => {
    const raw = JSON.stringify({
      p1: [{ id: 'a', blockIndex: 0, start: 0, end: 1, text: 'x', color: 'yellow' }, { id: 'b', color: 'nope' }],
      p2: 'nope',
    })
    const parsed = parseHighlights(raw)
    expect(parsed.p1).toHaveLength(1)
    expect(parsed.p2).toBeUndefined()
  })

  it('maps colours to css', () => {
    expect(colorCss('yellow')).toMatch(/^#|rgb/)
  })
})

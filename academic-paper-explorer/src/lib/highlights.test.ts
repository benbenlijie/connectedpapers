import { describe, it, expect } from 'vitest'
import {
  rangeToAnchor,
  rangeToTarget,
  anchorToRange,
  applyHighlight,
  paintHighlight,
  removeHighlightNodes,
  clearHighlights,
  parseHighlights,
  serializeHighlights,
  withHighlight,
  removeHighlight,
  colorCss,
  type Highlight,
  type HighlightTarget,
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

describe('translation surface anchors', () => {
  function translatedDoc(): { d: Document; cell: Element; node: HTMLElement } {
    const d = doc(
      '<table><tr><td>Cell text</td></tr></table>' +
        '<div data-cn-translation data-cn-for="0" class="cn-translation">你好，世界</div>',
    )
    return {
      d,
      cell: d.querySelector('td')!,
      node: d.querySelector<HTMLElement>('[data-cn-translation]')!,
    }
  }

  it('tags an anchor recorded against a translation node', () => {
    const { d, node } = translatedDoc()
    const range = d.createRange()
    range.setStart(node.firstChild!, 0)
    range.setEnd(node.firstChild!, 2)

    expect(rangeToAnchor(range, [node], 'translation')).toEqual({
      blockIndex: 0,
      start: 0,
      end: 2,
      surface: 'translation',
    })
    // The source layer keeps its historical shape (no `surface` field).
    expect(rangeToAnchor(range, [node])).toEqual({ blockIndex: 0, start: 0, end: 2 })
  })

  it('prefers the translation target for a node nested inside its source block', () => {
    // A table-cell translation is appended *inside* the <td>, so the source
    // target would otherwise win and store offsets against mixed text.
    const d = doc('<table><tr><td>Cell text</td></tr></table>')
    const cell = d.querySelector('td')!
    const node = d.createElement('div')
    node.setAttribute('data-cn-translation', '')
    node.setAttribute('data-cn-for', '0')
    node.textContent = '单元格'
    cell.appendChild(node)

    const range = d.createRange()
    range.setStart(node.firstChild!, 0)
    range.setEnd(node.firstChild!, 3)
    const targets: HighlightTarget[] = [
      { element: node, blockIndex: 0, surface: 'translation' },
      { element: cell, blockIndex: 0 },
    ]
    expect(rangeToTarget(range, targets)?.surface).toBe('translation')
  })

  it('paints a translation highlight and repaints it without nesting marks', () => {
    const { d, node } = translatedDoc()
    const hl: Highlight = {
      id: 'h1',
      blockIndex: 0,
      start: 0,
      end: 2,
      surface: 'translation',
      text: '你好',
      color: 'green',
    }
    expect(paintHighlight(d, node, hl)).toBe(true)
    expect(paintHighlight(d, node, hl)).toBe(true)
    const marks = d.querySelectorAll('mark[data-hl-id="h1"]')
    expect(marks).toHaveLength(1)
    expect(marks[0].textContent).toBe('你好')
    expect(node.textContent).toBe('你好，世界')
  })

  it('refuses to paint when the target is gone or the text no longer fits', () => {
    const { d, node } = translatedDoc()
    const hl: Highlight = {
      id: 'h1',
      blockIndex: 0,
      start: 0,
      end: 99,
      surface: 'translation',
      text: 'x',
      color: 'yellow',
    }
    expect(paintHighlight(d, node, hl)).toBe(false)
    expect(paintHighlight(d, null, hl)).toBe(false)
    expect(d.querySelector('mark')).toBeNull()
  })

  it('strips leftover marks before repainting at the same id', () => {
    const { d, node } = translatedDoc()
    const hl: Highlight = {
      id: 'h1',
      blockIndex: 0,
      start: 0,
      end: 2,
      surface: 'translation',
      text: '你好',
      color: 'yellow',
    }
    paintHighlight(d, node, hl)
    removeHighlightNodes(d, 'h1')
    paintHighlight(d, node, { ...hl, color: 'pink' })
    expect(d.querySelectorAll('mark[data-hl-id="h1"]')).toHaveLength(1)
  })

  it('round-trips a translation anchor through parse/serialize', () => {
    const hl: Highlight = {
      id: 'h1',
      blockIndex: 2,
      start: 1,
      end: 4,
      surface: 'translation',
      text: '你好',
      color: 'yellow',
    }
    const map = withHighlight({}, 'p1', hl)
    expect(parseHighlights(serializeHighlights(map))).toEqual(map)
  })

  it('falls back to the source layer for a missing or unknown surface', () => {
    const raw = JSON.stringify({
      p1: [
        { id: 'a', blockIndex: 0, start: 0, end: 1, text: 'x', color: 'yellow' },
        { id: 'b', blockIndex: 1, start: 0, end: 1, text: 'y', color: 'yellow', surface: 'nope' },
      ],
    })
    expect(parseHighlights(raw).p1.map((h) => h.surface)).toEqual([undefined, undefined])
  })
})

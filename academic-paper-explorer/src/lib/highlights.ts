export type HighlightColor = 'yellow' | 'green' | 'pink'

/**
 * Which layer of a block an anchor's offsets point at: the original English
 * text (`source`) or the injected translation node (`translation`). Anchors
 * written before translation highlighting existed carry no `surface`, so an
 * absent value always means `source` — keeping the stored format and any old
 * `localStorage` payload backward compatible.
 */
export type HighlightSurface = 'source' | 'translation'

export interface HighlightAnchor {
  blockIndex: number
  start: number
  end: number
  surface?: HighlightSurface
}

export interface Highlight extends HighlightAnchor {
  id: string
  text: string
  note?: string
  color: HighlightColor
  createdAt?: string
}

export type HighlightMap = Record<string, Highlight[]>

export const HIGHLIGHT_COLORS: { value: HighlightColor; label: string; css: string }[] = [
  { value: 'yellow', label: '黄', css: '#fde68a' },
  { value: 'green', label: '绿', css: '#bbf7d0' },
  { value: 'pink', label: '粉', css: '#fbcfe8' },
]

const COLOR_VALUES = HIGHLIGHT_COLORS.map((c) => c.value)

export function colorCss(color: HighlightColor): string {
  return HIGHLIGHT_COLORS.find((c) => c.value === color)?.css ?? HIGHLIGHT_COLORS[0].css
}

function isColor(value: unknown): value is HighlightColor {
  return typeof value === 'string' && (COLOR_VALUES as string[]).includes(value)
}

function isAnchor(value: Record<string, unknown>): boolean {
  return (
    Number.isInteger(value.blockIndex) &&
    Number.isInteger(value.start) &&
    Number.isInteger(value.end) &&
    (value.start as number) >= 0 &&
    (value.end as number) >= (value.start as number)
  )
}

export function parseHighlights(raw: string | null): HighlightMap {
  if (!raw) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}

  const out: HighlightMap = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (!Array.isArray(value)) continue
    const items: Highlight[] = []
    for (const item of value) {
      if (typeof item !== 'object' || item === null) continue
      const h = item as Record<string, unknown>
      if (typeof h.id !== 'string' || !isColor(h.color) || !isAnchor(h)) continue
      items.push({
        id: h.id,
        blockIndex: h.blockIndex as number,
        start: h.start as number,
        end: h.end as number,
        // Only the translation layer is recorded explicitly; anything else
        // (absent, unknown) falls back to the source layer.
        ...(h.surface === 'translation' ? { surface: 'translation' as const } : {}),
        text: typeof h.text === 'string' ? h.text : '',
        color: h.color,
        ...(typeof h.note === 'string' ? { note: h.note } : {}),
        ...(typeof h.createdAt === 'string' ? { createdAt: h.createdAt } : {}),
      })
    }
    out[key] = items
  }
  return out
}

export function serializeHighlights(map: HighlightMap): string {
  return JSON.stringify(map)
}

export function withHighlight(map: HighlightMap, key: string, hl: Highlight): HighlightMap {
  return { ...map, [key]: [...(map[key] ?? []), hl] }
}

export function removeHighlight(map: HighlightMap, key: string, id: string): HighlightMap {
  return { ...map, [key]: (map[key] ?? []).filter((h) => h.id !== id) }
}

function textNodesIn(node: Node, accept: (n: Text) => boolean): Text[] {
  if (node.nodeType === 3) {
    const text = node as Text
    return text.nodeValue && accept(text) ? [text] : []
  }
  const doc = node.ownerDocument ?? (node as Document)
  const walker = doc.createTreeWalker(node, NodeFilter.SHOW_TEXT)
  const out: Text[] = []
  while (walker.nextNode()) {
    const n = walker.currentNode as Text
    if (n.nodeValue && accept(n)) out.push(n)
  }
  return out
}

/** A highlightable DOM region: a source block or a rendered translation node,
 * tagged with the block index its anchors are stored against. */
export interface HighlightTarget {
  element: Element
  blockIndex: number
  surface?: HighlightSurface
}

/** Character offsets of a range relative to the first target it lives in, or null. */
export function rangeToTarget(range: Range, targets: HighlightTarget[]): HighlightAnchor | null {
  const target = targets.find(
    (t) => t.element.contains(range.startContainer) && t.element.contains(range.endContainer),
  )
  if (!target) return null
  const doc = range.startContainer.ownerDocument!
  const pre = doc.createRange()
  pre.selectNodeContents(target.element)
  pre.setEnd(range.startContainer, range.startOffset)
  const start = pre.toString().length
  const end = start + range.toString().length
  return target.surface === 'translation'
    ? { blockIndex: target.blockIndex, start, end, surface: 'translation' }
    : { blockIndex: target.blockIndex, start, end }
}

/** Character offsets of a range relative to the block it lives in, or null. */
export function rangeToAnchor(
  range: Range,
  blocks: Element[],
  surface: HighlightSurface = 'source',
): HighlightAnchor | null {
  return rangeToTarget(
    range,
    blocks.map((element, blockIndex) => ({ element, blockIndex, surface })),
  )
}

export function anchorToRange(doc: Document, block: Element, start: number, end: number): Range | null {
  const range = doc.createRange()
  const nodes = textNodesIn(block, () => true)
  let pos = 0
  let startSet = false
  for (const node of nodes) {
    const len = node.nodeValue?.length ?? 0
    const nodeStart = pos
    const nodeEnd = pos + len
    if (!startSet && start <= nodeEnd) {
      range.setStart(node, Math.max(0, start - nodeStart))
      startSet = true
    }
    if (startSet && end <= nodeEnd) {
      range.setEnd(node, Math.max(0, end - nodeStart))
      return range
    }
    pos = nodeEnd
  }
  return null
}

/** Wrap the range's text in `<mark data-hl-id>` segments (one per text node). */
export function applyHighlight(doc: Document, range: Range, id: string, color: HighlightColor): void {
  const nodes = textNodesIn(range.commonAncestorContainer, (n) => range.intersectsNode(n))
  for (const node of nodes) {
    const start = node === range.startContainer ? range.startOffset : 0
    const end = node === range.endContainer ? range.endOffset : node.length
    if (end <= start) continue
    const segment = node.splitText(start)
    segment.splitText(end - start)
    const mark = doc.createElement('mark')
    mark.setAttribute('data-hl-id', id)
    mark.style.backgroundColor = colorCss(color)
    segment.parentNode?.replaceChild(mark, segment)
    mark.appendChild(segment)
  }
}

export function removeHighlightNodes(doc: Document, id: string): void {
  doc.querySelectorAll(`mark[data-hl-id="${id}"]`).forEach((mark) => {
    mark.replaceWith(...Array.from(mark.childNodes))
  })
}

export function clearHighlights(doc: Document): void {
  doc.querySelectorAll('mark[data-hl-id]').forEach((mark) => {
    mark.replaceWith(...Array.from(mark.childNodes))
  })
}

/**
 * (Re)paint a stored highlight onto `el`. Marks left over from an earlier paint
 * of the same id are removed first, so repeated repaints (a translation node
 * re-rendered, a recolour) never nest `<mark>` elements. Returns false when the
 * element is missing or its current text can no longer hold the anchor — e.g. a
 * translation that was re-rendered in another language, collapsed or pending.
 */
export function paintHighlight(doc: Document, el: Element | null, hl: Highlight): boolean {
  if (!el) return false
  removeHighlightNodes(doc, hl.id)
  const range = anchorToRange(doc, el, hl.start, hl.end)
  if (!range || range.collapsed) return false
  applyHighlight(doc, range, hl.id, hl.color)
  return true
}

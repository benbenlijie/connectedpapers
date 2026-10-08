import {
  clearHighlights,
  paintHighlight,
  type Highlight,
  type HighlightAnchor,
  type HighlightTarget,
} from './highlights'
import { isTranslationReady, readyTranslationNodes, translationNodeFor } from './readerBlocks'

/**
 * Glue between stored highlights and the reader's two text layers: the source
 * blocks from `collectBlocks` and the translation nodes injected alongside
 * them. `lib/highlights.ts` stays DOM-generic; everything that knows about
 * translations lives here so `ReaderPage` only wires up events.
 */

/**
 * Resolve the element a stored anchor was recorded against. A translation
 * anchor needs a *ready* node: while a node is pending, collapsed or failed it
 * shows sentinel text, so the stored offsets no longer describe what is on
 * screen and the anchor must not be painted.
 */
export function anchorElement(doc: Document, blocks: Element[], anchor: HighlightAnchor): Element | null {
  if (anchor.surface === 'translation') {
    const node = translationNodeFor(doc, anchor.blockIndex)
    return isTranslationReady(node) ? node : null
  }
  return blocks[anchor.blockIndex] ?? null
}

/** Paint one stored highlight onto whichever layer it belongs to. */
export function paint(doc: Document, blocks: Element[], hl: Highlight): boolean {
  return paintHighlight(doc, anchorElement(doc, blocks, hl), hl)
}

/** Paint every stored highlight from scratch (used on iframe load). */
export function restoreHighlights(doc: Document, blocks: Element[], list: Highlight[]): void {
  clearHighlights(doc)
  for (const hl of list) paint(doc, blocks, hl)
}

/** Every selectable region: ready translation nodes first, then source blocks.
 * A table-cell translation lives *inside* its source block, so the translation
 * target has to win the lookup or offsets would be recorded against mixed text. */
export function highlightTargets(doc: Document, blocks: Element[]): HighlightTarget[] {
  return [
    ...readyTranslationNodes(doc).map(({ element, blockIndex }) => ({
      element,
      blockIndex,
      surface: 'translation' as const,
    })),
    ...blocks.map((element, blockIndex) => ({ element, blockIndex })),
  ]
}

/**
 * Repaint translation highlights after their nodes were (re)rendered — which
 * replaces the text nodes the marks lived in — restricting the work to the
 * given source block indices. Source highlights are left untouched.
 */
export function repaintTranslations(
  doc: Document,
  blocks: Element[],
  list: Highlight[],
  indices: Iterable<number>,
): void {
  const wanted = new Set(indices)
  if (wanted.size === 0) return
  for (const hl of list) {
    if (hl.surface !== 'translation' || !wanted.has(hl.blockIndex)) continue
    paint(doc, blocks, hl)
  }
}

import { test, expect } from 'bun:test'
import { normalizeOpencodeEvent, serializeClientEvent } from './ai-events'

const SID = 'sess-1'

test('text deltas become text events (delta, not a snapshot)', () => {
  const out = normalizeOpencodeEvent(SID, {
    type: 'message.part.delta',
    properties: { sessionID: SID, messageID: 'm', partID: 'p', field: 'text', delta: 'The' },
  })
  expect(out).toEqual({ type: 'text', text: 'The' })
})

test('non-text deltas are ignored', () => {
  expect(
    normalizeOpencodeEvent(SID, {
      type: 'message.part.delta',
      properties: { sessionID: SID, field: 'reasoning', delta: 'x' },
    }),
  ).toBeNull()
})

test('events for other sessions are ignored', () => {
  const out = normalizeOpencodeEvent(SID, {
    type: 'message.part.delta',
    properties: { sessionID: 'other', field: 'text', delta: 'x' },
  })
  expect(out).toBeNull()
})

test('running tools become a start event with the tool name', () => {
  const out = normalizeOpencodeEvent(SID, {
    type: 'message.part.updated',
    properties: {
      sessionID: SID,
      part: { type: 'tool', tool: 'paper_search', state: { status: 'running', input: { query: 'graph' } } },
    },
  })
  expect(out).toMatchObject({ type: 'tool', name: 'paper_search', status: 'start' })
})

test('completed tools become a done event', () => {
  const out = normalizeOpencodeEvent(SID, {
    type: 'message.part.updated',
    properties: { sessionID: SID, part: { type: 'tool', tool: 'paper_search', state: { status: 'completed' } } },
  })
  expect(out).toEqual({ type: 'tool', name: 'paper_search', status: 'done' })
})

test('session.idle becomes done and session.error becomes error', () => {
  expect(normalizeOpencodeEvent(SID, { type: 'session.idle', properties: { sessionID: SID } })).toEqual({ type: 'done' })
  const err = normalizeOpencodeEvent(SID, {
    type: 'session.error',
    properties: { sessionID: SID, error: { message: 'boom' } },
  })
  expect(err).toEqual({ type: 'error', message: 'boom' })
})

test('bare session.idle with no sessionID still yields done', () => {
  expect(normalizeOpencodeEvent(SID, { type: 'session.idle', properties: {} })).toEqual({ type: 'done' })
})

test('idle for a different sessionID is ignored', () => {
  expect(
    normalizeOpencodeEvent(SID, { type: 'session.idle', properties: { sessionID: 'other' } }),
  ).toBeNull()
})

test('numeric tool input is stringified for the detail', () => {
  const out = normalizeOpencodeEvent(SID, {
    type: 'message.part.updated',
    properties: {
      sessionID: SID,
      part: { type: 'tool', tool: 'paper_section', state: { status: 'running', input: { idx: 3 } } },
    },
  })
  expect(out).toMatchObject({ type: 'tool', status: 'start', detail: '3' })
})

test('serializeClientEvent produces an SSE frame', () => {
  expect(serializeClientEvent({ type: 'done' })).toBe('data: {"type":"done"}\n\n')
})

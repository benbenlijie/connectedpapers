import { test, expect } from 'bun:test'
import { resolvePaperContentMode } from './config'

test('full text stays on for a loopback instance, off when others can reach it', () => {
  expect(resolvePaperContentMode(undefined, '127.0.0.1')).toBe('full')
  expect(resolvePaperContentMode(undefined, 'localhost')).toBe('full')
  expect(resolvePaperContentMode(undefined, '::1')).toBe('full')
  expect(resolvePaperContentMode(undefined, '0.0.0.0')).toBe('off')
  expect(resolvePaperContentMode(undefined, 'example.com')).toBe('off')
})

test('the mode can be forced either way, and junk falls back to the host rule', () => {
  expect(resolvePaperContentMode('full', '0.0.0.0')).toBe('full')
  expect(resolvePaperContentMode('off', '127.0.0.1')).toBe('off')
  expect(resolvePaperContentMode('  FULL  ', '0.0.0.0')).toBe('full')
  expect(resolvePaperContentMode('auto', '127.0.0.1')).toBe('full')
  expect(resolvePaperContentMode('', '127.0.0.1')).toBe('full')
  expect(resolvePaperContentMode('nonsense', 'example.com')).toBe('off')
})

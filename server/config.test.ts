import { test, expect } from 'bun:test'
import { num, resolvePaperContentMode } from './config'

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

test('num falls back to the default for missing, blank, and non-finite values', () => {
  expect(num(undefined, 500)).toBe(500)
  expect(num('', 500)).toBe(500)
  expect(num('42', 500)).toBe(42)
  expect(num('0', 500)).toBe(0)
  expect(num('-3', 500)).toBe(-3)
  expect(num('nonsense', 500)).toBe(500)
  expect(num('NaN', 500)).toBe(500)
  expect(num('Infinity', 500)).toBe(500)
  expect(num('-Infinity', 500)).toBe(500)
})

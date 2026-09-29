import { test, expect, beforeEach } from 'bun:test'
import { openDb } from './db'
import { translationHash, getCachedTranslations, cacheTranslations } from './translation-cache'

let db: ReturnType<typeof openDb>
beforeEach(() => { db = openDb(':memory:') })

test('translationHash is stable and depends on target and text', () => {
  expect(translationHash('zh', 'hello')).toBe(translationHash('zh', 'hello'))
  expect(translationHash('zh', 'hello')).not.toBe(translationHash('en', 'hello'))
  expect(translationHash('zh', 'hello')).not.toBe(translationHash('zh', 'world'))
})

test('cache roundtrip returns only stored hashes', () => {
  const h1 = translationHash('zh', 'hello')
  const h2 = translationHash('zh', 'world')
  cacheTranslations([{ hash: h1, target: 'zh', source: 'hello', translated: '你好', provider: 'mtcode' }], db)

  const got = getCachedTranslations([h1, h2], db)
  expect(got.get(h1)).toBe('你好')
  expect(got.has(h2)).toBe(false)
})

test('cache upsert overwrites the previous translation', () => {
  const h = translationHash('zh', 'hello')
  cacheTranslations([{ hash: h, target: 'zh', source: 'hello', translated: '你好', provider: 'a' }], db)
  cacheTranslations([{ hash: h, target: 'zh', source: 'hello', translated: '您好', provider: 'b' }], db)
  expect(getCachedTranslations([h], db).get(h)).toBe('您好')
})

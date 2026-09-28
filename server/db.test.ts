import { test, expect, beforeEach } from 'bun:test'
import { openDb } from './db'

let db: ReturnType<typeof openDb>
beforeEach(() => { db = openDb(':memory:') })

test('schema creates papers table', () => {
  const row = db.query("select name from sqlite_master where type='table' and name='papers'").get()
  expect(row).not.toBeNull()
})

test('papers insert/select roundtrip', () => {
  db.run("insert into papers (id,title,citation_count) values (?,?,?)", ['p1', 'T', 5])
  const got = db.query('select title, citation_count from papers where id=?').get('p1') as any
  expect(got.title).toBe('T')
  expect(got.citation_count).toBe(5)
})

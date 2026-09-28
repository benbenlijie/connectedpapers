import { Database } from 'bun:sqlite'
import { readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const SCHEMA = readFileSync(join(import.meta.dir, 'schema.sql'), 'utf8')

export function openDb(path = process.env.DB_PATH ?? join(import.meta.dir, '../data/app.db')): Database {
  if (path !== ':memory:') {
    mkdirSync(join(import.meta.dir, '../data'), { recursive: true })
  }
  const db = new Database(path)
  db.exec('pragma journal_mode = WAL;')
  db.exec('pragma foreign_keys = ON;')
  db.exec(SCHEMA)
  return db
}

export const db = openDb()

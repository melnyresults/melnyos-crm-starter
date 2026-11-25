import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { LocalError } from './local-http'

let connection: DatabaseSync | undefined

function database() {
  if (connection) return connection
  const directory = path.resolve(process.env.MELNYOS_DATA_DIR || 'data')
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  const db = new DatabaseSync(path.join(directory, 'crm.sqlite'))
  try {
    db.exec(`
      PRAGMA busy_timeout = 5000;
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS snapshots (
        name TEXT PRIMARY KEY, revision INTEGER NOT NULL, value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS records (
        kind TEXT NOT NULL, id TEXT NOT NULL, revision INTEGER NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, value TEXT NOT NULL,
        PRIMARY KEY (kind, id)
      );
      CREATE INDEX IF NOT EXISTS records_by_date ON records (kind, created_at DESC);
    `)
  } catch (error) {
    db.close()
    throw error
  }
  connection = db
  return db
}

export function loadSnapshot(name: string) {
  const row = database()
    .prepare('SELECT revision, value FROM snapshots WHERE name = ?')
    .get(name)
  return row
    ? { revision: Number(row.revision), value: JSON.parse(String(row.value)) }
    : { revision: 0, value: null }
}

function conflict(): never {
  throw new LocalError(
    409,
    'A newer version was saved. Reopen the record before making further changes.',
  )
}

export function saveSnapshot(
  name: string,
  expected: number,
  data: unknown,
): number {
  const db = database()
  const value = JSON.stringify(data)
  const result =
    expected === 0
      ? db
          .prepare(
            'INSERT INTO snapshots (name, revision, value) VALUES (?, 1, ?) ON CONFLICT (name) DO NOTHING',
          )
          .run(name, value)
      : db
          .prepare(
            'UPDATE snapshots SET value = ?, revision = revision + 1 WHERE name = ? AND revision = ?',
          )
          .run(value, name, expected)
  if (result.changes !== 1) conflict()
  return expected + 1
}

type RecordRow = NonNullable<
  ReturnType<ReturnType<DatabaseSync['prepare']>['get']>
>

function clientRecord(row: RecordRow) {
  return {
    ...JSON.parse(String(row.value)),
    id: String(row.id),
    revision: Number(row.revision),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function listRecords(kind: string) {
  return database()
    .prepare(
      'SELECT * FROM records WHERE kind = ? ORDER BY created_at DESC, rowid DESC',
    )
    .all(kind)
    .map(clientRecord)
}

export function createRecord(kind: string, fields: object) {
  const id = randomUUID()
  const date = new Date().toISOString()
  const row = database()
    .prepare(
      `
    INSERT INTO records (kind, id, revision, created_at, updated_at, value)
    VALUES (?, ?, 1, ?, ?, ?) RETURNING *
  `,
    )
    .get(kind, id, date, date, JSON.stringify(fields))
  return clientRecord(row!)
}

function missingOrChanged(kind: string, id: string): never {
  if (
    !database()
      .prepare('SELECT 1 FROM records WHERE kind = ? AND id = ?')
      .get(kind, id)
  )
    throw new LocalError(404, 'This record no longer exists.')
  return conflict()
}

export function updateRecord(
  kind: string,
  id: string,
  expected: number,
  fields: object,
) {
  const row = database()
    .prepare(
      `
    UPDATE records SET revision = revision + 1, value = ?, updated_at = ?
    WHERE kind = ? AND id = ? AND revision = ? RETURNING *
  `,
    )
    .get(JSON.stringify(fields), new Date().toISOString(), kind, id, expected)
  if (!row) return missingOrChanged(kind, id)
  return clientRecord(row)
}

export function deleteRecord(kind: string, id: string, expected: number) {
  const result = database()
    .prepare('DELETE FROM records WHERE kind = ? AND id = ? AND revision = ?')
    .run(kind, id, expected)
  if (result.changes !== 1) missingOrChanged(kind, id)
}

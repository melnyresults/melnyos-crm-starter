import { modules } from '@/components/melnyos/modules/catalog'
import { loadSnapshot, saveSnapshot } from '@/lib/local-db'
import {
  jsonResponse,
  LocalError,
  localRoute,
  objectValue,
  readJson,
  revisionNumber,
} from '@/lib/local-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
type Context = { params: Promise<{ view: string }> }

function snapshotKey(view: string) {
  if (!Object.hasOwn(modules, view))
    throw new LocalError(404, 'Unknown workspace section.')
  return 'module:' + view
}

function text(value: unknown, limit: number) {
  return typeof value === 'string' && value.length <= limit
}

function validRows(rows: unknown) {
  if (!Array.isArray(rows) || rows.length > 5000) return false
  const seen = new Set<string>()
  return rows.every((item) => {
    const row = objectValue(item)
    if (
      typeof row.id !== 'string' ||
      !row.id ||
      row.id.length > 150 ||
      seen.has(row.id)
    )
      return false
    seen.add(row.id)
    return (
      text(row.title, 160) &&
      Boolean((row.title as string).trim()) &&
      text(row.category, 250) &&
      text(row.status, 250) &&
      text(row.description, 16000) &&
      (row.excerpt === undefined || text(row.excerpt, 16000)) &&
      (row.notes === undefined ||
        (Array.isArray(row.notes) &&
          row.notes.every((note) => text(note, 2000)))) &&
      (row.facts === undefined ||
        (Array.isArray(row.facts) &&
          row.facts.every(
            (pair) =>
              Array.isArray(pair) &&
              pair.length === 2 &&
              pair.every((part) => text(part, 2000)),
          ))) &&
      (row.related === undefined ||
        (Array.isArray(row.related) &&
          row.related.every(
            (link) => link && text(link.view, 250) && text(link.label, 250),
          )))
    )
  })
}

export function GET(request: Request, context: Context) {
  return localRoute(request, async () => {
    const key = snapshotKey((await context.params).view)
    const { revision, value } = loadSnapshot(key)
    return jsonResponse({ revision, rows: value ?? [] })
  })
}

export function PUT(request: Request, context: Context) {
  return localRoute(request, async () => {
    const key = snapshotKey((await context.params).view)
    const { expectedRevision, rows } = await readJson(request, 4 * 1024 * 1024)
    const expected = revisionNumber(expectedRevision)
    if (!validRows(rows))
      throw new LocalError(422, 'Check the workspace records and try again.')
    return jsonResponse({ revision: saveSnapshot(key, expected, rows) })
  })
}

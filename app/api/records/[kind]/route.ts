import { createRecord, listRecords } from '@/lib/local-db'
import { jsonResponse, localRoute, readJson } from '@/lib/local-http'
import { collection, recordFields } from '@/lib/local-records'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
type Context = { params: Promise<{ kind: string }> }

export function GET(request: Request, context: Context) {
  return localRoute(request, async () => {
    const kind = collection((await context.params).kind)
    return jsonResponse({ records: listRecords(kind) })
  })
}

export function POST(request: Request, context: Context) {
  return localRoute(request, async () => {
    const kind = collection((await context.params).kind)
    const fields = recordFields(kind, await readJson(request, 512 * 1024))
    return jsonResponse({ record: createRecord(kind, fields) }, 201)
  })
}

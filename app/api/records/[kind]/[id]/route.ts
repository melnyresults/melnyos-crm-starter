import { updateRecord, deleteRecord } from '@/lib/local-db'
import {
  jsonResponse,
  localRoute,
  readJson,
  revisionNumber,
} from '@/lib/local-http'
import { collection, recordFields } from '@/lib/local-records'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
type Context = { params: Promise<{ kind: string; id: string }> }

export function PUT(request: Request, context: Context) {
  return localRoute(request, async () => {
    const params = await context.params
    const kind = collection(params.kind)
    const input = await readJson(request, 512 * 1024)
    const fields = recordFields(kind, input)
    const expected = revisionNumber(input.expectedRevision)
    return jsonResponse({
      record: updateRecord(kind, params.id, expected, fields),
    })
  })
}

export function DELETE(request: Request, context: Context) {
  return localRoute(request, async () => {
    const params = await context.params
    const kind = collection(params.kind)
    const input = await readJson(request, 1024)
    deleteRecord(kind, params.id, revisionNumber(input.expectedRevision))
    return jsonResponse({ deleted: true })
  })
}

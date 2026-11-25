import { loadSnapshot, saveSnapshot } from '@/lib/local-db'
import {
  jsonResponse,
  LocalError,
  localRoute,
  readJson,
  revisionNumber,
} from '@/lib/local-http'
import { validReviewState } from '@/lib/melnyos-review/model'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function GET(request: Request) {
  return localRoute(request, () => {
    const { revision, value: state } = loadSnapshot('outreach')
    return jsonResponse({ revision, state })
  })
}

export function PUT(request: Request) {
  return localRoute(request, async () => {
    const { expectedRevision, state } = await readJson(request, 8 * 1024 * 1024)
    const expected = revisionNumber(expectedRevision)
    if (!validReviewState(state))
      throw new LocalError(
        422,
        'Invalid outreach state. Check the business records and try again.',
      )
    return jsonResponse({ revision: saveSnapshot('outreach', expected, state) })
  })
}

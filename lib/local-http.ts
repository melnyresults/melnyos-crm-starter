export class LocalError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new LocalError(400, 'Expected a JSON object.')
  return value as Record<string, unknown>
}

export function revisionNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new LocalError(400, 'A valid expected revision is required.')
  return value
}

function checkLocalRequest(request: Request) {
  const host = request.headers.get('host')?.toLowerCase() ?? ''
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(:[0-9]{1,5})?$/.test(host))
    throw new LocalError(403, 'Use a loopback address to open this CRM.')

  const origin = request.headers.get('origin')
  const localOrigin = new URL(new URL(request.url).protocol + '//' + host)
    .origin
  const readOnly = request.method === 'GET' || request.method === 'HEAD'
  if (
    (origin !== null && origin !== localOrigin) ||
    (!readOnly && !origin) ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new LocalError(
      403,
      'This operation must originate from the local CRM.',
    )
}

export function jsonResponse(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export async function localRoute(
  request: Request,
  run: () => Response | Promise<Response>,
) {
  try {
    checkLocalRequest(request)
    return await run()
  } catch (error) {
    if (error instanceof LocalError)
      return jsonResponse({ error: error.message }, error.status)
    return jsonResponse(
      { error: 'The local database could not complete this operation.' },
      500,
    )
  }
}

export async function readJson(request: Request, limit: number) {
  const mime = request.headers
    .get('content-type')
    ?.split(';')[0]
    .trim()
    .toLowerCase()
  if (mime !== 'application/json')
    throw new LocalError(415, 'Use application/json for this request.')
  if (Number(request.headers.get('content-length')) > limit)
    throw new LocalError(413, 'This request is too large.')
  if (!request.body) throw new LocalError(400, 'A JSON body is required.')

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) {
        await reader.cancel()
        throw new LocalError(413, 'This request is too large.')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  let input: unknown
  try {
    input = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new LocalError(400, 'A valid JSON body is required.')
  }
  return objectValue(input)
}

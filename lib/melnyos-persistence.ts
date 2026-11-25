import { validReviewState, type ReviewState } from './melnyos-review/model'

export class ReviewStateConflictError extends Error {
  constructor() {
    super('A newer revision has already been saved.')
    this.name = 'ReviewStateConflictError'
  }
}

export class ReviewAccessDeniedError extends Error {
  constructor() {
    super('Open the local CRM on its loopback address.')
    this.name = 'ReviewAccessDeniedError'
  }
}

async function responseData(response: Response) {
  if (response.status === 409) throw new ReviewStateConflictError()
  if (response.status === 401 || response.status === 403)
    throw new ReviewAccessDeniedError()
  if (!response.ok)
    throw new Error('Could not reach the local outreach database.')
  return response.json()
}

export async function loadReviewState(): Promise<{
  state: ReviewState | null
  revision: number
}> {
  const result = await responseData(
    await fetch('/api/review', { cache: 'no-store' }),
  )
  if (!Number.isSafeInteger(result?.revision) || result.revision < 0)
    throw new Error('Invalid review revision received.')
  if (result.revision === 0 && result.state === null)
    return { state: null, revision: 0 }
  if (!result.revision || !validReviewState(result.state))
    throw new Error('Unrecognized review data received.')
  return { state: result.state, revision: result.revision }
}

export async function saveReviewState(
  state: ReviewState,
  expectedRevision: number,
): Promise<{ revision: number }> {
  if (!validReviewState(state)) throw new Error('Invalid outreach state.')
  const result = await responseData(
    await fetch('/api/review', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, expectedRevision }),
    }),
  )
  if (result?.revision !== expectedRevision + 1)
    throw new Error('Could not confirm the saved review revision.')
  return { revision: result.revision }
}

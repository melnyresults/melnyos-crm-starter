import { normalizeReviewState, type ReviewState } from './model'

export interface ReviewCache {
  state: ReviewState
  revision: number
  dirty: boolean
}

export function cacheKey(userId: string) {
  return 'melnyos:standalone:outreach:' + userId
}

export function readReviewCache(raw: string | null): ReviewCache | null {
  if (raw === null) return null
  const saved = JSON.parse(raw) as ReviewCache
  const state = normalizeReviewState(saved?.state)
  if (
    !state ||
    !Number.isSafeInteger(saved.revision) ||
    saved.revision < 0 ||
    typeof saved.dirty !== 'boolean'
  ) {
    throw new Error('Unrecognized review cache')
  }
  return {
    state,
    revision: saved.revision,
    dirty: saved.dirty,
  }
}

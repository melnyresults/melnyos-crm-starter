import type { ReviewEvent, ReviewState, SaleStage } from './model'

const stages: readonly string[] = ['Booked', 'Held', 'Won']

/** A transient snapshot of the milestones the operator reviewed for one business. */
export interface SaleCorrection {
  businessId: string
  from: SaleStage
  events: ReviewEvent[]
  remaining: ReviewEvent[]
}

function milestones(state: ReviewState, businessId: string) {
  return state.events.filter(
    (event) =>
      event.businessId === businessId &&
      event.kind === 'sale' &&
      stages.includes(event.title),
  )
}

function sameEvents(actual: ReviewEvent[], expected: ReviewEvent[]) {
  return (
    actual.length === expected.length &&
    actual.every((event, index) => {
      const saved = expected[index]
      if (event === saved) return true
      // Events contain scalar fields. Comparing values also accepts a reloaded
      // JSON object whose keys came back from the database in a different order.
      const fields = Object.keys({
        ...event,
        ...saved,
      }) as (keyof ReviewEvent)[]
      return fields.every((field) => event[field] === saved[field])
    })
  )
}

export function previewSaleCorrection(
  state: ReviewState,
  businessId: string,
  from: SaleStage,
): SaleCorrection | null {
  const cutoff = stages.indexOf(from)
  if (cutoff < 0 || !state.businesses.some((b) => b.id === businessId))
    return null
  const history = milestones(state, businessId)
  const events = history.filter(
    (event) => stages.indexOf(event.title) >= cutoff,
  )
  if (events.length === 0) return null
  return {
    businessId,
    from,
    events,
    remaining: history.filter((event) => stages.indexOf(event.title) < cutoff),
  }
}

export function applySaleCorrection(
  state: ReviewState,
  correction: SaleCorrection,
): ReviewState {
  const current = previewSaleCorrection(
    state,
    correction.businessId,
    correction.from,
  )
  if (
    !current ||
    !sameEvents(current.events, correction.events) ||
    !sameEvents(current.remaining, correction.remaining)
  )
    return state
  // Scope by the current milestone rows themselves. An old import may have
  // reused an identifier on a separate activity or business.
  const removed = new Set(current.events)
  return {
    ...state,
    events: state.events.filter((event) => !removed.has(event)),
  }
}

export function restoreSaleCorrection(
  state: ReviewState,
  correction: SaleCorrection,
): ReviewState {
  if (
    !state.businesses.some((b) => b.id === correction.businessId) ||
    !sameEvents(milestones(state, correction.businessId), correction.remaining)
  )
    return state

  const events = state.events.slice()
  // Merge using original timestamps so a later contact stays ahead of the
  // restored booking, including when the correction is undone on another day.
  for (const event of correction.events.slice().reverse()) {
    const before = events.findIndex(
      (other) => Date.parse(other.at) <= Date.parse(event.at),
    )
    events.splice(before < 0 ? events.length : before, 0, event)
  }
  return { ...state, events }
}

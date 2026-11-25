import { businessTimeZone } from './timezone'

export type Variant = 'A' | 'B'
export type Channel = 'call' | 'email'
export type SaleStage = 'Booked' | 'Held' | 'Won'
export type CallOutcome =
  | 'No answer'
  | 'Voicemail'
  | 'Positive conversation'
  | 'Callback requested'
  | 'Not interested'
  | 'Do not contact'

export interface ScriptArm {
  subject: string
  body: string
}
export interface ScriptPair {
  channel: Channel
  revision: number
  title: string
  arms: Record<Variant, ScriptArm>
}

export function validPairs(value: unknown): boolean {
  if (!Array.isArray(value)) return false
  const last = { call: 0, email: 0 }
  for (const p of value as ScriptPair[]) {
    if (
      !p ||
      (p.channel !== 'call' && p.channel !== 'email') ||
      !Number.isSafeInteger(p.revision) ||
      p.revision <= last[p.channel] ||
      typeof p.title !== 'string' ||
      !p.title.trim() ||
      !p.arms
    )
      return false
    for (const k of ['A', 'B'] as const) {
      if (
        typeof p.arms[k]?.body !== 'string' ||
        !p.arms[k].body.trim() ||
        typeof p.arms[k]?.subject !== 'string' ||
        (p.channel === 'email' && !p.arms[k].subject.trim())
      )
        return false
    }
    last[p.channel] = p.revision
  }
  return true
}

export interface Business {
  id: string
  name: string
  city: string
  industry: string
  branch?: string
  contact: string
  phone: string
  email: string
  source: string
  callVariant?: Variant
  callRevision?: number
  emailRevision?: number
  emailVariant?: Variant
  subject: string
  body: string
  draftVersion: number
  draftUpdatedAt?: string
  nextAction: string
  due: string
  suppressed: boolean
  documents?: { id: string; name: string; url: string }[]
}

export interface ReviewEvent {
  id: string
  businessId: string
  kind: 'call' | 'email' | 'reply' | 'sale' | 'note'
  title: string
  at: string
  date: string
  first?: boolean
  variant?: Variant
  detail?: string
  recipient?: string
  subject?: string
  body?: string
  reviewedBy?: string
}

export interface ApprovedEmail {
  businessId: string
  revision: number
  variant?: Variant
  recipient: string
  subject: string
  body: string
}

export interface Approval {
  id: string
  by: string
  signedAt: string
  date: string
  scheduledFor: string
  messages: ApprovedEmail[]
}

export interface ReviewState {
  version: 2
  scriptPairs: ScriptPair[]
  businesses: Business[]
  events: ReviewEvent[]
  approvals: Approval[]
}

export function validReviewState(input: unknown): input is ReviewState {
  if (!input || typeof input !== 'object') return false
  const doc = input as ReviewState
  if (!Array.isArray(doc.businesses)) return false
  const ids = new Set(doc.businesses.map((b) => b?.id))
  return (
    doc.version === 2 &&
    validPairs(doc.scriptPairs) &&
    ids.size === doc.businesses.length &&
    Array.isArray(doc.events) &&
    Array.isArray(doc.approvals) &&
    doc.businesses.every(
      (b) =>
        b &&
        [
          'id',
          'name',
          'phone',
          'email',
          'contact',
          'city',
          'industry',
          'source',
          'subject',
          'body',
          'nextAction',
          'due',
        ].every((key) => typeof b[key as keyof Business] === 'string') &&
        (['call', 'email'] as const).every((channel) => {
          const variant = b[channel === 'call' ? 'callVariant' : 'emailVariant']
          const revision =
            b[channel === 'call' ? 'callRevision' : 'emailRevision']
          if (variant === undefined && revision === undefined) return true
          return (
            (variant === 'A' || variant === 'B') &&
            doc.scriptPairs.some(
              (p) => p.channel === channel && p.revision === revision,
            )
          )
        }) &&
        typeof b.suppressed === 'boolean' &&
        Number.isSafeInteger(b.draftVersion) &&
        b.draftVersion >= 0 &&
        (b.draftVersion > 0 || (!b.subject && !b.body)),
    ) &&
    doc.businesses.every(
      (b) =>
        b.documents === undefined ||
        (Array.isArray(b.documents) &&
          b.documents.every(
            (d) =>
              d &&
              typeof d.id === 'string' &&
              typeof d.name === 'string' &&
              typeof d.url === 'string' &&
              validDocumentUrl(d.url),
          )),
    ) &&
    doc.events.every(
      (e) =>
        e &&
        typeof e.id === 'string' &&
        typeof e.businessId === 'string' &&
        ['call', 'email', 'reply', 'sale', 'note'].includes(e.kind) &&
        (e.first === undefined || typeof e.first === 'boolean') &&
        typeof e.title === 'string' &&
        ids.has(e.businessId) &&
        typeof e.date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
        !isNaN(Date.parse(e.at)),
    ) &&
    doc.approvals.every(
      (a) =>
        a &&
        typeof a.id === 'string' &&
        typeof a.by === 'string' &&
        typeof a.date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(a.date) &&
        typeof a.scheduledFor === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(a.scheduledFor) &&
        !isNaN(Date.parse(a.signedAt)) &&
        Array.isArray(a.messages) &&
        a.messages.every(
          (m) =>
            m &&
            typeof m.businessId === 'string' &&
            ids.has(m.businessId) &&
            typeof m.recipient === 'string' &&
            Number.isSafeInteger(m.revision) &&
            m.revision > 0 &&
            typeof m.subject === 'string' &&
            typeof m.body === 'string',
        ),
    )
  )
}

export function emptyReview(): ReviewState {
  return {
    version: 2,
    businesses: [],
    events: [],
    approvals: [],
    scriptPairs: [],
  }
}

export function normalizeReviewState(input: unknown): ReviewState | null {
  return validReviewState(input) ? input : null
}

export function validDocumentUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}

export function localDay(value: Date | string = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: businessTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value))
  const valueFor = (name: string) =>
    parts.find((part) => part.type === name)?.value || ''
  return valueFor('year') + '-' + valueFor('month') + '-' + valueFor('day')
}

export function shiftDay(date: string, offset: number) {
  const day = new Date(date + 'T12:00:00Z')
  day.setUTCDate(day.getUTCDate() + offset)
  return day.toISOString().slice(0, 10)
}

export function formatDay(date: string, long = false) {
  return new Intl.DateTimeFormat('en-CA', {
    weekday: long ? 'long' : 'short',
    month: long ? 'long' : 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date + 'T12:00:00Z'))
}

export function callGoal(date: string) {
  const weekday = new Date(date + 'T12:00:00Z').getUTCDay()
  return weekday > 0 && weekday < 6 ? 25 : 0
}

export function findApproval(
  state: ReviewState,
  business: Business,
  date: string,
) {
  return state.approvals.find(
    (approval) =>
      approval.scheduledFor === date &&
      approval.messages.some(
        (message) =>
          message.businessId === business.id &&
          message.revision === business.draftVersion &&
          message.recipient === business.email &&
          message.subject === business.subject &&
          message.body === business.body,
      ),
  )
}

export function touched(state: ReviewState, id: string, channel: Channel) {
  return state.events.some(
    (event) => event.kind === channel && event.businessId === id,
  )
}

export function countTouches(state: ReviewState, type: Channel, day?: string) {
  const firstByBusiness = new Map<string, ReviewEvent>()
  for (const event of state.events) {
    if (event.kind !== type) continue
    const previous = firstByBusiness.get(event.businessId)
    if (!previous || Date.parse(event.at) < Date.parse(previous.at))
      firstByBusiness.set(event.businessId, event)
  }
  return Array.from(firstByBusiness.values()).filter(
    (event) => event.first === true && (!day || localDay(event.at) === day),
  ).length
}

const positiveOutcome = {
  call: 'Positive conversation',
  email: 'Positive email reply',
} as const

export function isPositiveOutcome(event: ReviewEvent, channel?: Channel) {
  if (event.kind === 'call')
    return channel !== 'email' && event.title === positiveOutcome.call
  return (
    event.kind === 'reply' &&
    channel !== 'call' &&
    event.title === positiveOutcome.email
  )
}

function countBusinesses(
  state: ReviewState,
  matches: (event: ReviewEvent) => boolean,
  day?: string,
) {
  const businesses = new Set<string>()
  for (const event of state.events) {
    if (matches(event) && (!day || localDay(event.at) === day))
      businesses.add(event.businessId)
  }
  return businesses.size
}

export function countPositive(
  state: ReviewState,
  channel?: Channel,
  day?: string,
) {
  return countBusinesses(state, (e) => isPositiveOutcome(e, channel), day)
}

export function countSalesStage(
  state: ReviewState,
  stage: SaleStage,
  day?: string,
) {
  return countBusinesses(
    state,
    (e) => e.kind === 'sale' && e.title === stage,
    day,
  )
}

export function hasPositiveReplyOnDay(
  state: ReviewState,
  id: string,
  day: string,
) {
  return state.events.some(
    (e) =>
      e.businessId === id &&
      isPositiveOutcome(e, 'email') &&
      localDay(e.at) === day,
  )
}

export function hasDraft(b: Business) {
  return b.draftVersion > 0 && !!b.subject.trim() && !!b.body.trim()
}

export function writeDraft(
  state: ReviewState,
  id: string,
  subject: string,
  body: string,
): ReviewState {
  const business = state.businesses.find((b) => b.id === id)
  const nextSubject = subject.trim(),
    nextBody = body.trim()
  if (
    !business ||
    !qualifiesForEmail(state, business) ||
    !nextSubject ||
    !nextBody ||
    (business.subject === nextSubject && business.body === nextBody)
  )
    return state
  return {
    ...state,
    businesses: state.businesses.map((b) =>
      b.id === id
        ? {
            ...b,
            subject: nextSubject,
            body: nextBody,
            draftVersion: b.draftVersion + 1,
            draftUpdatedAt: new Date().toISOString(),
          }
        : b,
    ),
  }
}

function emailBlockReason(state: ReviewState, business: Business) {
  if (touched(state, business.id, 'email')) return 'Already emailed'
  if (business.suppressed) return 'Do not contact'
  if (!business.email) return 'Missing email'
  if (
    state.events.some((e) => e.businessId === business.id && e.kind === 'reply')
  )
    return 'Reply received'
  return null
}

export function qualifiesForEmail(state: ReviewState, business: Business) {
  return emailBlockReason(state, business) === null
}

export type DraftStatus =
  | 'Needs review'
  | 'Approved for tomorrow'
  | 'Due today'
  | 'Do not contact'
  | 'Missing email'
  | 'Reply received'

export function savedEmailDrafts(
  state: ReviewState,
  day: string,
): { business: Business; status: DraftStatus }[] {
  const tomorrow = shiftDay(day, 1)
  const drafts = []
  for (const business of state.businesses) {
    if (!hasDraft(business)) continue
    const blocked = emailBlockReason(state, business)
    if (blocked === 'Already emailed') continue

    let status: DraftStatus = blocked ?? 'Needs review'
    if (!blocked && findApproval(state, business, day)) status = 'Due today'
    else if (!blocked && findApproval(state, business, tomorrow))
      status = 'Approved for tomorrow'
    drafts.push({ business, status })
  }
  // Earlier drafts have no edit timestamp. Keep their original relative order.
  const editedAt = (item: Business) =>
    Date.parse(item.draftUpdatedAt ?? '') || 0
  return drafts.sort((a, b) => editedAt(b.business) - editedAt(a.business))
}

export function nextStage(
  state: ReviewState,
  businessId: string,
): SaleStage | null {
  const stages = state.events
    .filter((event) => event.businessId === businessId && event.kind === 'sale')
    .map((event) => event.title)
  if (stages.includes('Won')) return null
  if (stages.includes('Held')) return 'Won'
  return stages.includes('Booked') ? 'Held' : 'Booked'
}

export function addCall(
  state: ReviewState,
  id: string,
  outcome: CallOutcome,
  eventId: string,
  now: Date,
  note: string,
  due: string,
  attempt: 'first' | 'follow-up' = 'first',
) {
  const business = state.businesses.find((item) => item.id === id)
  if (
    !business ||
    !business.phone ||
    business.suppressed ||
    state.events.some((item) => item.id === eventId)
  )
    return state
  const at = now.toISOString()
  const nextAction =
    outcome === 'Callback requested'
      ? 'Return callback'
      : outcome === 'Positive conversation'
        ? 'Arrange a sales call'
        : outcome === 'Do not contact'
          ? 'Suppressed'
          : outcome === 'Not interested'
            ? 'Review later'
            : 'Follow up'
  return {
    ...state,
    businesses: state.businesses.map((item) =>
      item.id === id
        ? { ...item, nextAction, due, suppressed: outcome === 'Do not contact' }
        : item,
    ),
    events: [
      {
        id: eventId,
        kind: 'call' as const,
        businessId: id,
        title: outcome,
        date: localDay(now),
        at,
        first:
          attempt === 'first' &&
          !state.events.some((e) => e.businessId === id && e.kind === 'call'),
        detail: note,
        variant: business.callVariant,
      },
      ...state.events,
    ],
  }
}

export function signBatch(
  state: ReviewState,
  ids: string[],
  userId: string,
  now: Date,
  requestedDate: string,
  inspected?: ApprovedEmail[],
): ReviewState {
  const date = localDay(now)
  const scheduledFor = shiftDay(date, 1)
  if (scheduledFor !== requestedDate) return state
  const messages = state.businesses
    .filter(
      (item) =>
        ids.includes(item.id) &&
        qualifiesForEmail(state, item) &&
        hasDraft(item) &&
        !findApproval(state, item, date) &&
        !findApproval(state, item, scheduledFor),
    )
    .map((item) => ({
      businessId: item.id,
      revision: item.draftVersion,
      recipient: item.email,
      variant: item.emailVariant,
      subject: item.subject,
      body: item.body,
    }))
  if (!messages.length) return state
  if (
    inspected &&
    (inspected.length !== messages.length ||
      inspected.some(
        (m) =>
          !messages.some(
            (fresh) =>
              fresh.businessId === m.businessId &&
              fresh.revision === m.revision &&
              fresh.recipient === m.recipient &&
              fresh.subject === m.subject &&
              fresh.body === m.body &&
              fresh.variant === m.variant,
          ),
      ))
  )
    return state
  return {
    ...state,
    approvals: [
      {
        id: crypto.randomUUID(),
        by: userId,
        signedAt: now.toISOString(),
        date,
        scheduledFor,
        messages,
      },
      ...state.approvals,
    ],
  }
}

export function recordReply(
  state: ReviewState,
  id: string,
  now: Date,
): ReviewState {
  if (
    !touched(state, id, 'email') ||
    hasPositiveReplyOnDay(state, id, localDay(now))
  )
    return state
  return {
    ...state,
    events: [
      {
        id: crypto.randomUUID(),
        kind: 'reply',
        businessId: id,
        title: positiveOutcome.email,
        at: now.toISOString(),
        date: localDay(now),
      },
      ...state.events,
    ],
  }
}

export function recordSale(
  state: ReviewState,
  id: string,
  stage: SaleStage,
  at: Date,
): ReviewState {
  if (
    !state.businesses.some((business) => business.id === id) ||
    nextStage(state, id) !== stage
  )
    return state
  return {
    ...state,
    events: [
      {
        id: crypto.randomUUID(),
        kind: 'sale',
        businessId: id,
        title: stage,
        at: at.toISOString(),
        date: localDay(at),
      },
      ...state.events,
    ],
  }
}

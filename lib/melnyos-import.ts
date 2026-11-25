import type { Business, ReviewState, Variant } from './melnyos-review/model'
import { activePair } from './melnyos-campaign'

export interface ImportBusiness {
  name: string
  city: string
  branch: string
  industry: string
  contact: string
  phone: string
  email: string
  source: string
}
const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
export function dialNumber(phone: string) {
  const text = phone.trim()
  if (!text || !/^\+?[\d().\s-]+$/.test(text)) return ''
  const digits = text.replace(/\D/g, '')
  if (text.startsWith('+'))
    return /^[1-9]\d{6,14}$/.test(digits) ? '+' + digits : ''
  const national = digits.replace(/^1(?=\d{10}$)/, '')
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(national) ? '+1' + national : ''
}
const columns: Record<keyof ImportBusiness, string[]> = {
  name: ['business', 'business name', 'company', 'company name', 'name'],
  city: ['city', 'town', 'municipality'],
  branch: ['branch', 'location', 'address', 'street address'],
  industry: ['industry', 'category', 'type'],
  contact: ['contact', 'contact name', 'person'],
  phone: ['phone', 'phone number', 'telephone'],
  email: ['email', 'email address'],
  source: [
    'source',
    'source url',
    'maps url',
    'google maps url',
    'google maps link',
  ],
}
function csvRows(input: string) {
  const rows: string[][] = []
  let cells: string[] = []
  let value = ''
  let quoted = false
  const csv = input.replace(/^\uFEFF/, '')
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i]
    if (c === '"') {
      if (quoted && csv[i + 1] === '"') {
        value += '"'
        i++
      } else if (quoted || !value) quoted = !quoted
      else value += c
    } else if (c === ',' && !quoted) {
      cells.push(value.trim())
      value = ''
    } else if ((c === '\r' || c === '\n') && !quoted) {
      if (c === '\r' && csv[i + 1] === '\n') i++
      cells.push(value.trim())
      if (cells.some(Boolean)) rows.push(cells)
      cells = []
      value = ''
    } else value += c
  }
  if (quoted) throw Error('A quoted CSV field is missing its closing quote.')
  cells.push(value.trim())
  if (cells.some(Boolean)) rows.push(cells)
  return rows
}
export function parseBusinessCsv(text: string): {
  rows: ImportBusiness[]
  invalid: number
} {
  const [header, ...records] = csvRows(text)
  if (!header) throw Error('The CSV is empty.')
  if (records.length > 1000)
    throw Error('Split lists into files of up to 1,000 businesses.')
  const names = header.map((h) => normalize(h.replace(/[_-]/g, ' ')))
  const indexes = Object.fromEntries(
    Object.entries(columns).map(([key, aliases]) => [
      key,
      names.findIndex((n) => aliases.includes(n)),
    ]),
  ) as Record<keyof ImportBusiness, number>
  if (
    indexes.name < 0 ||
    indexes.city < 0 ||
    (indexes.phone < 0 && indexes.email < 0)
  )
    throw Error(
      'Include business, city and at least one phone or email column.',
    )
  const rows: ImportBusiness[] = []
  let invalid = 0
  for (const cells of records) {
    const get = (name: keyof ImportBusiness) =>
      (cells[indexes[name]] || '').trim()
    const row: ImportBusiness = {
      name: get('name'),
      city: get('city'),
      branch: get('branch'),
      industry: get('industry'),
      contact: get('contact'),
      phone: get('phone'),
      email: get('email'),
      source: get('source') || 'CSV import',
    }
    const invalidEmail =
      row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)
    if (
      !row.name ||
      !row.city ||
      (!row.phone && !row.email) ||
      (row.phone && !dialNumber(row.phone)) ||
      invalidEmail ||
      Object.values(row).some((v) => v.length > 1024)
    ) {
      invalid++
      continue
    }
    rows.push(row)
  }
  return { rows, invalid }
}

type Identity = Pick<ImportBusiness, 'name' | 'city' | 'phone' | 'email'> & {
  branch?: string
}

function branchKey(row: Identity) {
  return JSON.stringify([row.name, row.city, row.branch || ''].map(normalize))
}

function contactKeys(row: Identity) {
  return [
    row.phone && 'phone:' + dialNumber(row.phone),
    row.email && 'email:' + normalize(row.email),
  ].filter(Boolean)
}

function clearlyDifferentBranch(left: Identity, right: Identity) {
  return (
    Boolean(left.branch?.trim() && right.branch?.trim()) &&
    normalize(left.name) === normalize(right.name) &&
    (normalize(left.city) !== normalize(right.city) ||
      normalize(left.branch!) !== normalize(right.branch!))
  )
}

export function filterNewBusinesses(
  existing: Business[],
  rows: ImportBusiness[],
) {
  const identities = new Set<string>()
  const contacts = new Map<string, Identity[]>()
  function remember(row: Identity) {
    identities.add(branchKey(row))
    for (const key of contactKeys(row)) {
      const matches = contacts.get(key) || []
      matches.push(row)
      contacts.set(key, matches)
    }
  }
  existing.forEach(remember)
  const fresh = rows.filter((row) => {
    if (identities.has(branchKey(row))) return false
    // A central office can serve several explicitly identified branches of the same business.
    // Ambiguous matches, including an older record without a branch, stay deduplicated.
    const ambiguous = contactKeys(row).some((key) =>
      contacts.get(key)?.some((other) => !clearlyDifferentBranch(row, other)),
    )
    if (ambiguous) return false
    remember(row)
    return true
  })
  return { fresh, duplicates: rows.length - fresh.length }
}

export function updateBusinessDetails(
  state: ReviewState,
  businessId: string,
  details: Omit<ImportBusiness, 'source'>,
): ReviewState {
  const current = state.businesses.find(
    (business) => business.id === businessId,
  )
  if (!current) return state
  const otherBusinesses = state.businesses.filter(
    (business) => business.id !== businessId,
  )
  const candidate = { ...details, source: current.source }
  if (filterNewBusinesses(otherBusinesses, [candidate]).duplicates) return state
  const changed = (Object.keys(details) as (keyof typeof details)[]).some(
    (key) => details[key] !== (current[key] ?? ''),
  )
  if (!changed) return state
  const updated = {
    ...current,
    ...details,
    draftVersion:
      current.draftVersion +
      (current.draftVersion > 0 && details.email !== current.email ? 1 : 0),
  }
  return {
    ...state,
    businesses: state.businesses.map((business) =>
      business.id === businessId ? updated : business,
    ),
  }
}

export function importBusinesses(
  state: ReviewState,
  rows: ImportBusiness[],
  today: string,
): ReviewState {
  const { fresh } = filterNewBusinesses(state.businesses, rows)
  if (!fresh.length) return state
  const call = activePair(state, 'call'),
    email = activePair(state, 'email')
  const imported = fresh.map((row) => {
    const draws = crypto.getRandomValues(new Uint8Array(2))
    const callVariant: Variant = draws[0] % 2 ? 'A' : 'B'
    const emailVariant: Variant = draws[1] % 2 ? 'A' : 'B'
    return {
      ...row,
      id: crypto.randomUUID(),
      ...(call && row.phone
        ? { callVariant, callRevision: call.revision }
        : {}),
      ...(email && row.email
        ? { emailVariant, emailRevision: email.revision }
        : {}),
      subject: '',
      body: '',
      draftVersion: 0,
      suppressed: false,
      nextAction: 'First outreach',
      due: today,
    }
  })
  return { ...state, businesses: [...imported, ...state.businesses] }
}

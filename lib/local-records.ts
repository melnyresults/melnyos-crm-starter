import { LocalError } from './local-http'

export type RecordKind = 'finance' | 'submissions' | 'blog' | 'events'

export function collection(value: string): RecordKind {
  if (
    value === 'finance' ||
    value === 'submissions' ||
    value === 'blog' ||
    value === 'events'
  )
    return value
  throw new LocalError(404, 'Unknown collection.')
}

type Fields = Record<string, unknown>
function textField(
  fields: Fields,
  key: string,
  limit: number,
  required = false,
) {
  const value = fields[key] ?? ''
  if (
    typeof value !== 'string' ||
    value.length > limit ||
    (required && !value.trim())
  )
    throw new LocalError(
      422,
      'Enter a valid ' + key + ' (up to ' + limit + ' characters).',
    )
  return value.trim()
}

function dateField(fields: Fields) {
  const date = textField(fields, 'date', 10, true)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    throw new LocalError(422, 'Enter a valid calendar date.')
  return date
}

export function recordFields(kind: RecordKind, fields: Fields) {
  switch (kind) {
    case 'finance': {
      const { type, amountCents } = fields
      if (type !== 'income' && type !== 'expense')
        throw new LocalError(422, 'Choose income or expense.')
      if (
        typeof amountCents !== 'number' ||
        !Number.isSafeInteger(amountCents) ||
        amountCents < 1 ||
        amountCents > 99999999999999
      )
        throw new LocalError(422, 'Enter a positive amount in whole cents.')
      return {
        type,
        amountCents,
        date: dateField(fields),
        description: textField(fields, 'description', 4000, true),
      }
    }
    case 'submissions': {
      const email = textField(fields, 'email', 254)
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new LocalError(422, 'Enter a valid email address.')
      return {
        name: textField(fields, 'name', 200, true),
        email,
        source: textField(fields, 'source', 300),
        message: textField(fields, 'message', 16000),
      }
    }
    case 'blog': {
      const status = fields.status
      if (status !== 'draft' && status !== 'ready')
        throw new LocalError(422, 'Choose draft or ready.')
      return {
        title: textField(fields, 'title', 300, true),
        body: textField(fields, 'body', 100000),
        status,
      }
    }
    case 'events':
      return {
        title: textField(fields, 'title', 300, true),
        date: dateField(fields),
        description: textField(fields, 'description', 16000),
      }
  }
}

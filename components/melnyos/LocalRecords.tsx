'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Plus, RefreshCw } from 'lucide-react'
import { Modal } from './outreach/Shared'
import common from './outreach/Outreach.module.css'
import styles from './LocalRecords.module.css'

type Kind = 'finance' | 'submissions' | 'blog' | 'events'
type Row = {
  id: string
  revision: number
  createdAt: string
  updatedAt: string
  [key: string]: string | number
}

type Field = {
  name: string
  label: string
  kind?: 'date' | 'amount' | 'email' | 'long'
  choices?: readonly string[]
  required?: boolean
}

type Collection = {
  heading: string
  singular: string
  plural: string
  primary: string
  fields: Field[]
}

const collections: Record<Kind, Collection> = {
  finance: {
    heading: 'Finances',
    singular: 'transaction',
    plural: 'transactions',
    primary: 'description',
    fields: [
      { name: 'description', label: 'Description', required: true },
      { name: 'date', label: 'Date', kind: 'date', required: true },
      { name: 'type', label: 'Type', choices: ['income', 'expense'] },
      {
        name: 'amountCents',
        label: 'Amount (CAD)',
        kind: 'amount',
        required: true,
      },
    ],
  },
  submissions: {
    heading: 'Form submissions',
    singular: 'submission',
    plural: 'submissions',
    primary: 'name',
    fields: [
      { name: 'name', label: 'Contact name', required: true },
      { name: 'email', label: 'Email', kind: 'email' },
      { name: 'source', label: 'Form or source' },
      { name: 'message', label: 'Message', kind: 'long' },
    ],
  },
  blog: {
    heading: 'Blog',
    singular: 'post',
    plural: 'posts',
    primary: 'title',
    fields: [
      { name: 'title', label: 'Title', required: true },
      { name: 'body', label: 'Body', kind: 'long' },
      {
        name: 'status',
        label: 'Editorial status',
        choices: ['draft', 'ready'],
      },
    ],
  },
  events: {
    heading: 'Events',
    singular: 'event',
    plural: 'events',
    primary: 'title',
    fields: [
      { name: 'title', label: 'Title', required: true },
      { name: 'date', label: 'Event date', kind: 'date', required: true },
      { name: 'description', label: 'Details', kind: 'long' },
    ],
  },
}

const money = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
})
const displayAmount = (cents: number) => money.format(cents / 100)

function initialValue(field: Field, existing?: Row) {
  if (existing) {
    const value = existing[field.name]
    return field.kind === 'amount'
      ? (Number(value) / 100).toFixed(2)
      : String(value ?? '')
  }
  if (field.choices) return field.choices[0]
  if (field.kind === 'date') {
    const today = new Date()
    return [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-')
  }
  return ''
}

function detailLine(kind: Kind, row: Row) {
  switch (kind) {
    case 'finance':
      return [row.date, row.type, displayAmount(Number(row.amountCents))]
    case 'submissions':
      return [row.email, row.source]
    case 'events':
      return [row.date]
    case 'blog':
      return [row.status === 'ready' ? 'Ready' : 'Draft']
  }
}

function failure(error: unknown) {
  return error instanceof TypeError
    ? 'Could not reach the local CRM. Check that it is running.'
    : error instanceof Error
      ? error.message
      : 'Could not load the record.'
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, { cache: 'no-store', ...init })
  const payload = await response.json()
  if (!response.ok)
    throw new Error(
      payload.error || 'The local CRM could not complete the request.',
    )
  return payload
}

function CollectionPanel({ kind, title }: { kind: Kind; title: string }) {
  const definition = collections[kind]
  const endpoint = '/api/records/' + kind
  const [rows, setRows] = useState<Row[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [editor, edit] = useState<{ row?: Row } | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirming, confirm] = useState(false)
  const inFlight = useRef(false)
  const loadSequence = useRef(0)
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current
    setLoadError('')
    try {
      const payload = await request(endpoint)
      if (sequence === loadSequence.current) setRows(payload.records)
    } catch (error) {
      if (sequence === loadSequence.current) setLoadError(failure(error))
    }
  }, [endpoint])
  useEffect(() => {
    void load()
    return () => {
      loadSequence.current++
    }
  }, [load])

  function open(row?: Row) {
    setValues(
      Object.fromEntries(
        definition.fields.map((field) => [
          field.name,
          initialValue(field, row),
        ]),
      ),
    )
    setFormError('')
    confirm(false)
    edit({ row })
  }
  function close() {
    if (!inFlight.current) edit(null)
  }
  async function mutate(remove: boolean) {
    if (!editor || inFlight.current || (remove && !editor.row)) return
    const original = editor.row
    const data: Record<string, string | number> = {}
    if (original) data.expectedRevision = original.revision
    if (!remove) {
      for (const field of definition.fields) {
        const value = values[field.name].trim()
        if (field.required && !value) {
          setFormError('Enter a value for ' + field.label.toLowerCase() + '.')
          return
        }
        if (field.kind === 'amount') {
          const [whole, fraction = ''] = value.split('.')
          const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
          if (
            !/^\d+(\.\d{1,2})?$/.test(value) ||
            !Number.isSafeInteger(cents) ||
            cents <= 0
          ) {
            setFormError(
              'Enter a positive amount with up to two decimal places.',
            )
            return
          }
          data[field.name] = cents
        } else data[field.name] = value
      }
    }
    inFlight.current = true
    setSaving(true)
    setFormError('')
    try {
      const result = await request(
        original ? endpoint + '/' + original.id : endpoint,
        {
          method: remove ? 'DELETE' : original ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
      )
      loadSequence.current++
      setRows((previous) => {
        const others = (previous ?? []).filter((row) => row.id !== original?.id)
        return remove ? others : [result.record, ...others]
      })
      edit(null)
      void load()
    } catch (error) {
      setFormError(failure(error))
      void load()
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void mutate(false)
  }
  const term = query.trim().toLowerCase()
  const filtered = (rows ?? []).filter((row) =>
    [row[definition.primary], ...detailLine(kind, row)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(term),
  )
  let income = 0
  let expenses = 0
  if (kind === 'finance') {
    for (const row of rows ?? []) {
      if (row.type === 'income') income += Number(row.amountCents)
      else expenses += Number(row.amountCents)
    }
  }
  return (
    <section className={common.root}>
      <div className={common.pageTitle}>
        <h1>{title}</h1>
        <button
          type="button"
          className={common.primary}
          disabled={!rows}
          onClick={() => open()}
        >
          <Plus size={16} /> Add {definition.singular}
        </button>
      </div>
      {kind === 'finance' && rows && (
        <div
          className={styles.totals}
          aria-label="All-time totals in Canadian dollars"
        >
          {[
            ['Income', income],
            ['Expenses', expenses],
            ['Net', income - expenses],
          ].map(([label, cents]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{displayAmount(Number(cents))}</strong>
            </div>
          ))}
        </div>
      )}
      <div className={common.panel}>
        <div className={styles.toolbar}>
          <label>
            <span className={common.sr}>Search {definition.plural}</span>
            <input
              type="search"
              placeholder={'Search ' + definition.plural}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className={common.secondary}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
        {loadError && (
          <p role="alert" className={styles.notice}>
            {loadError}
          </p>
        )}
        {!rows && !loadError && (
          <p role="status" className={styles.notice}>
            Loading {definition.plural}…
          </p>
        )}
        {rows && !filtered.length && (
          <p className={styles.notice}>
            {term
              ? 'No matching records.'
              : 'No ' + definition.plural + ' yet.'}
          </p>
        )}
        {filtered.map((row) => (
          <button
            type="button"
            key={row.id}
            className={styles.row}
            onClick={() => open(row)}
          >
            <span>
              <strong>{row[definition.primary]}</strong>
              <small>{detailLine(kind, row).filter(Boolean).join(' · ')}</small>
            </span>
            <ArrowRight aria-hidden="true" size={16} />
          </button>
        ))}
      </div>
      {editor && (
        <Modal
          title={(editor.row ? 'Edit ' : 'Add ') + definition.singular}
          close={close}
        >
          <form onSubmit={submit} className={common.form}>
            <fieldset className={styles.fields} disabled={saving}>
              {definition.fields.map((field) => {
                const props = {
                  id: 'local-record-' + field.name,
                  name: field.name,
                  required: field.required,
                  value: values[field.name],
                  onChange: (
                    e: React.ChangeEvent<
                      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
                    >,
                  ) =>
                    setValues((current) => ({
                      ...current,
                      [field.name]: e.target.value,
                    })),
                }
                return (
                  <div key={field.name} className={styles.field}>
                    <label htmlFor={props.id}>{field.label}</label>
                    {field.choices ? (
                      <select {...props}>
                        {field.choices.map((value) => (
                          <option key={value} value={value}>
                            {value[0].toUpperCase() + value.slice(1)}
                          </option>
                        ))}
                      </select>
                    ) : field.kind === 'long' ? (
                      <textarea {...props} rows={kind === 'blog' ? 10 : 4} />
                    ) : (
                      <input
                        {...props}
                        type={
                          field.kind === 'amount'
                            ? 'text'
                            : (field.kind ?? 'text')
                        }
                        inputMode={
                          field.kind === 'amount' ? 'decimal' : undefined
                        }
                      />
                    )}
                  </div>
                )
              })}
            </fieldset>
            {formError && (
              <p role="alert" className={common.error}>
                {formError}
              </p>
            )}
            {confirming ? (
              <div className={styles.confirm}>
                <p>Remove this {definition.singular}?</p>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={common.secondary}
                    disabled={saving}
                    onClick={() => confirm(false)}
                  >
                    Keep {definition.singular}
                  </button>
                  <button
                    type="button"
                    className={styles.danger}
                    disabled={saving}
                    onClick={() => void mutate(true)}
                  >
                    Confirm removal
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.actions}>
                <button
                  type="submit"
                  className={common.primary}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save ' + definition.singular}
                </button>
                <button
                  type="button"
                  className={common.secondary}
                  disabled={saving}
                  onClick={close}
                >
                  Cancel
                </button>
                {editor.row && (
                  <button
                    type="button"
                    className={styles.danger}
                    disabled={saving}
                    onClick={() => confirm(true)}
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </form>
        </Modal>
      )}
    </section>
  )
}

export default function LocalRecords({ view }: { view: string }) {
  const kinds: Record<string, Kind> = {
    finances: 'finance',
    revenue: 'finance',
    submissions: 'submissions',
    blog: 'blog',
    events: 'events',
  }
  const kind = kinds[view]
  if (!kind) return null
  return (
    <CollectionPanel
      key={view}
      kind={kind}
      title={
        view === 'revenue' ? 'Revenue overview' : collections[kind].heading
      }
    />
  )
}

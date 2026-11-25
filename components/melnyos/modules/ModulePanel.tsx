'use client'
import { useState, useEffect, useRef } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { savedEmailDrafts } from '@/lib/melnyos-review/model'
import type { useReview } from '../outreach/useReview'
import { modules } from './catalog'
import type { ModuleDefinition, ModuleRecord } from './types'
import { Modal } from '../outreach/Shared'
import styles from './ModulePanel.module.css'

type Props = {
  view: string
  userId: string
  onNavigate: (view: string) => void
  outreachInbox?: Pick<ReturnType<typeof useReview>, 'state' | 'status'> & {
    day: string
    openDraft: (businessId: string) => void
  }
}
export default function ModulePanel(props: Props) {
  const definition = modules[props.view]
  return definition ? (
    <Review
      key={props.userId + props.view}
      {...props}
      definition={definition}
    />
  ) : (
    <p>View unavailable.</p>
  )
}
function Review({
  view,
  onNavigate,
  outreachInbox,
  definition: m,
}: Props & { definition: ModuleDefinition }) {
  const endpoint = '/api/modules/' + encodeURIComponent(view)
  const revision = useRef(0)
  const writing = useRef(false)
  const [saving, setSaving] = useState(false)
  const [reload, refresh] = useState(0)
  const [rows, setRows] = useState<ModuleRecord[]>([])
  const [current, select] = useState<string | null>(null)
  const [loaded, ready] = useState(false)
  const [note, setNote] = useState('')
  const [name, setName] = useState('')
  const [creating, create] = useState(false)
  const [query, search] = useState('')
  const [error, showError] = useState('')
  const row = rows.find((r) => r.id === current)
  useEffect(() => {
    const controller = new AbortController()
    ready(false)
    async function load() {
      try {
        const response = await fetch(endpoint, {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) throw new Error()
        const data = await response.json()
        if (!Array.isArray(data.rows) || !Number.isSafeInteger(data.revision))
          throw new Error()
        if (controller.signal.aborted) return
        revision.current = data.revision
        setRows(data.rows)
        showError('')
        ready(true)
      } catch {
        if (!controller.signal.aborted)
          showError('Could not load these records from the local server.')
      }
    }
    void load()
    return () => controller.abort()
  }, [endpoint, reload])
  async function save(updated: ModuleRecord[]) {
    if (!loaded || writing.current) return false
    writing.current = true
    setSaving(true)
    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: updated,
          expectedRevision: revision.current,
        }),
      })
      if (response.status === 409) {
        ready(false)
        showError(
          'Another window saved a change. Reload these records and review your edit.',
        )
        return false
      }
      if (!response.ok) throw new Error()
      const result = await response.json()
      if (result.revision !== revision.current + 1) throw new Error()
      revision.current = result.revision
      setRows(updated)
      showError('')
      return true
    } catch {
      showError(
        'Could not save the change. Check the local server and try again.',
      )
      return false
    } finally {
      writing.current = false
      setSaving(false)
    }
  }
  function revise(delta: Partial<ModuleRecord>) {
    return row
      ? save(rows.map((r) => (r.id === row.id ? { ...r, ...delta } : r)))
      : false
  }
  const term = query.trim().toLowerCase()
  const list = rows.filter((r) =>
    (r.title + ' ' + r.status + ' ' + r.category).toLowerCase().includes(term),
  )
  const draftState =
    outreachInbox?.status === 'unavailable' ||
    outreachInbox?.status === 'loading'
      ? null
      : outreachInbox?.state
  const drafts =
    outreachInbox && draftState
      ? savedEmailDrafts(draftState, outreachInbox.day).filter(
          ({ business, status }) =>
            [business.subject, business.name, business.email, 'Draft', status]
              .join(' ')
              .toLowerCase()
              .includes(term),
        )
      : []
  const empty =
    loaded && (!outreachInbox || draftState) && !drafts.length && !list.length
  const errorNotice = error && (
    <p role="alert">
      {error}{' '}
      <button type="button" onClick={() => refresh((n) => n + 1)}>
        Reload records
      </button>
    </p>
  )
  return (
    <section className={styles.page}>
      <header className={styles.lead}>
        <div>
          <h1>{m.title}</h1>
          <p>{m.summary}</p>
        </div>
        {m.createLabel && (
          <button disabled={!loaded || saving} onClick={() => create(true)}>
            {m.createLabel}
          </button>
        )}
      </header>
      <div className={styles.source}>{m.source}</div>
      {!creating && !row && errorNotice}
      <div className={styles.panel}>
        <div className={styles.tools}>
          <h2>{m.collection}</h2>
          <input
            aria-label={'Find ' + m.collection.toLowerCase()}
            placeholder="Search records"
            value={query}
            onChange={(e) => search(e.target.value)}
          />
        </div>
        {outreachInbox &&
          drafts.map(({ business, status }) => (
            <button
              key={business.id}
              type="button"
              className={styles.row}
              onClick={() => outreachInbox.openDraft(business.id)}
            >
              <span>
                <strong>{business.subject}</strong>
                <small>
                  {business.name}
                  {business.email && ' · ' + business.email}
                </small>
              </span>
              <span>Draft · {status}</span>
              <ArrowRight aria-hidden="true" size={15} />
            </button>
          ))}
        {loaded &&
          list.map((r) => (
            <button
              key={r.id}
              className={styles.row}
              onClick={() => {
                select(r.id)
                setNote('')
              }}
            >
              <span>
                <strong>{r.title}</strong>
                <small>{r.category}</small>
              </span>
              <span>{r.status}</span>
              <ArrowRight size={15} />
            </button>
          ))}
        {((!error && !loaded) || outreachInbox?.status === 'loading') && (
          <p className={styles.empty} role="status">
            Loading records…
          </p>
        )}
        {empty && (
          <p className={styles.empty}>
            {query.trim() ? 'No matching records.' : 'No records here yet.'}
          </p>
        )}
      </div>
      <div className={styles.links}>
        {m.linked && (
          <button onClick={() => onNavigate(m.linked!.view)}>
            {m.linked.label}
            <ArrowRight size={14} />
          </button>
        )}
      </div>
      {row && (
        <Modal title={row.title} close={() => select(null)}>
          <div className={styles.detail}>
            {errorNotice}
            <p>{row.description}</p>
            <dl>
              <dt>Status</dt>
              <dd>{row.status}</dd>
              {row.facts?.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {row.excerpt && <p>{row.excerpt}</p>}
            {m.actions
              ?.filter((a) => a.from.includes(row.status))
              .map((a) => (
                <button
                  key={a.label}
                  disabled={!loaded || saving}
                  onClick={() => revise({ status: a.status })}
                >
                  <Check size={15} />
                  {a.label}
                </button>
              ))}
            {row.related?.map((link) => (
              <button key={link.view} onClick={() => onNavigate(link.view)}>
                {link.label}
                <ArrowRight size={13} />
              </button>
            ))}
            {row.notes?.map((n, i) => (
              <p key={i}>{n}</p>
            ))}
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const body = note.trim()
                if (
                  body &&
                  (await revise({ notes: [...(row.notes || []), body] }))
                )
                  setNote('')
              }}
            >
              <label>
                {m.noteLabel || 'Review note'}
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <button disabled={!loaded || saving || !note.trim()}>
                Save note
              </button>
            </form>
          </div>
        </Modal>
      )}
      {creating && (
        <Modal
          title={m.createLabel || 'New record'}
          close={() => create(false)}
        >
          <form
            className={styles.detail}
            onSubmit={async (e) => {
              e.preventDefault()
              const title = name.trim()
              if (!title) return
              const id = crypto.randomUUID()
              const saved = await save([
                {
                  id,
                  title,
                  category: m.singular,
                  status: 'Draft',
                  description: '',
                },
                ...rows,
              ])
              if (!saved) return
              create(false)
              setName('')
              select(id)
            }}
          >
            {errorNotice}
            <label>
              Name
              <input
                required
                maxLength={160}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button disabled={!loaded || saving || !name.trim()}>Create</button>
          </form>
        </Modal>
      )}
    </section>
  )
}

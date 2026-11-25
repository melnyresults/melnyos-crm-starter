'use client'

import { businessTimeZone } from '@/lib/melnyos-review/timezone'

import { useState } from 'react'
import type { ReviewEvent } from '@/lib/melnyos-review/model'
import type { Context } from './Shared'
import s from './Outreach.module.css'
import styles from './CallHistory.module.css'

const callTime = new Intl.DateTimeFormat('en-CA', {
  timeZone: businessTimeZone,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
})

function CallEntry({ call, ctx }: { call: ReviewEvent; ctx: Context }) {
  const [editor, setEditor] = useState<{
    original: string
    text: string
  } | null>(null)
  const [error, setError] = useState('')
  const note = typeof call.detail === 'string' ? call.detail : ''

  function save(event: React.FormEvent) {
    event.preventDefault()
    if (!editor) return
    const text = editor.text.trim()
    if (text === editor.original.trim()) return
    const saved = ctx.update((state) => {
      const index = state.events.findIndex(
        (entry) =>
          entry.id === call.id &&
          entry.kind === 'call' &&
          entry.businessId === call.businessId,
      )
      if (index < 0 || (state.events[index].detail ?? '') !== editor.original)
        return state
      const events = [...state.events]
      events[index] = { ...events[index], detail: text }
      return { ...state, events }
    })
    if (!saved) {
      setError(
        'Could not save this note. Reopen it to check the latest version.',
      )
      return
    }
    setEditor(null)
    ctx.notify('Call note updated.')
  }

  return (
    <li className={styles.entry}>
      <header className={styles.head}>
        <div>
          <h4>{call.title}</h4>
          <time dateTime={call.at}>{callTime.format(new Date(call.at))}</time>
        </div>
        {!editor && (
          <button
            type="button"
            className={s.textButton}
            onClick={() => {
              setError('')
              setEditor({ original: note, text: note })
            }}
          >
            {note.trim() ? 'Edit note' : 'Add note'}
          </button>
        )}
      </header>
      {editor ? (
        <form className={s.form} onSubmit={save}>
          <label>
            Saved call note
            <textarea
              autoFocus
              rows={3}
              maxLength={1200}
              value={editor.text}
              onChange={(event) =>
                setEditor({ ...editor, text: event.target.value })
              }
            />
          </label>
          {error && (
            <p role="alert" className={s.error}>
              {error}
            </p>
          )}
          <div className={s.actions}>
            <button
              className={s.secondary}
              type="submit"
              disabled={editor.text.trim() === editor.original.trim()}
            >
              Save note
            </button>
            <button
              className={s.textButton}
              type="button"
              onClick={() => setEditor(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className={note.trim() ? styles.note : styles.empty}>
          {note.trim() ? note : 'No note recorded.'}
        </p>
      )}
    </li>
  )
}

export default function CallHistory({
  ctx,
  businessId,
}: {
  ctx: Context
  businessId: string
}) {
  const [expanded, setExpanded] = useState(false)
  const calls = ctx.state.events
    .filter((event) => event.kind === 'call' && event.businessId === businessId)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  if (!calls.length) return null
  const recentNotes = calls
    .filter((call) => typeof call.detail === 'string' && call.detail.trim())
    .slice(0, 3)
  const visible = expanded
    ? calls
    : calls.filter((call, index) => index < 3 || recentNotes.includes(call))
  return (
    <section className={styles.history} aria-label="Previous calls">
      <h3 className={s.minorTitle}>Previous calls</h3>
      <ol className={styles.entries}>
        {visible.map((call) => (
          <CallEntry key={call.id} call={call} ctx={ctx} />
        ))}
      </ol>
      {visible.length < calls.length && (
        <button
          className={s.textButton}
          type="button"
          onClick={() => setExpanded(true)}
        >
          Show all {calls.length} calls
        </button>
      )}
    </section>
  )
}

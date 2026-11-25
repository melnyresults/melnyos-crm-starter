'use client'

import { useState } from 'react'
import { CalendarPlus, Mail, Phone, Save } from 'lucide-react'
import {
  Business,
  CallOutcome,
  addCall,
  formatDay,
  hasDraft,
  hasPositiveReplyOnDay,
  localDay,
  qualifiesForEmail,
  writeDraft,
  nextStage,
  recordReply,
  recordSale,
  touched,
} from '@/lib/melnyos-review/model'
import { callScript } from '@/lib/melnyos-campaign'
import {
  dialNumber,
  importBusinesses,
  updateBusinessDetails,
} from '@/lib/melnyos-import'
import Documents from './Documents'
import CallHistory from './CallHistory'
import { Context, Modal } from './Shared'
import s from './Outreach.module.css'

const outcomes: CallOutcome[] = [
  'Positive conversation',
  'Callback requested',
  'Voicemail',
  'No answer',
  'Not interested',
  'Do not contact',
]
const blank = {
  name: '',
  city: '',
  branch: '',
  industry: '',
  contact: '',
  phone: '',
  email: '',
}

export function NewBusiness({
  ctx,
  close,
  item,
}: {
  ctx: Context
  close: () => void
  item?: Business
}) {
  const [form, setForm] = useState(() =>
    item
      ? {
          name: item.name,
          city: item.city,
          branch: item.branch ?? '',
          industry: item.industry,
          contact: item.contact,
          phone: item.phone,
          email: item.email,
        }
      : blank,
  )
  const [error, setError] = useState('')
  const labels = {
    name: 'Business name',
    city: 'City',
    branch: 'Branch or street address (optional)',
    industry: 'Industry',
    contact: 'Contact name',
    phone: 'Business phone',
    email: 'Business email',
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v.trim()]),
    ) as typeof form
    if (!data.name || !data.city) {
      setError('Enter a business name and city.')
      return
    }
    if (!data.phone && !data.email) {
      setError('Add a telephone number or an email address.')
      return
    }
    if (data.phone && !dialNumber(data.phone)) {
      setError(
        'Enter a North American phone number or include the international country code with +.',
      )
      return
    }
    if (data.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
      setError('Enter a valid business email address.')
      return
    }
    let added = ''
    const saved = ctx.update((state) => {
      if (item) return updateBusinessDetails(state, item.id, data)
      const next = importBusinesses(
        state,
        [{ ...data, source: 'Manual entry' }],
        ctx.day,
      )
      if (next !== state) added = next.businesses[0].id
      return next
    })
    if (!saved || (!item && !added)) {
      setError(
        'This business matches an existing record, or the workspace is unavailable for edits.',
      )
      return
    }
    close()
    if (item) {
      ctx.notify(
        data.email !== item.email
          ? 'Recipient changed. Review the addressed draft again.'
          : 'Business details saved.',
      )
      return
    }
    ctx.notify('Business added.')
    ctx.openBusiness(added)
  }
  return (
    <Modal title={item ? 'Edit business' : 'Add business'} close={close}>
      <form className={s.form} onSubmit={submit}>
        <p className={s.explain}>
          Add a business name, city and at least one contact channel. Select a
          specific branch when the business has multiple locations.
        </p>
        <div className={s.formGrid}>
          {(Object.keys(form) as (keyof typeof form)[]).map((key) => (
            <label key={key}>
              {labels[key]}
              <input
                required={key === 'name' || key === 'city'}
                autoComplete="off"
                type={
                  key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'
                }
                maxLength={125}
                value={form[key]}
                placeholder={
                  key === 'phone'
                    ? '+1 905-555-0145'
                    : key === 'email'
                      ? 'hello@company.example'
                      : undefined
                }
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
        </div>
        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
        <button
          type="submit"
          className={s.primary}
          disabled={
            !!item &&
            (Object.keys(form) as (keyof typeof form)[]).every(
              (key) => form[key].trim() === (item[key] ?? ''),
            )
          }
        >
          {item ? 'Save business details' : 'Create business'}
        </button>
      </form>
    </Modal>
  )
}

export function CallForm({
  ctx,
  item,
  close,
}: {
  ctx: Context
  item: Business
  close: () => void
}) {
  const prior = touched(ctx.state, item.id, 'call')
  const [followUp, setFollowUp] = useState(prior)
  const script = callScript(ctx.state, item)
  const [started, setStarted] = useState(false)
  const [outcome, setOutcome] = useState<CallOutcome | null>(null)
  const [note, setNote] = useState('')
  const [due, setDue] = useState('')
  const [attemptId] = useState(() => crypto.randomUUID())
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!outcome || !started) return
    if (
      ctx.update((state) =>
        addCall(
          state,
          item.id,
          outcome,
          attemptId,
          new Date(),
          note.trim(),
          due,
          followUp ? 'follow-up' : 'first',
        ),
      )
    ) {
      ctx.notify('Call outcome recorded.')
      close()
    }
  }
  return (
    <Modal title={item.name} close={close}>
      <CallHistory ctx={ctx} businessId={item.id} />
      <form className={s.form} onSubmit={submit}>
        <div className={s.subline}>
          {item.contact} · {item.city} ·{' '}
          {followUp ? 'Follow-up call' : 'First cold call'}
        </div>
        <div className={s.actions}>
          {!item.suppressed && item.phone && (
            <a
              className={s.phoneAction}
              href={'tel:' + dialNumber(item.phone)}
              onClick={() => setStarted(true)}
              aria-label={'Open phone dialer for ' + item.phone}
            >
              <Phone size={18} />
              {item.phone}
              <small>Open phone dialer</small>
            </a>
          )}
          <button
            type="button"
            className={s.secondary}
            disabled={item.suppressed || !item.phone || started}
            onClick={() => setStarted(true)}
          >
            {started ? 'Ready to log' : 'Log an attempt manually'}
          </button>
        </div>
        <p className={s.explain}>
          Opening the dialer does not count a call. Record the outcome after
          your attempt.
        </p>
        {!prior && (
          <label>
            Attempt type
            <select
              value={followUp ? 'follow-up' : 'first'}
              onChange={(e) => setFollowUp(e.target.value === 'follow-up')}
            >
              <option value="first">First cold call</option>
              <option value="follow-up">Follow-up on earlier contact</option>
            </select>
          </label>
        )}
        {script && (
          <div className={s.script}>
            <span className={s.variant}>{item.callVariant}</span> Phone script
            <p>{script}</p>
          </div>
        )}
        <fieldset className={s.fieldset} disabled={!started || item.suppressed}>
          <legend>Call outcome</legend>
          <div className={s.choices}>
            {outcomes.map((o) => (
              <button
                key={o}
                type="button"
                aria-pressed={outcome === o}
                className={outcome === o ? s.choiceOn : s.choice}
                onClick={() => setOutcome(o)}
              >
                {o}
              </button>
            ))}
          </div>
        </fieldset>
        <label>
          Call notes
          <textarea
            rows={2}
            maxLength={1200}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <label>
          {outcome === 'Callback requested'
            ? 'Callback date'
            : 'Next action date (optional)'}
          <input
            type="date"
            required={outcome === 'Callback requested'}
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
        <button
          className={s.primary}
          disabled={!started || !outcome || item.suppressed}
        >
          Log call outcome
        </button>
      </form>
    </Modal>
  )
}

export function EmailEditor({
  ctx,
  item,
  close,
  onSaved,
}: {
  ctx: Context
  item: Business
  close: () => void
  onSaved: () => void
}) {
  const canEdit = qualifiesForEmail(ctx.state, item)
  const [error, setError] = useState('')
  const [original] = useState(() => ({
    revision: item.draftVersion,
    email: item.email,
  }))
  const [subject, setSubject] = useState(item.subject)
  const [body, setBody] = useState(item.body)
  return (
    <Modal
      title={hasDraft(item) ? 'Review email draft' : 'Write email draft'}
      close={close}
    >
      <form
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault()
          if (!canEdit || !subject.trim() || !body.trim()) return
          const saved = ctx.update((state) => {
            const current = state.businesses.find((b) => b.id === item.id)
            if (
              current?.draftVersion !== original.revision ||
              current.email !== original.email
            )
              return state
            return writeDraft(state, item.id, subject, body)
          })
          if (saved) onSaved()
          else
            setError(
              'Could not save this draft. Check the sync status and reopen it to review the latest copy.',
            )
        }}
      >
        <p className={s.subline}>
          {item.name}
          {item.emailVariant && (
            <>
              {' '}
              · Email variant{' '}
              <span className={s.variant}>{item.emailVariant}</span>
            </>
          )}
        </p>
        <div className={s.linePair}>
          <span>To</span>
          <strong>{item.email || 'No recipient address'}</strong>
        </div>
        <label>
          Subject
          <input
            readOnly={!canEdit}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={250}
            required
          />
        </label>
        <label>
          Message
          <textarea
            readOnly={!canEdit}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={9}
            maxLength={5000}
            required
          />
        </label>
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        {canEdit ? (
          <button
            className={s.primary}
            disabled={
              !subject.trim() ||
              !body.trim() ||
              (subject.trim() === item.subject && body.trim() === item.body)
            }
          >
            <Save size={15} />{' '}
            {hasDraft(item) ? 'Save revised draft' : 'Save draft'}
          </button>
        ) : (
          <p className={s.explain}>
            This draft is read-only while this business is ineligible for cold
            email.
          </p>
        )}
      </form>
    </Modal>
  )
}

export function Details({
  ctx,
  item,
  close,
}: {
  ctx: Context
  item: Business
  close: () => void
}) {
  const [next, setNext] = useState(item.nextAction)
  const [due, setDue] = useState(item.due)
  const [editing, setEditing] = useState(false)
  const stage = nextStage(ctx.state, item.id)
  const timeline = ctx.state.events
    .filter((e) => e.businessId === item.id)
    .sort((a, b) => b.at.localeCompare(a.at))
  const hasEmail = touched(ctx.state, item.id, 'email')
  if (editing)
    return <NewBusiness ctx={ctx} item={item} close={() => setEditing(false)} />
  return (
    <Modal title={item.name} close={close}>
      <div className={s.stack}>
        <div className={s.subline}>
          {[item.city, item.industry].filter(Boolean).join(' · ')}
        </div>
        <CallHistory ctx={ctx} businessId={item.id} />
        <div className={s.fieldList}>
          {[
            ['Contact', item.contact],
            ['Branch', item.branch || '—'],
            ['Phone', item.phone],
            ['Email', item.email],
            ['Source', item.source],
            [
              'Call / email variants',
              (item.callVariant ?? 'Unassigned') +
                ' / ' +
                (item.emailVariant ?? 'Unassigned'),
            ],
          ].map(([k, v]) => (
            <div className={s.linePair} key={k}>
              <span>{k}</span>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
        <div className={s.actions}>
          <button className={s.secondary} onClick={() => setEditing(true)}>
            Edit business details
          </button>
          <button
            className={s.secondary}
            disabled={item.suppressed || !item.phone}
            onClick={() => ctx.openBusiness(item.id, 'call')}
          >
            <Phone size={14} /> Review call
          </button>
          <button
            className={s.secondary}
            disabled={!hasDraft(item) && !qualifiesForEmail(ctx.state, item)}
            onClick={() => ctx.openBusiness(item.id, 'email')}
          >
            <Mail size={14} />{' '}
            {hasDraft(item) ? 'Review email draft' : 'Write email draft'}
          </button>
          {stage && (
            <button
              className={s.secondary}
              onClick={() => {
                if (
                  ctx.update((state) =>
                    recordSale(state, item.id, stage, new Date()),
                  )
                )
                  ctx.notify('Sales stage recorded: ' + stage)
              }}
            >
              <CalendarPlus size={14} />
              {stage === 'Booked'
                ? 'Log booked call'
                : stage === 'Held'
                  ? 'Log held call'
                  : 'Mark deal won'}
            </button>
          )}
          {stage !== 'Booked' && (
            <button
              type="button"
              className={s.secondary}
              aria-label={'Manage sales stage for ' + item.name}
              onClick={() => ctx.openBusiness(item.id, 'sales')}
            >
              Manage stage
            </button>
          )}
          {hasEmail && (
            <button
              className={s.secondary}
              disabled={hasPositiveReplyOnDay(ctx.state, item.id, ctx.day)}
              onClick={() => {
                if (
                  ctx.update((state) => recordReply(state, item.id, new Date()))
                )
                  ctx.notify('Positive reply recorded.')
              }}
            >
              Log positive email reply
            </button>
          )}
        </div>
        <form
          className={s.form}
          onSubmit={(e) => {
            e.preventDefault()
            if (
              ctx.update((state) => ({
                ...state,
                businesses: state.businesses.map((b) =>
                  b.id === item.id ? { ...b, nextAction: next.trim(), due } : b,
                ),
              }))
            )
              ctx.notify('Next action saved.')
          }}
        >
          <div className={s.formGrid}>
            <label>
              Next action
              <input
                value={next}
                required
                maxLength={160}
                onChange={(e) => setNext(e.target.value)}
              />
            </label>
            <label>
              Due date
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </label>
          </div>
          <button
            className={s.secondary}
            disabled={
              !next.trim() || (next === item.nextAction && due === item.due)
            }
          >
            Save next action
          </button>
        </form>
        <Documents ctx={ctx} item={item} />
        <div>
          <h3 className={s.minorTitle}>Activity timeline</h3>
          {!timeline.length && (
            <p className={s.explain}>No contact activity recorded.</p>
          )}
          {timeline.map((e) => (
            <div key={e.id} className={s.timeline}>
              <span className={s.dot} />
              <div>
                <b>{e.title}</b>
                <small>
                  {formatDay(localDay(e.at))}
                  {e.variant ? ' · Variant ' + e.variant : ''}
                  {e.first ? ' · First touch' : ''}
                </small>
                {e.kind !== 'call' && e.detail && <p>{e.detail}</p>}
                {e.body && (
                  <details className={s.receipt}>
                    <summary>View sent message</summary>
                    <p>{e.recipient}</p>
                    <b>{e.subject}</b>
                    <pre>{e.body}</pre>
                    {e.reviewedBy && <small>Reviewed by {e.reviewedBy}</small>}
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
        {item.suppressed ? (
          <p className={s.error}>Do not contact</p>
        ) : (
          <button
            className={s.textButton}
            onClick={() => {
              if (
                ctx.update((state) => ({
                  ...state,
                  businesses: state.businesses.map((b) =>
                    b.id === item.id
                      ? { ...b, suppressed: true, nextAction: 'Suppressed' }
                      : b,
                  ),
                  events: [
                    {
                      id: crypto.randomUUID(),
                      kind: 'note',
                      businessId: item.id,
                      title: 'Do not contact',
                      date: ctx.day,
                      at: new Date().toISOString(),
                    },
                    ...state.events,
                  ],
                }))
              )
                ctx.notify('Business suppressed across both channels.')
            }}
          >
            Mark do not contact
          </button>
        )}
      </div>
    </Modal>
  )
}

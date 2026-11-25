'use client'

import { timeZoneLabel } from '@/lib/melnyos-review/timezone'

import ImportBusinesses from '../ImportBusinesses'

import { useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronRight,
  Phone,
  Plus,
  Search,
} from 'lucide-react'
import { Context, BusinessLabel, Empty, Modal, PageTitle, Stat } from './Shared'
import type { ApprovedEmail } from '@/lib/melnyos-review/model'
import {
  findApproval,
  countPositive,
  countSalesStage,
  localDay,
  formatDay,
  nextStage,
  qualifiesForEmail,
  savedEmailDrafts,
  shiftDay,
  signBatch,
  hasDraft,
  touched,
} from '@/lib/melnyos-review/model'
import s from './Outreach.module.css'

function SearchBox({
  value,
  set,
  placeholder = 'Search businesses or cities',
}: {
  value: string
  set: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className={s.search}>
      <Search size={16} />
      <input
        type="search"
        aria-label="Search businesses"
        placeholder={placeholder}
        value={value}
        onChange={(e) => set(e.target.value)}
      />
    </label>
  )
}

export function BusinessQueue({
  ctx,
  mode,
}: {
  ctx: Context
  mode: 'calls' | 'leads' | 'sales'
}) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('All')
  const [limit, setLimit] = useState(15)
  const filters =
    mode === 'calls'
      ? ['All', 'First calls', 'Callbacks', 'Follow-ups']
      : mode === 'sales'
        ? ['All', 'Booked', 'Held', 'Won']
        : ['All', 'Active', 'Suppressed']
  const stage = (id: string) =>
    ({ Booked: 'Prospect', Held: 'Booked', Won: 'Held', done: 'Won' })[
      nextStage(ctx.state, id) || 'done'
    ]
  const businesses = ctx.state.businesses.filter((b) => {
    if (
      !(b.name + ' ' + b.contact + ' ' + b.city + ' ' + b.industry)
        .toLowerCase()
        .includes(q.toLowerCase())
    )
      return false
    if (mode === 'sales')
      return (
        stage(b.id) !== 'Prospect' &&
        (filter === 'All' || stage(b.id) === filter)
      )
    if (mode === 'calls')
      return (
        !!b.phone &&
        !b.suppressed &&
        (filter === 'First calls'
          ? !touched(ctx.state, b.id, 'call')
          : filter === 'Callbacks'
            ? b.nextAction === 'Return callback'
            : filter === 'Follow-ups'
              ? touched(ctx.state, b.id, 'call')
              : true)
      )
    return (
      filter === 'All' ||
      (filter === 'Suppressed' ? b.suppressed : !b.suppressed)
    )
  })
  const title =
    mode === 'calls'
      ? 'Call queue'
      : mode === 'sales'
        ? 'Sales pipeline'
        : 'Businesses'
  return (
    <>
      <PageTitle
        title={title}
        date={
          mode === 'calls'
            ? 'First calls, callbacks and follow-ups'
            : mode === 'sales'
              ? 'Booked meetings, held calls and closed deals'
              : 'Businesses and contact history'
        }
        actions={
          <>
            {mode !== 'sales' && <ImportBusinesses ctx={ctx} />}
            <button className={s.primary} onClick={ctx.addBusiness}>
              <Plus size={15} /> Add business
            </button>
          </>
        }
      />
      {mode === 'sales' && (
        <div className={s.stats}>
          {(['Booked', 'Held', 'Won'] as const).map((v) => (
            <Stat
              key={v}
              label={v === 'Won' ? 'Deals won' : 'Meetings ' + v.toLowerCase()}
              value={countSalesStage(ctx.state, v)}
            />
          ))}
        </div>
      )}
      <section className={s.panel}>
        <div className={s.toolbar}>
          <div className={s.filters}>
            {filters.map((f) => (
              <button
                key={f}
                aria-pressed={filter === f}
                className={filter === f ? s.filterOn : s.filter}
                onClick={() => {
                  setFilter(f)
                  setLimit(15)
                }}
              >
                {f}
              </button>
            ))}
          </div>
          <SearchBox value={q} set={setQ} />
        </div>
        <div className={s.tableScroll}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Business</th>
                <th>{mode === 'sales' ? 'Sales stage' : 'Contact'}</th>
                <th>{mode === 'calls' ? 'Phone script' : 'Next action'}</th>
                <th>
                  <span className={s.sr}>Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {businesses.slice(0, limit).map((b) => (
                <tr key={b.id}>
                  <td>
                    <button
                      className={s.linkCell}
                      onClick={() => ctx.openBusiness(b.id)}
                    >
                      <BusinessLabel item={b} />
                    </button>
                  </td>
                  <td>
                    {mode === 'sales' ? (
                      <span className={s.tag}>{stage(b.id)}</span>
                    ) : (
                      b.contact
                    )}
                  </td>
                  <td>
                    {mode === 'calls' ? (
                      <span className={s.variant}>
                        {b.callVariant ?? 'Unassigned'}
                      </span>
                    ) : (
                      b.nextAction
                    )}
                  </td>
                  <td className={s.alignRight}>
                    {mode === 'calls' ? (
                      <button
                        className={s.secondary}
                        onClick={() => ctx.openBusiness(b.id, 'call')}
                      >
                        <Phone size={14} />
                        <span>Review call</span>
                      </button>
                    ) : mode === 'sales' ? (
                      <button
                        type="button"
                        className={s.secondary}
                        aria-label={'Manage sales stage for ' + b.name}
                        onClick={() => ctx.openBusiness(b.id, 'sales')}
                      >
                        Manage stage
                      </button>
                    ) : (
                      <button
                        className={s.iconBtn}
                        aria-label={'Open ' + b.name}
                        onClick={() => ctx.openBusiness(b.id)}
                      >
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!businesses.length && <Empty>No matching businesses.</Empty>}
        <div className={s.listFooter}>
          <small>
            {Math.min(limit, businesses.length)} of {businesses.length}{' '}
            businesses
          </small>
          {limit < businesses.length && (
            <button
              className={s.textButton}
              onClick={() => setLimit(limit + 15)}
            >
              Show more <ChevronRight size={14} />
            </button>
          )}
        </div>
      </section>
    </>
  )
}

export function EmailQueue({
  ctx,
  initialBusinessId,
}: {
  ctx: Context
  initialBusinessId?: string
}) {
  const drafts = savedEmailDrafts(ctx.state, ctx.day)
  const [tab, setTab] = useState(drafts.length ? 'Drafts' : 'Email-ready')
  const [selection, setSelection] = useState<string[]>([])
  const [review, setReview] = useState<{
    date: string
    messages: ApprovedEmail[]
  } | null>(null)
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(12)
  const tomorrow = shiftDay(ctx.day, 1)
  const { state } = ctx
  const approvedTomorrow = state.businesses.filter(
    (b) => qualifiesForEmail(state, b) && findApproval(state, b, tomorrow),
  )
  const due = state.businesses.filter(
    (b) => qualifiesForEmail(state, b) && findApproval(state, b, ctx.day),
  )
  const ready = state.businesses.filter(
    (b) => qualifiesForEmail(state, b) && !hasDraft(b),
  )
  const reviewable = drafts.filter(({ status }) => status === 'Needs review')
  const selected = reviewable
    .map(({ business }) => business)
    .filter((b) => selection.includes(b.id))
  const matches = (name: string) =>
    name.toLowerCase().includes(q.trim().toLowerCase())
  const options = drafts.filter(({ business }) =>
    matches([business.name, business.email, business.subject].join(' ')),
  )
  if (initialBusinessId) {
    const first = options.findIndex(
      ({ business }) => business.id === initialBusinessId,
    )
    if (first > 0) options.unshift(...options.splice(first, 1))
  }
  const readyMatches = ready.filter((b) => matches(b.name + ' ' + b.email))
  const toggle = (id: string) =>
    setSelection((list) =>
      list.includes(id) ? list.filter((v) => v !== id) : [...list, id],
    )
  const approve = () => {
    if (!review) return
    if (
      ctx.update((doc) =>
        signBatch(
          doc,
          review.messages.map((b) => b.businessId),
          ctx.userId,
          new Date(),
          review.date,
          review.messages,
        ),
      )
    ) {
      setReview(null)
      setSelection([])
      ctx.notify('Review signed for ' + formatDay(tomorrow) + '.')
      setTab('Approvals')
    } else {
      setReview(null)
      ctx.notify('Batch changed. Review the available drafts again.')
    }
  }
  return (
    <>
      <PageTitle
        title="Email review"
        date={
          'Next batch · ' +
          formatDay(tomorrow, true) +
          ' · ' +
          timeZoneLabel +
          ' · Delivery disconnected'
        }
      />
      <div className={s.stats}>
        <Stat label="Email-ready" value={ready.length} sub="Awaiting a draft" />
        <Stat label="Drafts to review" value={reviewable.length} />
        <Stat
          label="Approved for tomorrow"
          value={approvedTomorrow.length}
          sub="Daily target · 25"
        />
        <Stat label="Due today" value={due.length} sub="Approved yesterday" />
        <Stat label="Positive replies" value={countPositive(state, 'email')} />
      </div>
      <section className={s.panel}>
        <div className={s.toolbar}>
          <div className={s.filters}>
            {['Email-ready', 'Drafts', 'Approvals', 'Activity'].map((t) => (
              <button
                key={t}
                className={t === tab ? s.filterOn : s.filter}
                aria-pressed={t === tab}
                onClick={() => {
                  setTab(t)
                  setQ('')
                  setLimit(12)
                }}
              >
                {t}
              </button>
            ))}
          </div>
          {(tab === 'Email-ready' || tab === 'Drafts') && (
            <SearchBox
              value={q}
              set={setQ}
              placeholder={
                tab === 'Drafts'
                  ? 'Search business, email or subject'
                  : 'Search business or email'
              }
            />
          )}
        </div>
        {tab === 'Email-ready' && (
          <div className={s.sectionBody}>
            {readyMatches.slice(0, limit).map((b) => (
              <div className={s.inlineRow} key={b.id}>
                <BusinessLabel item={b} />
                <small>{b.email}</small>
                <button
                  className={s.secondary}
                  onClick={() => ctx.openBusiness(b.id, 'email')}
                >
                  Write draft
                </button>
              </div>
            ))}
            {!readyMatches.length && (
              <Empty>No businesses awaiting an email draft.</Empty>
            )}
            {limit < readyMatches.length && (
              <button
                className={s.textButton}
                onClick={() => setLimit(limit + 12)}
              >
                Show more
              </button>
            )}
          </div>
        )}
        {tab === 'Drafts' && (
          <>
            <div className={s.batchTools}>
              <button
                className={s.textButton}
                onClick={() =>
                  setSelection(
                    options
                      .filter(({ status }) => status === 'Needs review')
                      .slice(0, Math.max(0, 25 - approvedTomorrow.length))
                      .map(({ business }) => business.id),
                  )
                }
              >
                Select daily target
              </button>
              {selected.length > 0 && (
                <button
                  className={s.textButton}
                  onClick={() => setSelection([])}
                >
                  Clear
                </button>
              )}
              <button
                className={s.primary}
                disabled={!selected.length}
                onClick={() =>
                  setReview({
                    date: tomorrow,
                    messages: selected.map((b) => ({
                      businessId: b.id,
                      revision: b.draftVersion,
                      variant: b.emailVariant,
                      recipient: b.email,
                      subject: b.subject,
                      body: b.body,
                    })),
                  })
                }
              >
                Review {selected.length || ''} selected <ArrowRight size={14} />
              </button>
            </div>
            <div className={s.tableScroll}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>
                      <span className={s.sr}>Select</span>
                    </th>
                    <th>Business</th>
                    <th>Variant</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>
                      <span className={s.sr}>Draft</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {options.slice(0, limit).map(({ business: b, status }) => (
                    <tr key={b.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={'Select ' + b.name}
                          disabled={status !== 'Needs review'}
                          checked={
                            status === 'Needs review' &&
                            selection.includes(b.id)
                          }
                          onChange={() => toggle(b.id)}
                        />
                      </td>
                      <td>
                        <BusinessLabel item={b} />
                      </td>
                      <td>
                        <span className={s.variant}>
                          {b.emailVariant ?? 'Unassigned'}
                        </span>
                      </td>
                      <td>{b.subject}</td>
                      <td>{status}</td>
                      <td>
                        <button
                          className={s.textButton}
                          onClick={() => ctx.openBusiness(b.id, 'email')}
                        >
                          {qualifiesForEmail(state, b) ? 'Edit' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!options.length && <Empty>No drafts match this view.</Empty>}
            <div className={s.listFooter}>
              <small>
                {Math.min(options.length, limit)} of {options.length} drafts
              </small>
              {limit < options.length && (
                <button
                  className={s.textButton}
                  onClick={() => setLimit(limit + 15)}
                >
                  Show more
                </button>
              )}
            </div>
          </>
        )}
        {tab === 'Approvals' && (
          <div className={s.sectionBody}>
            {due.length > 0 && (
              <>
                <h3 className={s.minorTitle}>Due today</h3>
                {due.map((b) => (
                  <div className={s.inlineRow} key={b.id}>
                    <BusinessLabel item={b} />
                    <small>Awaiting sender connection</small>
                  </div>
                ))}
              </>
            )}
            <h3 className={s.minorTitle}>Signed review receipts</h3>
            {state.approvals.map((a) => (
              <details className={s.receipt} key={a.id}>
                <summary>
                  {formatDay(a.scheduledFor)} · {a.messages.length}{' '}
                  {a.messages.length === 1 ? 'message' : 'messages'}
                </summary>
                <p>
                  Reviewed {formatDay(a.date)} ·{' '}
                  {a.by === ctx.userId ? 'You' : a.by}
                </p>
                {a.messages.map((m) => {
                  const b = state.businesses.find(
                    (item) => item.id === m.businessId,
                  )
                  const current =
                    b && !b.suppressed && b.draftVersion === m.revision
                  return (
                    <details className={s.receipt} key={m.businessId}>
                      <summary>
                        {m.recipient} ·{' '}
                        {current
                          ? 'Reviewed revision'
                          : 'Superseded or suppressed'}
                      </summary>
                      <small>
                        {m.variant ? 'Variant ' + m.variant + ' · ' : ''}
                        Revision {m.revision}
                      </small>
                      <b>{m.subject}</b>
                      <pre>{m.body}</pre>
                    </details>
                  )
                })}
              </details>
            ))}
            {!state.approvals.length && <Empty>No signed reviews.</Empty>}
          </div>
        )}
        {tab === 'Activity' && (
          <div className={s.sectionBody}>
            {!state.events.some(
              (e) => e.kind === 'email' || e.kind === 'reply',
            ) && <Empty>No email activity recorded.</Empty>}
            {state.events
              .filter((e) => e.kind === 'email' || e.kind === 'reply')
              .map((e) => (
                <details className={s.receipt} key={e.id}>
                  <summary>
                    {state.businesses.find((b) => b.id === e.businessId)?.name}{' '}
                    · {e.title}
                  </summary>
                  <p>
                    {formatDay(localDay(e.at))} ·{' '}
                    {e.recipient || 'Review event'}
                  </p>
                  {e.subject && <b>{e.subject}</b>}
                  {e.body && <pre>{e.body}</pre>}
                  {e.reviewedBy && (
                    <small>
                      Approved by{' '}
                      {e.reviewedBy === ctx.userId ? 'you' : e.reviewedBy}
                    </small>
                  )}
                </details>
              ))}
          </div>
        )}
      </section>
      {review && (
        <Modal title="Approve tomorrow’s batch" close={() => setReview(null)}>
          <p className={s.explain}>
            {review.messages.length} exact{' '}
            {review.messages.length === 1 ? 'draft' : 'drafts'} for{' '}
            {formatDay(review.date, true)} in {timeZoneLabel}. This approval
            records a signed copy for tomorrow. Email delivery is disconnected.
          </p>
          <div className={s.approvalList}>
            {review.messages.map((b) => (
              <details key={b.businessId} className={s.receipt}>
                <summary>
                  {
                    state.businesses.find((item) => item.id === b.businessId)
                      ?.name
                  }{' '}
                  {b.variant ? '· variant ' + b.variant : ''}
                </summary>
                <p>
                  {b.recipient} · revision {b.revision}
                </p>
                <b>{b.subject}</b>
                <pre>{b.body}</pre>
              </details>
            ))}
          </div>
          <button
            className={s.primary}
            disabled={!selected.length}
            onClick={approve}
          >
            <Check size={16} /> Sign review for {formatDay(review.date)}
          </button>
        </Modal>
      )}
    </>
  )
}

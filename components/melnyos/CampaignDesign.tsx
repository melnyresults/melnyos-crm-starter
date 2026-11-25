'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { activePair, assignedRevision, listPairs } from '@/lib/melnyos-campaign'
import {
  isPositiveOutcome,
  type Channel,
  type ScriptPair,
  type Variant,
} from '@/lib/melnyos-review/model'
import type { Context } from './outreach/Shared'
import { Modal } from './outreach/Shared'
import s from './CampaignDesign.module.css'

function ChannelTest({ channel, ctx }: { channel: Channel; ctx: Context }) {
  const pairs = listPairs(ctx.state, channel)
  const active = activePair(ctx.state, channel)
  const [revision, select] = useState<number | null>(null)
  const [editor, setEditor] = useState<ScriptPair | null>(null)
  const [message, setMessage] = useState('')
  const pair = pairs.find((p) => p.revision === revision) || active
  const caption = channel === 'call' ? 'Phone' : 'Email'
  const eventsByBusiness = new Map<string, typeof ctx.state.events>()
  for (const event of ctx.state.events) {
    const history = eventsByBusiness.get(event.businessId)
    if (history) history.push(event)
    else eventsByBusiness.set(event.businessId, [event])
  }
  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!editor) return
    const arms = editor.arms
    if (
      !editor.title.trim() ||
      !arms.A.body.trim() ||
      !arms.B.body.trim() ||
      (channel === 'email' &&
        (!arms.A.subject.trim() || !arms.B.subject.trim()))
    ) {
      setMessage('Give this test a name and fill in both variants.')
      return
    }
    if (
      arms.A.subject.trim() === arms.B.subject.trim() &&
      arms.A.body.trim() === arms.B.body.trim()
    ) {
      setMessage('Use different copy in the two variants.')
      return
    }
    if (
      ctx.update((state) => ({
        ...state,
        scriptPairs: [
          ...(state.scriptPairs ?? []),
          {
            ...editor,
            title: editor.title.trim(),
            revision: (activePair(state, channel)?.revision ?? 0) + 1,
          },
        ],
      }))
    ) {
      select(null)
      setEditor(null)
      ctx.notify(caption + ' test saved for new businesses.')
    }
  }
  return (
    <section className={s.card}>
      <div className={s.head}>
        <div>
          <h2>{caption} experiments</h2>
          <p>{pair?.title ?? 'No experiment created.'}</p>
        </div>
        <div className={s.tools}>
          {pair && (
            <select
              aria-label={caption + ' test version'}
              value={pair.revision}
              onChange={(e) => select(Number(e.target.value))}
            >
              {pairs.map((p) => (
                <option key={p.revision} value={p.revision}>
                  v{p.revision}
                  {p.revision === active?.revision ? ' · active' : ''}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => {
              setMessage('')
              setEditor({
                channel,
                revision: (active?.revision ?? 0) + 1,
                title: '',
                arms: {
                  A: { subject: '', body: '' },
                  B: { subject: '', body: '' },
                },
              })
            }}
          >
            <Plus size={14} />
            New test
          </button>
        </div>
      </div>
      {pair && (
        <>
          <div className={s.scripts}>
            {(['A', 'B'] as const).map((k) => (
              <details key={k}>
                <summary>
                  Variant {k} ·{' '}
                  {channel === 'call' ? 'call script' : 'email copy'}
                </summary>
                {pair.arms[k].subject && (
                  <strong>{pair.arms[k].subject}</strong>
                )}
                <p>{pair.arms[k].body}</p>
              </details>
            ))}
          </div>
          <div className={s.scroll}>
            <table>
              <caption>Outcomes by assigned business</caption>
              <thead>
                <tr>
                  {[
                    'Arm',
                    'Assigned',
                    'Contacted',
                    'Positive',
                    'Booked',
                    'Held',
                    'Won',
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(['A', 'B'] as const).map((k) => {
                  const cohort = ctx.state.businesses.filter(
                    (b) =>
                      assignedRevision(b, channel) === pair.revision &&
                      (channel === 'call' ? b.callVariant : b.emailVariant) ===
                        k,
                  )
                  const count = (
                    kind: 'contacted' | 'positive' | 'Booked' | 'Held' | 'Won',
                  ) =>
                    cohort.filter((b) => {
                      const history = eventsByBusiness.get(b.id) || []
                      const first = history
                        .filter((e) => e.kind === channel)
                        .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0]
                      if (!first?.first) return false
                      return (
                        kind === 'contacted' ||
                        history.some(
                          (e) =>
                            Date.parse(e.at) >= Date.parse(first.at) &&
                            (kind === 'positive'
                              ? isPositiveOutcome(e, channel)
                              : e.kind === 'sale' && e.title === kind),
                        )
                      )
                    }).length
                  return (
                    <tr key={k}>
                      <th>{k}</th>
                      <td>{cohort.length}</td>
                      {(
                        [
                          'contacted',
                          'positive',
                          'Booked',
                          'Held',
                          'Won',
                        ] as const
                      ).map((col) => {
                        const n = count(col)
                        return (
                          <td key={col}>
                            {n}
                            {col !== 'contacted' && cohort.length > 0 && (
                              <small>
                                {Math.round((100 * n) / cohort.length)}%
                              </small>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className={s.help}>
            Rates use assigned businesses. A meeting after both channels may
            appear in both test reports. Sales totals count it once.
          </p>
        </>
      )}
      {editor && (
        <Modal
          title={'New ' + caption.toLowerCase() + ' A/B test'}
          close={() => setEditor(null)}
        >
          <form className={s.form} onSubmit={save}>
            <p>
              New businesses enter this version. Earlier assignments keep their
              original assignments.{' '}
              {channel === 'email'
                ? 'Email drafts are written separately for each business.'
                : 'Use {{business}} for the business name.'}
            </p>
            <label>
              Test name
              <input
                required
                maxLength={100}
                value={editor.title}
                onChange={(e) =>
                  setEditor({ ...editor, title: e.target.value })
                }
              />
            </label>
            {(['A', 'B'] as Variant[]).map((k) => (
              <fieldset key={k}>
                <legend>Variant {k}</legend>
                {channel === 'email' && (
                  <label>
                    Subject
                    <input
                      required
                      maxLength={220}
                      value={editor.arms[k].subject}
                      onChange={(e) =>
                        setEditor({
                          ...editor,
                          arms: {
                            ...editor.arms,
                            [k]: { ...editor.arms[k], subject: e.target.value },
                          },
                        })
                      }
                    />
                  </label>
                )}
                <label>
                  {channel === 'call' ? 'Script' : 'Email body'}
                  <textarea
                    required
                    rows={4}
                    maxLength={5000}
                    value={editor.arms[k].body}
                    onChange={(e) =>
                      setEditor({
                        ...editor,
                        arms: {
                          ...editor.arms,
                          [k]: { ...editor.arms[k], body: e.target.value },
                        },
                      })
                    }
                  />
                </label>
              </fieldset>
            ))}
            {message && <p role="alert">{message}</p>}
            <button className={s.save}>Activate test for new businesses</button>
          </form>
        </Modal>
      )}
    </section>
  )
}
export default function CampaignDesign({ ctx }: { ctx: Context }) {
  return (
    <>
      {(['call', 'email'] as const).map((channel) => (
        <ChannelTest key={channel} channel={channel} ctx={ctx} />
      ))}
    </>
  )
}

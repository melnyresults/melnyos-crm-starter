'use client'

import { timeZoneLabel } from '@/lib/melnyos-review/timezone'

import CampaignDesign from '../CampaignDesign'

import {
  ArrowRight,
  CalendarCheck2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  ChevronRight,
} from 'lucide-react'
import {
  callGoal,
  countTouches,
  countPositive,
  countSalesStage,
  findApproval,
  hasDraft,
  formatDay,
  qualifiesForEmail,
  shiftDay,
  touched,
} from '@/lib/melnyos-review/model'
import type { Channel } from '@/lib/melnyos-review/model'
import {
  BusinessLabel,
  Context,
  PageTitle,
  PanelHead,
  Stat,
  Empty,
} from './Shared'
import s from './Outreach.module.css'

function ActivityChart({ ctx }: { ctx: Context }) {
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(ctx.day, i - 6))
  const values = days.map((day) => ({
    day,
    call: countTouches(ctx.state, 'call', day),
    email: countTouches(ctx.state, 'email', day),
  }))
  const max = Math.max(...values.map((v) => Math.max(v.call, v.email)), 5)
  const total = values.reduce((a, v) => a + v.call + v.email, 0)
  return (
    <section className={s.panel}>
      <PanelHead title="Outreach activity" />
      <div className={s.chartHead}>
        <div>
          <b>{total}</b>
          <span> first touches · last 7 days</span>
        </div>
        <div className={s.legend}>
          <i />
          Calls <i />
          Emails
        </div>
      </div>
      {total === 0 ? (
        <Empty>No first calls or emails recorded in the last seven days.</Empty>
      ) : (
        <div className={s.chart}>
          {values.map((v) => (
            <div
              key={v.day}
              className={s.dayBar}
              aria-label={
                formatDay(v.day) +
                ', ' +
                v.call +
                ' first calls, ' +
                v.email +
                ' first emails'
              }
              title={
                formatDay(v.day) +
                ': ' +
                v.call +
                ' calls, ' +
                v.email +
                ' emails'
              }
            >
              <div className={s.bars}>
                <i style={{ height: (v.call / max) * 100 + '%' }} />
                <i style={{ height: (v.email / max) * 100 + '%' }} />
              </div>
              <span>
                {v.day === ctx.day ? 'Today' : formatDay(v.day).split(',')[0]}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function Today({ ctx }: { ctx: Context }) {
  const { state, day } = ctx
  const tomorrow = shiftDay(day, 1)
  const next = state.businesses.filter(
    (b) => b.phone && !b.suppressed && !touched(state, b.id, 'call'),
  )
  const eligible = state.businesses.filter((b) => qualifiesForEmail(state, b))
  const drafted = eligible.filter(hasDraft)
  const signed = drafted.filter((b) => findApproval(state, b, tomorrow)).length
  const due = state.businesses.filter(
    (b) =>
      b.nextAction === 'Return callback' &&
      b.due &&
      b.due <= day &&
      !b.suppressed,
  )
  const stats = (channel: Channel) => countTouches(state, channel, day)
  const positive = countPositive(state, undefined, day)
  const booked = countSalesStage(state, 'Booked', day)
  return (
    <>
      <PageTitle
        title="Today"
        date={formatDay(day, true) + ' · ' + timeZoneLabel}
        actions={
          <button type="button" className={s.primary} onClick={ctx.addBusiness}>
            <Plus size={15} /> Add business
          </button>
        }
      />
      <div className={s.stats}>
        <Stat
          label="First calls"
          value={stats('call')}
          sub={callGoal(day) ? 'of 25 today' : 'Weekend · no call target'}
          icon={<Phone size={15} />}
        />
        <Stat
          label="First emails"
          value={stats('email')}
          sub="of 25 today"
          icon={<Mail size={15} />}
        />
        <Stat
          label="Positive responses"
          value={positive}
          sub="Businesses today"
          icon={<MessageCircle size={15} />}
        />
        <Stat
          label="Sales calls booked"
          value={booked}
          sub="Meetings added today"
          icon={<CalendarCheck2 size={15} />}
        />
      </div>
      <div className={s.dual}>
        <ActivityChart ctx={ctx} />
        <section className={s.panel}>
          <PanelHead title="Needs your attention" />
          <button className={s.attention} onClick={() => ctx.navigate('email')}>
            <span className={s.mark}>
              <Mail size={18} />
            </span>
            <span>
              <b>Review tomorrow’s emails</b>
              <small>
                {signed} approved ·{' '}
                {
                  drafted.filter(
                    (b) =>
                      !findApproval(state, b, tomorrow) &&
                      !findApproval(state, b, day),
                  ).length
                }{' '}
                drafts to review
              </small>
            </span>
            <ChevronRight size={16} />
          </button>
          <button
            className={s.attention}
            onClick={() =>
              due[0]
                ? ctx.openBusiness(due[0].id, 'call')
                : ctx.navigate('calls')
            }
          >
            <span className={s.mark}>
              <Phone size={18} />
            </span>
            <span>
              <b>Callbacks due</b>
              <small>
                {due.length} {due.length === 1 ? 'business' : 'businesses'} on
                your list
              </small>
            </span>
            <ChevronRight size={16} />
          </button>
        </section>
      </div>
      <div className={s.dual}>
        <section className={s.panel}>
          <PanelHead
            title="Next calls"
            action="Open queue"
            go={() => ctx.navigate('calls')}
          />
          {next.slice(0, 4).map((b, i) => (
            <button
              key={b.id}
              className={s.listButton}
              onClick={() => ctx.openBusiness(b.id, 'call')}
            >
              <span className={s.num}>{String(i + 1).padStart(2, '0')}</span>
              <BusinessLabel item={b} />
              <span className={s.end}>
                <Phone size={15} />
              </span>
            </button>
          ))}
          {!next.length && (
            <Empty>No businesses waiting for a first call.</Empty>
          )}
        </section>
        <section className={s.panel}>
          <PanelHead
            title="Email batch"
            action="Review batch"
            go={() => ctx.navigate('email')}
          />
          <div className={s.batchSummary}>
            <span className={s.tag}>Next day</span>
            <h3>{formatDay(tomorrow, true)}</h3>
            <p>{signed} of 25 first emails approved</p>
            <progress
              value={Math.min(signed, 25)}
              max="25"
              aria-label="Tomorrow’s approved email target"
            />
            <button
              className={s.secondary}
              onClick={() => ctx.navigate('email')}
            >
              Inspect drafts <ArrowRight size={15} />
            </button>
          </div>
        </section>
      </div>
    </>
  )
}

export function Performance({
  ctx,
  experiments = false,
}: {
  ctx: Context
  experiments?: boolean
}) {
  const { state } = ctx
  const stages = ['Booked', 'Held', 'Won'] as const
  return (
    <>
      <PageTitle
        title={experiments ? 'Experiments' : 'Analytics'}
        date={
          experiments
            ? 'Independent phone and email assignments by business'
            : 'All recorded review activity'
        }
      />
      {!experiments && (
        <>
          <div className={s.stats}>
            <Stat label="First calls" value={countTouches(state, 'call')} />
            <Stat label="First emails" value={countTouches(state, 'email')} />
            <Stat label="Positive calls" value={countPositive(state, 'call')} />
            <Stat
              label="Positive replies"
              value={countPositive(state, 'email')}
            />
          </div>
          <ActivityChart ctx={ctx} />
        </>
      )}
      <CampaignDesign ctx={ctx} />
      {!experiments && (
        <section className={s.panel}>
          <PanelHead
            title="Sales outcomes"
            action="Open sales"
            go={() => ctx.navigate('sales')}
          />
          <div className={s.stageStats}>
            {stages.map((stage) => (
              <Stat
                key={stage}
                label={stage}
                value={countSalesStage(state, stage)}
              />
            ))}
          </div>
        </section>
      )}
    </>
  )
}

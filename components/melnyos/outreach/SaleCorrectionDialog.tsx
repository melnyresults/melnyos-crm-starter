'use client'

import { businessTimeZone, timeZoneLabel } from '@/lib/melnyos-review/timezone'

import { useState } from 'react'
import {
  previewSaleCorrection,
  type SaleCorrection,
} from '@/lib/melnyos-review/sales-corrections'
import type { Business, SaleStage } from '@/lib/melnyos-review/model'
import { Modal, type Context } from './Shared'
import s from './Outreach.module.css'
import styles from './SalesCorrection.module.css'

const milestones: SaleStage[] = ['Booked', 'Held', 'Won']
const removalLabel: Record<SaleStage, string> = {
  Booked: 'Remove booking',
  Held: 'Remove held call',
  Won: 'Remove won deal',
}
const time = new Intl.DateTimeFormat('en-CA', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: businessTimeZone,
})

export default function SaleCorrectionDialog({
  ctx,
  item,
  close,
  remove,
}: {
  ctx: Context
  item: Business
  close: () => void
  remove: (preview: SaleCorrection) => boolean
}) {
  // Freeze the reviewed events so changes arriving after the dialog opens require a fresh review.
  const [choices] = useState(() =>
    milestones.flatMap((stage) => {
      const preview = previewSaleCorrection(ctx.state, item.id, stage)
      return preview && preview.events.some((event) => event.title === stage)
        ? [preview]
        : []
    }),
  )
  const [from, select] = useState(() => choices[choices.length - 1]?.from)
  const [error, setError] = useState('')
  const preview = choices.find((choice) => choice.from === from)
  return (
    <Modal title="Correct sales stage" close={close}>
      <div className={s.form}>
        <strong className={styles.business}>{item.name}</strong>
        {preview ? (
          <>
            {choices.length > 1 && (
              <label>
                Milestone to remove
                <select
                  value={preview.from}
                  onChange={(event) => {
                    select(event.target.value as SaleStage)
                    setError('')
                  }}
                >
                  {choices.map((choice) => (
                    <option key={choice.from} value={choice.from}>
                      {choice.from}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className={styles.preview}>
              <h3>Sales activity to remove</h3>
              <ul>
                {preview.events.map((event, index) => (
                  <li key={event.id + '-' + index}>
                    <strong>{event.title}</strong>
                    <time dateTime={event.at}>
                      {time.format(new Date(event.at))} · {timeZoneLabel}
                    </time>
                  </li>
                ))}
              </ul>
            </div>
            {preview.events.some((event) => event.title !== preview.from) && (
              <p className={s.explain}>
                Removing this milestone also removes the later sales stages
                listed above.
              </p>
            )}
            {error && (
              <p role="alert" className={s.error}>
                {error}
              </p>
            )}
            <div className={s.actions}>
              <button type="button" className={s.secondary} onClick={close}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.remove}
                onClick={() => {
                  if (!remove(preview))
                    setError(
                      'Could not apply this correction. Reopen the sales stage to check its latest history.',
                    )
                }}
              >
                {removalLabel[preview.from]}
              </button>
            </div>
          </>
        ) : (
          <p className={s.explain}>
            This business has no recorded sales milestones.
          </p>
        )}
      </div>
    </Modal>
  )
}

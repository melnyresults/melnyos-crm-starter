'use client'

import { useEffect, useRef, useState } from 'react'
import { localDay, type ReviewState } from '@/lib/melnyos-review/model'
import { Performance, Today } from './Dashboard'
import { BusinessQueue, EmailQueue } from './Queues'
import { CallForm, Details, EmailEditor, NewBusiness } from './RecordDialogs'
import { Context, View } from './Shared'
import { useReview } from './useReview'
import ModulePanel from '../modules/ModulePanel'
import SaleCorrectionDialog from './SaleCorrectionDialog'
import {
  applySaleCorrection,
  restoreSaleCorrection,
  type SaleCorrection,
} from '@/lib/melnyos-review/sales-corrections'
import correctionStyles from './SalesCorrection.module.css'
import s from './Outreach.module.css'

interface Props {
  view: View
  userId: string
  onNavigate: (view: string) => void
}
type Sheet =
  | {
      id: string
      mode: 'detail' | 'call' | 'email' | 'sales'
      returnToDetail?: boolean
    }
  | { mode: 'add' }

function downloadChanges(state: ReviewState) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = 'melnyos-device-changes.json'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function OutreachPanel(props: Props) {
  return <Workspace key={props.userId} {...props} />
}

function Workspace({ view, userId, onNavigate }: Props) {
  const { state, status, hasLocal, recovery, update, retry, useServer } =
    useReview(userId)
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [message, setMessage] = useState('')
  const [savedDraft, setSavedDraft] = useState<{
    id: string
    revision: number
  } | null>(null)
  const [lastCorrection, setLastCorrection] = useState<{
    name: string
    preview: SaleCorrection
  } | null>(null)
  const undoButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (lastCorrection) undoButton.current?.focus()
  }, [lastCorrection])
  const [day, setDay] = useState(() => localDay())
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [replace, setReplace] = useState(false)
  useEffect(() => {
    const clock = setInterval(() => setDay(localDay()), 15000)
    return () => {
      clearInterval(clock)
      clearTimeout(timer.current)
    }
  }, [])
  useEffect(() => {
    setSheet(null)
    setMessage('')
  }, [view])
  const notify = (value: string) => {
    setMessage(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(''), 6000)
  }
  const close = () => setSheet(null)
  const item =
    sheet && 'id' in sheet
      ? state?.businesses.find((b) => b.id === sheet.id)
      : null
  const ctx: Context | null = state
    ? {
        state,
        day,
        userId,
        update,
        notify,
        navigate: onNavigate,
        openBusiness: (id, mode = 'detail') =>
          setSheet((current) => ({
            id,
            mode,
            returnToDetail:
              mode === 'sales' &&
              current?.mode === 'detail' &&
              current.id === id,
          })),
        addBusiness: () => setSheet({ mode: 'add' }),
      }
    : null
  return (
    <div className={s.root}>
      {status === 'conflict' && (
        <div className={s.notice} role="alert">
          A saved version and device changes need reconciliation. Your device
          changes are retained.{' '}
          {recovery && (
            <button type="button" onClick={() => downloadChanges(recovery)}>
              Download device changes
            </button>
          )}
          {replace ? (
            <>
              <button
                onClick={() => {
                  setReplace(false)
                  useServer()
                }}
              >
                Replace this device’s copy with the saved review
              </button>
              <button onClick={() => setReplace(false)}>Cancel</button>
            </>
          ) : (
            <button onClick={() => setReplace(true)}>Resolve conflict</button>
          )}
        </div>
      )}
      {status === 'local' && (
        <div className={s.notice} role="status">
          {hasLocal
            ? 'Changes are saved in this browser until the local server reconnects.'
            : 'Changes are in this tab only. Reconnect the local server before closing it.'}
          <button onClick={retry}>Retry sync</button>
        </div>
      )}
      {view === 'comms' && (
        <ModulePanel
          view="comms"
          userId={userId}
          onNavigate={onNavigate}
          outreachInbox={{
            state,
            status,
            day,
            openDraft: (id) => setSheet({ id, mode: 'email' }),
          }}
        />
      )}
      {status === 'unavailable' ? (
        <div className={s.notice} role="alert">
          Could not load outreach records from the local server.{' '}
          <button onClick={retry}>Retry</button>
        </div>
      ) : !ctx ? (
        view !== 'comms' && (
          <p className={s.loading} role="status">
            Loading outreach records…
          </p>
        )
      ) : (
        <>
          {lastCorrection && (
            <div className={correctionStyles.undo}>
              <span role="status">
                Sales stage corrected for {lastCorrection.name}.
              </span>
              <button
                ref={undoButton}
                type="button"
                onClick={() => {
                  if (
                    update((current) =>
                      restoreSaleCorrection(current, lastCorrection.preview),
                    )
                  ) {
                    setLastCorrection(null)
                    notify('Original sales activity restored.')
                  } else {
                    notify(
                      'Could not undo this correction. Check the current sales history and sync status.',
                    )
                  }
                }}
              >
                Undo correction
              </button>
              <button
                type="button"
                className={correctionStyles.dismiss}
                aria-label="Dismiss correction notice"
                onClick={() => setLastCorrection(null)}
              >
                Dismiss
              </button>
            </div>
          )}
          {view === 'comms' ? null : view === 'today' ? (
            <Today ctx={ctx} />
          ) : view === 'email' ? (
            <EmailQueue
              key={savedDraft?.revision ?? 0}
              ctx={ctx}
              initialBusinessId={savedDraft?.id}
            />
          ) : view === 'analytics' || view === 'experiments' ? (
            <Performance ctx={ctx} experiments={view === 'experiments'} />
          ) : (
            <BusinessQueue key={view} ctx={ctx} mode={view} />
          )}
          <footer className={s.stateFooter}>
            <span className={s.dot} />{' '}
            {status === 'saving'
              ? 'Saving…'
              : status === 'synced'
                ? 'Saved to the local server'
                : status === 'conflict'
                  ? 'Sync conflict'
                  : hasLocal
                    ? 'Saved on this device'
                    : 'Session only'}
          </footer>
          {sheet?.mode === 'add' && <NewBusiness ctx={ctx} close={close} />}
          {item && sheet?.mode === 'detail' && (
            <Details key={item.id} ctx={ctx} item={item} close={close} />
          )}
          {item && sheet?.mode === 'call' && (
            <CallForm key={item.id} ctx={ctx} item={item} close={close} />
          )}
          {item && sheet?.mode === 'sales' && (
            <SaleCorrectionDialog
              key={item.id}
              ctx={ctx}
              item={item}
              close={() =>
                sheet.returnToDetail
                  ? setSheet({ id: item.id, mode: 'detail' })
                  : close()
              }
              remove={(preview) => {
                if (!update((current) => applySaleCorrection(current, preview)))
                  return false
                setLastCorrection({ name: item.name, preview })
                close()
                return true
              }}
            />
          )}
          {item && sheet?.mode === 'email' && (
            <EmailEditor
              key={item.id}
              ctx={ctx}
              item={item}
              close={close}
              onSaved={() => {
                if (view === 'email')
                  setSavedDraft((previous) => ({
                    id: item.id,
                    revision: (previous?.revision ?? 0) + 1,
                  }))
                close()
                notify(
                  'Draft saved in MelnyOS. Find it in Cold email → Drafts or Comms → Inbox.',
                )
              }}
            />
          )}
        </>
      )}
      <div
        aria-live="polite"
        role="status"
        className={message ? s.toast : s.sr}
      >
        {message}
      </div>
    </div>
  )
}

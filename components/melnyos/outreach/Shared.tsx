'use client'

import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X, ArrowUpRight } from 'lucide-react'
import type { Business, ReviewState } from '@/lib/melnyos-review/model'
import s from './Outreach.module.css'

export type View =
  | 'today'
  | 'calls'
  | 'email'
  | 'experiments'
  | 'analytics'
  | 'leads'
  | 'sales'
  | 'comms'
export type Update = (change: (state: ReviewState) => ReviewState) => boolean
export interface Context {
  state: ReviewState
  day: string
  userId: string
  update: Update
  notify: (message: string) => void
  navigate: (view: string) => void
  openBusiness: (
    id: string,
    mode?: 'detail' | 'call' | 'email' | 'sales',
  ) => void
  addBusiness: () => void
}

export function PageTitle({
  title,
  date,
  actions,
}: {
  title: string
  date?: string
  actions?: ReactNode
}) {
  return (
    <div className={s.pageTitle}>
      <div>
        <h1>{title}</h1>
        {date && <p>{date}</p>}
      </div>
      {actions && <div className={s.actions}>{actions}</div>}
    </div>
  )
}

export function PanelHead({
  title,
  action,
  go,
}: {
  title: string
  action?: string
  go?: () => void
}) {
  return (
    <header className={s.panelHead}>
      <h2>{title}</h2>
      {action && (
        <button type="button" className={s.textButton} onClick={go}>
          {action}
          <ArrowUpRight size={15} />
        </button>
      )}
    </header>
  )
}

export function Modal({
  title,
  children,
  close,
}: {
  title: string
  children: ReactNode
  close: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = ref.current
    element?.showModal()
    return () => element?.close()
  }, [])
  return (
    <dialog
      className={s.dialog}
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      aria-label={title}
    >
      <header>
        <h2>{title}</h2>
        <button
          className={s.iconBtn}
          type="button"
          onClick={close}
          aria-label="Close dialog"
        >
          <X size={19} />
        </button>
      </header>
      <div className={s.dialogBody}>{children}</div>
    </dialog>
  )
}

export function BusinessLabel({ item }: { item: Business }) {
  return (
    <span className={s.businessLabel}>
      <b>{item.name}</b>
      <small>
        {item.city} · {item.industry}
      </small>
    </span>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className={s.empty}>{children}</p>
}

export function Stat({
  label,
  value,
  sub,
  icon,
}: {
  label: string
  value: number | string
  sub?: string
  icon?: ReactNode
}) {
  return (
    <div className={s.stat}>
      <span className={s.statLabel}>
        {label}
        {icon}
      </span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  )
}

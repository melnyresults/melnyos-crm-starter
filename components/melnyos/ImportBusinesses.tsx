'use client'
import { useState } from 'react'
import { Upload } from 'lucide-react'
import {
  filterNewBusinesses,
  importBusinesses,
  parseBusinessCsv,
  type ImportBusiness,
} from '@/lib/melnyos-import'
import { Modal, type Context } from './outreach/Shared'
import styles from './CampaignDesign.module.css'

export default function ImportBusinesses({ ctx }: { ctx: Context }) {
  const [opened, open] = useState(false)
  const [input, setInput] = useState<{
    rows: ImportBusiness[]
    invalid: number
  } | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const preview = input && filterNewBusinesses(ctx.state.businesses, input.rows)
  function close() {
    open(false)
    setInput(null)
    setMessage('')
  }
  async function read(file: File | undefined) {
    setInput(null)
    setMessage('')
    if (!file) return
    if (file.size > 1500000) {
      setMessage('Choose a CSV smaller than 1.5 MB.')
      return
    }
    setBusy(true)
    try {
      setInput(parseBusinessCsv(await file.text()))
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Could not read the list.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <button className={styles.importButton} onClick={() => open(true)}>
        <Upload size={15} /> Import CSV
      </button>
      {opened && (
        <Modal title="Import businesses" close={close}>
          <div className={styles.form}>
            <p>
              Include business, city and a phone number or email. Optional
              columns include branch, industry, contact and source. Business
              details are saved to your private review workspace.
            </p>
            <label>
              Business list
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={busy}
                onChange={(e) => {
                  void read(e.target.files?.[0])
                }}
              />
            </label>
            {busy && <p role="status">Reading list…</p>}
            {message && <p role="alert">{message}</p>}
            {preview && input && (
              <>
                <p role="status">
                  <strong>{preview.fresh.length} new</strong> ·{' '}
                  {preview.duplicates} matching or repeated · {input.invalid}{' '}
                  invalid
                </p>
                {preview.fresh.length > 0 && (
                  <ul>
                    {preview.fresh.slice(0, 5).map((b, i) => (
                      <li key={i}>
                        {b.name} · {b.city}
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  className={styles.save}
                  disabled={!preview.fresh.length}
                  onClick={() => {
                    if (
                      ctx.update((state) =>
                        importBusinesses(state, input.rows, ctx.day),
                      )
                    ) {
                      ctx.notify('Business list imported.')
                      close()
                    }
                  }}
                >
                  Import {preview.fresh.length}{' '}
                  {preview.fresh.length === 1 ? 'business' : 'businesses'}
                </button>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}

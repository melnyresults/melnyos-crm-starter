'use client'

import { useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { Business, validDocumentUrl } from '@/lib/melnyos-review/model'
import { Context } from './Shared'
import s from './Outreach.module.css'

export default function Documents({
  ctx,
  item,
}: {
  ctx: Context
  item: Business
}) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  return (
    <section>
      <h3 className={s.minorTitle}>Documents</h3>
      {(item.documents || []).map((doc) => (
        <div className={s.inlineRow} key={doc.id}>
          <a
            className={s.textButton}
            href={doc.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            {doc.name}
            <ExternalLink size={13} />
          </a>
          <button
            className={s.iconBtn}
            aria-label={'Remove link ' + doc.name}
            onClick={() => {
              if (
                ctx.update((state) => ({
                  ...state,
                  businesses: state.businesses.map((b) =>
                    b.id === item.id
                      ? {
                          ...b,
                          documents: b.documents?.filter(
                            (d) => d.id !== doc.id,
                          ),
                        }
                      : b,
                  ),
                }))
              )
                ctx.notify('Document link removed.')
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <form
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim() || !validDocumentUrl(url.trim())) {
            setError(
              'Enter a name and an HTTPS link without embedded credentials.',
            )
            return
          }
          const doc = {
            id: crypto.randomUUID(),
            name: name.trim(),
            url: url.trim(),
          }
          if (
            ctx.update((state) => ({
              ...state,
              businesses: state.businesses.map((b) =>
                b.id === item.id
                  ? { ...b, documents: [...(b.documents || []), doc] }
                  : b,
              ),
            }))
          ) {
            setName('')
            setUrl('')
            setError('')
            ctx.notify('Document linked.')
          }
        }}
      >
        <div className={s.formGrid}>
          <label>
            Document name
            <input
              value={name}
              maxLength={140}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Document link
            <input
              type="url"
              value={url}
              maxLength={2000}
              placeholder="https://"
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
        </div>
        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
        <button className={s.secondary} disabled={!name.trim() || !url.trim()}>
          Attach link
        </button>
      </form>
    </section>
  )
}

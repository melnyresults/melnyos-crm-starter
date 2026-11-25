'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  loadReviewState,
  saveReviewState,
  ReviewAccessDeniedError,
  ReviewStateConflictError,
} from '@/lib/melnyos-persistence'
import {
  ReviewState,
  emptyReview,
  validReviewState,
} from '@/lib/melnyos-review/model'

import {
  cacheKey,
  readReviewCache,
  type ReviewCache as Cache,
} from '@/lib/melnyos-review/cache'

type Status =
  'loading' | 'synced' | 'saving' | 'local' | 'conflict' | 'unavailable'

export function useReview(userId: string) {
  const key = cacheKey(userId)
  const active = useRef(false)
  const working = useRef<Cache | null>(null)
  const running = useRef(false)
  const blocked = useRef(false)
  const offline = useRef(false)
  const [state, setState] = useState<ReviewState | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [recovery, setRecovery] = useState<ReviewState | null>(null)
  const [hasLocal, setHasLocal] = useState(true)
  const denyAccess = useCallback(() => {
    blocked.current = true
    working.current = null
    setState(null)
    setRecovery(null)
    setStatus('unavailable')
    try {
      localStorage.removeItem(key)
    } catch {
      /* Storage can be unavailable. */
    }
  }, [key])

  const store = useCallback(
    (data: Cache) => {
      working.current = data
      setState(data.state)
      try {
        localStorage.setItem(key, JSON.stringify(data))
        setHasLocal(true)
      } catch {
        setHasLocal(false)
      }
    },
    [key],
  )

  const flush = useCallback(async () => {
    if (running.current || blocked.current || offline.current) return
    running.current = true
    try {
      while (active.current && working.current?.dirty) {
        const pending = working.current
        setStatus('saving')
        const result = await saveReviewState(pending.state, pending.revision)
        if (!active.current || !working.current) return
        store({
          ...working.current,
          revision: result.revision,
          dirty: working.current.state !== pending.state,
        })
      }
      if (active.current) setStatus('synced')
    } catch (error) {
      if (!active.current) return
      if (error instanceof ReviewAccessDeniedError) denyAccess()
      else if (error instanceof ReviewStateConflictError) {
        blocked.current = true
        setRecovery(working.current?.state ?? null)
        setStatus('conflict')
      } else {
        offline.current = true
        setStatus('local')
      }
    } finally {
      running.current = false
    }
  }, [store, denyAccess])

  const load = useCallback(
    async (chooseServer = false) => {
      if (running.current) return
      let cached: Cache | null = null
      let badCache = false
      try {
        cached = readReviewCache(localStorage.getItem(key))
      } catch {
        badCache = true
      }
      if (working.current?.dirty) cached = working.current
      try {
        const result = await loadReviewState()
        if (!active.current) return
        if (result.state && !validReviewState(result.state)) {
          blocked.current = true
          setStatus('unavailable')
          return
        }
        if (badCache && !result.state && !cached) {
          blocked.current = true
          setStatus('unavailable')
          return
        }
        // A reload can interrupt the response after SQLite has committed the save.
        // Accept the server revision when it already contains the pending edits.
        if (cached?.dirty && result.state &&
            JSON.stringify(cached.state) === JSON.stringify(result.state)) {
          cached = null
        }
        if (
          cached?.dirty &&
          !chooseServer &&
          cached.revision !== result.revision
        ) {
          working.current = cached
          setRecovery(cached.state)
          setState(result.state ?? emptyReview())
          blocked.current = true
          setStatus('conflict')
          return
        }
        setRecovery(null)
        offline.current = false
        blocked.current = false
        const next =
          cached?.dirty && !chooseServer
            ? cached
            : {
                state: result.state ?? emptyReview(),
                revision: result.revision,
                dirty: false,
              }
        store(next)
        setStatus('synced')
        if (next.dirty) void flush()
      } catch (error) {
        if (!active.current) return
        if (error instanceof ReviewAccessDeniedError) {
          denyAccess()
          return
        }
        if (
          error instanceof Error &&
          /unrecognized review data|invalid review revision/i.test(
            error.message,
          )
        ) {
          blocked.current = true
          setStatus('unavailable')
          return
        }
        if (!cached) {
          setState(null)
          blocked.current = true
          setStatus('unavailable')
          return
        }
        if (blocked.current) return
        offline.current = true
        store(cached)
        setStatus('local')
      }
    },
    [flush, key, store, denyAccess],
  )

  useEffect(() => {
    active.current = true
    void load()
    return () => {
      active.current = false
    }
  }, [load])

  const update = useCallback(
    (change: (prev: ReviewState) => ReviewState) => {
      const current = working.current
      if (!current || blocked.current) return false
      const next = change(current.state)
      if (next === current.state) return false
      store({ ...current, state: next, dirty: true })
      void flush()
      return true
    },
    [store, flush],
  )

  return {
    state,
    status,
    recovery,
    hasLocal,
    update,
    retry: () => void load(),
    useServer: () => void load(true),
  }
}

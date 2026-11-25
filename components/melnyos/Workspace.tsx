'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  Layers3,
  Check,
  ChevronDown,
  ChevronRight,
  Menu,
  Search,
  X,
  PanelLeft,
} from 'lucide-react'
import { sections, type Destination } from './navigation'
import LocalRecords from './LocalRecords'
import ui from './Workspace.module.css'

const Loading = () => (
  <div className={ui.loading} role="status">
    Loading workspace…
  </div>
)
const OutreachPanel = dynamic(() => import('./outreach/OutreachPanel'), {
  loading: Loading,
})
const ModulePanel = dynamic(() => import('./modules/ModulePanel'), {
  loading: Loading,
})
const outreach = [
  'today',
  'comms',
  'calls',
  'email',
  'leads',
  'sales',
  'experiments',
  'analytics',
] as const
type OutreachView = (typeof outreach)[number]
const isOutreach = (view: string): view is OutreachView =>
  outreach.some((item) => item === view)

const localUserId = 'local-owner'

export default function Workspace() {
  const [view, setView] = useState('today')
  const [query, setQuery] = useState('')
  const [compact, setCompact] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const menu = useRef<HTMLDialogElement>(null)
  const palette = useRef<HTMLDialogElement>(null)
  const main = useRef<HTMLElement>(null)
  const destinations = sections.flatMap((group) => group.items)
  const selected =
    destinations.find((item) => item.id === view) || destinations[0]
  const currentGroup = sections.find((group) =>
    group.items.some((item) => item.id === selected.id),
  )!
  const closeDialogs = () => {
    menu.current?.close()
    palette.current?.close()
  }
  const showSearch = useCallback(() => {
    menu.current?.close()
    setQuery('')
    if (!palette.current?.open) palette.current?.showModal()
  }, [])
  const navigate = useCallback((id: string) => {
    const item = sections
      .flatMap((group) => group.items)
      .find((item) => item.id === id)
    if (!item) return
    closeDialogs()
    const url = new URL(window.location.href)
    url.hash = id === 'today' ? '' : id
    if (url.href !== window.location.href)
      window.history.pushState(null, '', url.href)
    setView(id)
    main.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [])
  useEffect(() => {
    const fromLocation = () => {
      const id = window.location.hash.slice(1)
      const item = sections.flatMap((g) => g.items).find((i) => i.id === id)
      setView(item?.id || 'today')
    }
    fromLocation()
    const keyboard = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        showSearch()
      }
    }
    window.addEventListener('hashchange', fromLocation)
    window.addEventListener('popstate', fromLocation)
    window.addEventListener('keydown', keyboard)
    return () => {
      window.removeEventListener('hashchange', fromLocation)
      window.removeEventListener('popstate', fromLocation)
      window.removeEventListener('keydown', keyboard)
    }
  }, [showSearch])
  const routeLink = (item: Destination) =>
    '/admin/dashboard' + (item.id === 'today' ? '' : '#' + item.id)
  const renderNavigation = (mobile: boolean) => (
    <nav
      aria-label={mobile ? 'Mobile CRM navigation' : 'CRM navigation'}
      className={ui.nav}
    >
      {sections.map((group) => {
        const open =
          expanded[group.name] ??
          (group.name === 'Growth & outreach' ||
            group.name === currentGroup.name)
        return (
          <div key={group.name} className={ui.group}>
            <button
              aria-expanded={open}
              className={ui.groupName}
              onClick={() =>
                setExpanded((old) => ({ ...old, [group.name]: !open }))
              }
            >
              {group.name}
              <ChevronDown
                size={13}
                style={{ transform: open ? 'none' : 'rotate(-90deg)' }}
              />
            </button>
            {open &&
              group.items.map((item) => (
                <a
                  key={item.id}
                  href={routeLink(item)}
                  aria-current={selected.id === item.id ? 'page' : undefined}
                  className={ui.navLink}
                  onClick={(event) => {
                    if (
                      !event.metaKey &&
                      !event.ctrlKey &&
                      !event.shiftKey &&
                      !event.altKey &&
                      event.button === 0
                    ) {
                      event.preventDefault()
                      navigate(item.id)
                    }
                  }}
                >
                  <item.icon size={16} strokeWidth={1.65} />
                  <span>{item.name}</span>
                </a>
              ))}
          </div>
        )
      })}
    </nav>
  )
  const brand = (
    <div className={ui.brand}>
      <Layers3 size={30} aria-hidden="true" />
      <div>
        <strong>MelnyOS</strong>
        <small>Local CRM</small>
      </div>
    </div>
  )
  const matches = destinations.filter((item) =>
    item.name.toLowerCase().includes(query.trim().toLowerCase()),
  )
  return (
    <div className={ui.workspace} data-compact={compact}>
      <aside className={ui.sidebar}>
        {brand}
        {renderNavigation(false)}
      </aside>
      <div className={ui.stage}>
        <header className={ui.top}>
          <button
            className={ui.mobileMenu}
            aria-label="Open navigation"
            onClick={() => menu.current?.showModal()}
          >
            <Menu size={19} />
          </button>
          <button
            className={ui.desktopMenu}
            aria-label={compact ? 'Show sidebar' : 'Hide sidebar'}
            onClick={() => setCompact(!compact)}
          >
            <PanelLeft size={17} />
          </button>
          <span className={ui.crumb}>
            CRM <ChevronRight size={13} />
          </span>
          <strong>{selected.name}</strong>
          <div className={ui.topTools}>
            <button
              className={ui.find}
              aria-label="Search workspace"
              onClick={showSearch}
            >
              <Search size={15} />
              <span>Search</span>
              <kbd>⌘ K</kbd>
            </button>
          </div>
        </header>
        <main ref={main} tabIndex={-1} className={ui.content}>
          {isOutreach(selected.id) ? (
            <OutreachPanel
              view={selected.id}
              userId={localUserId}
              onNavigate={navigate}
            />
          ) : ['submissions', 'finances', 'revenue', 'blog', 'events'].includes(
              selected.id,
            ) ? (
            <LocalRecords key={selected.id} view={selected.id} />
          ) : (
            <ModulePanel
              view={selected.id}
              userId={localUserId}
              onNavigate={navigate}
            />
          )}
        </main>
      </div>
      <dialog
        ref={menu}
        className={ui.drawer}
        onClick={(e) => {
          if (e.target === menu.current) menu.current?.close()
        }}
      >
        <div className={ui.drawerBody}>
          <div className={ui.drawerHead}>
            {brand}
            <button
              aria-label="Close navigation"
              onClick={() => menu.current?.close()}
            >
              <X size={18} />
            </button>
          </div>
          {renderNavigation(true)}
        </div>
      </dialog>
      <dialog
        ref={palette}
        className={ui.palette}
        onClick={(e) => {
          if (e.target === palette.current) palette.current?.close()
        }}
      >
        <div className={ui.paletteHead}>
          <Search size={18} />
          <input
            aria-label="Find a workspace view"
            placeholder="Find a workspace view…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matches[0]) navigate(matches[0].id)
            }}
            autoFocus
          />
          <button
            aria-label="Close search"
            onClick={() => palette.current?.close()}
          >
            <X size={16} />
          </button>
        </div>
        <div className={ui.results}>
          {matches.length ? (
            matches.map((item) => (
              <button key={item.id} onClick={() => navigate(item.id)}>
                <item.icon size={16} />
                {item.name}
                {item.id === selected.id && <Check size={14} />}
              </button>
            ))
          ) : (
            <p>No matching views.</p>
          )}
        </div>
      </dialog>
    </div>
  )
}

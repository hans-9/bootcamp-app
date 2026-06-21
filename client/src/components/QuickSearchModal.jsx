import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { search as apiSearch } from '../api.js'
import Dialog from './Dialog.jsx'
import SeverityBadge from './SeverityBadge.jsx'
import StatusPill from './StatusPill.jsx'

const EMPTY = { testCases: [], bugs: [], suites: [] }
const MIN_CHARS = 2
const GROUPS = [
  { key: 'testCases', label: 'Test cases' },
  { key: 'bugs', label: 'Bugs' },
  { key: 'suites', label: 'Suites' },
]

export default function QuickSearchModal({ onClose }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [results, setResults] = useState(EMPTY)
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(false)

  const term = q.trim()

  useEffect(() => {
    if (term.length < MIN_CHARS) {
      setResults(EMPTY)
      setLoading(false)
      return
    }
    setLoading(true)
    // Ignore a response if the query changed while it was in flight, so a slow
    // earlier request can't overwrite results for what the user now typed.
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const data = await apiSearch(term)
        if (cancelled) return
        setResults({ testCases: data.testCases, bugs: data.bugs, suites: data.suites })
        setActive(0)
      } catch {
        if (!cancelled) setResults(EMPTY)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [term])

  // Flatten the grouped results into visible order for arrow-key navigation.
  const flat = GROUPS.flatMap((g) => results[g.key].map((r) => ({ ...r, type: g.key })))
  const total = flat.length

  // Keep the highlighted row valid when the result set shrinks.
  useEffect(() => {
    setActive((a) => (total === 0 ? 0 : Math.min(a, total - 1)))
  }, [total])

  function go(item) {
    if (!item) return
    onClose()
    if (item.type === 'bugs') navigate(`/bugs/${item.id}`)
    else if (item.type === 'suites') navigate(`/test-suites/${item.id}`)
    else navigate(`/test-cases?search=${encodeURIComponent(item.title)}`)
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (total ? (a + 1) % total : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (total ? (a - 1 + total) % total : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(flat[active])
    }
  }

  let runningIndex = -1

  return (
    <Dialog className="quick-search" label="Quick search" onClose={onClose}>
      <input
        className="quick-search-input"
        placeholder="Search test cases, bugs, and suites…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKeyDown}
        aria-label="Search test cases, bugs, and suites"
      />
      <div className="quick-search-results">
        {term.length < MIN_CHARS && (
          <div className="quick-search-hint">Type at least {MIN_CHARS} characters to search.</div>
        )}
        {term.length >= MIN_CHARS && !loading && total === 0 && (
          <div className="quick-search-hint">No matches for “{term}”.</div>
        )}
        {term.length >= MIN_CHARS &&
          GROUPS.map((g) => {
            const items = results[g.key]
            if (items.length === 0) return null
            return (
              <div key={g.key} className="quick-search-group">
                <div className="quick-search-group-head">{g.label}</div>
                {items.map((item) => {
                  runningIndex += 1
                  const idx = runningIndex
                  return (
                    <button
                      key={`${g.key}-${item.id}`}
                      type="button"
                      className={`quick-search-row${idx === active ? ' is-active' : ''}`}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => go({ ...item, type: g.key })}
                    >
                      <span className="quick-search-title">{item.title}</span>
                      {g.key === 'suites' ? (
                        <span className="muted">{item.feature}</span>
                      ) : (
                        <SeverityBadge severity={item.severity} />
                      )}
                      <StatusPill status={item.status} />
                    </button>
                  )
                })}
              </div>
            )
          })}
      </div>
      <div className="quick-search-foot">
        <span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span>
        <span><kbd>↵</kbd> to open</span>
        <span><kbd>Esc</kbd> to close</span>
      </div>
    </Dialog>
  )
}

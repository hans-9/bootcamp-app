import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listBugs, createBug, deleteBug } from '../api.js'
import SeverityBadge from '../components/SeverityBadge.jsx'
import PriorityBadge from '../components/PriorityBadge.jsx'
import StatusPill from '../components/StatusPill.jsx'
import BugForm from '../components/BugForm.jsx'
import { navProps } from '../nav.js'

const STATUSES = ['open', 'in-progress', 'resolved', 'closed', 'reopened']
const SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial']
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function BugsPage() {
  const navigate = useNavigate()
  const [bugs, setBugs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [status, setStatus] = useState('')
  const [severity, setSeverity] = useState('')
  const [priority, setPriority] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('updated')
  const [dir, setDir] = useState('desc')

  const [creating, setCreating] = useState(false)
  const [menuId, setMenuId] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setBugs(await listBugs({ status, severity, priority, search, sort, dir }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, severity, priority, search, sort, dir])

  useEffect(() => {
    if (menuId === null) return
    const close = () => setMenuId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuId])

  function toggleSort(column) {
    if (sort === column) setDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else {
      setSort(column)
      setDir('desc')
    }
  }

  function sortArrow(column) {
    if (sort !== column) return null
    return <span className="arrow">{dir === 'desc' ? '▼' : '▲'}</span>
  }

  function sortProps(column) {
    return {
      role: 'button',
      tabIndex: 0,
      'aria-sort': sort === column ? (dir === 'asc' ? 'ascending' : 'descending') : 'none',
      onClick: () => toggleSort(column),
      onKeyDown: (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          toggleSort(column)
        }
      },
    }
  }

  async function handleCreate(payload) {
    const bug = await createBug(payload)
    setCreating(false)
    if (bug?.id) navigate(`/bugs/${bug.id}`)
    else load()
  }

  async function handleDelete(bug) {
    if (!window.confirm(`Delete "${bug.title}"? This cannot be undone.`)) return
    try {
      await deleteBug(bug.id)
      load()
    } catch (err) {
      window.alert(err.message)
    }
  }

  const items = bugs ?? []

  return (
    <div className="container">
      <div className="page-head">
        <h2>Bugs</h2>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ New bug</button>
      </div>

      <div className="toolbar">
        <input
          className="grow"
          placeholder="Search title or description…"
          aria-label="Search bugs by title or description"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select aria-label="Filter by severity" value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="">All severities</option>
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select aria-label="Filter by priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="sortable" {...sortProps('title')}>Title {sortArrow('title')}</th>
              <th className="sortable" {...sortProps('severity')}>Severity {sortArrow('severity')}</th>
              <th className="sortable" {...sortProps('priority')}>Priority {sortArrow('priority')}</th>
              <th className="sortable" {...sortProps('status')}>Status {sortArrow('status')}</th>
              <th className="sortable" {...sortProps('updated')}>Updated {sortArrow('updated')}</th>
              <th style={{ width: 50 }} />
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr
                key={b.id}
                className="clickable"
                aria-label={`Open bug ${b.title}`}
                {...navProps(navigate, `/bugs/${b.id}`)}
              >
                <td className="title-cell">{b.title}</td>
                <td><SeverityBadge severity={b.severity} /></td>
                <td><PriorityBadge priority={b.priority} /></td>
                <td><StatusPill status={b.status} /></td>
                <td className="muted">{formatDate(b.updated_at)}</td>
                <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn btn-sm"
                    onClick={() => setMenuId(menuId === b.id ? null : b.id)}
                    aria-label="Row actions"
                  >
                    ⋯
                  </button>
                  {menuId === b.id && (
                    <div className="menu">
                      <button onClick={() => { setMenuId(null); navigate(`/bugs/${b.id}`) }}>Open</button>
                      <button className="danger" onClick={() => { setMenuId(null); handleDelete(b) }}>Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {loading && <div className="empty">Loading…</div>}
        {error && !loading && <div className="empty">Error: {error}</div>}
        {!loading && !error && items.length === 0 && (
          <div className="empty">
            No bugs match. {status || severity || priority || search ? 'Try clearing the filters.' : 'Report your first one.'}
          </div>
        )}
      </div>

      {creating && <BugForm onSave={handleCreate} onClose={() => setCreating(false)} />}
    </div>
  )
}

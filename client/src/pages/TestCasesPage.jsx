import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  listTestCases,
  createTestCase,
  updateTestCase,
  deleteTestCase,
} from '../api.js'
import SeverityBadge from '../components/SeverityBadge.jsx'
import StatusPill from '../components/StatusPill.jsx'
import TestCaseForm from '../components/TestCaseForm.jsx'

const STATUSES = ['draft', 'ready', 'passed', 'failed', 'skipped']

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TestCasesPage() {
  const [data, setData] = useState(null) // { items, page, total, totalPages }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('') // debounced
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('updated')
  const [dir, setDir] = useState('desc')

  const [editing, setEditing] = useState(undefined) // undefined = closed, null = new, object = edit
  const [menuId, setMenuId] = useState(null)

  // Debounce the search box so we don't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const result = await listTestCases({ page, search, status, sort, dir })
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, status, sort, dir])

  // Close the row menu on any outside click.
  useEffect(() => {
    if (menuId === null) return
    const close = () => setMenuId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuId])

  function toggleSort(column) {
    if (sort === column) {
      setDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSort(column)
      setDir('desc')
    }
    setPage(1)
  }

  function sortArrow(column) {
    if (sort !== column) return null
    return <span className="arrow">{dir === 'desc' ? '▼' : '▲'}</span>
  }

  async function handleSave(payload) {
    if (editing) {
      await updateTestCase(editing.id, payload)
    } else {
      await createTestCase(payload)
    }
    setEditing(undefined)
    // Show newest first after creating.
    if (!editing) {
      setSort('updated')
      setDir('desc')
      setPage(1)
    }
    load()
  }

  // null on failure — a flaky lookup must never block creation.
  async function findDuplicateTitle(title) {
    const needle = title.trim()
    if (!needle) return null
    try {
      const result = await listTestCases({ title: needle })
      return result.items[0]?.title ?? null
    } catch {
      return null
    }
  }

  async function handleDelete(tc) {
    if (!window.confirm(`Delete "${tc.title}"? This cannot be undone.`)) return
    try {
      await deleteTestCase(tc.id)
      const lastPage = Math.max(1, Math.ceil((data.total - 1) / data.perPage))
      if (page > lastPage) setPage(lastPage) // setPage reloads via the effect; load() would double-fetch
      else load()
    } catch (err) {
      window.alert(err.message)
    }
  }

  const items = data?.items ?? []

  return (
    <div className="container">
      <div className="page-head">
        <h2>Test Cases</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/test-cases/import" className="btn">
            Import CSV
          </Link>
          <button className="btn btn-primary" onClick={() => setEditing(null)}>
            + New test case
          </button>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="grow"
          placeholder="Search by title…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th className="sortable" onClick={() => toggleSort('severity')}>
                Severity {sortArrow('severity')}
              </th>
              <th>Status</th>
              <th className="sortable" onClick={() => toggleSort('updated')}>
                Updated {sortArrow('updated')}
              </th>
              <th style={{ width: 50 }} />
            </tr>
          </thead>
          <tbody>
            {items.map((tc) => (
              <tr key={tc.id}>
                <td className="title-cell">{tc.title}</td>
                <td><SeverityBadge severity={tc.severity} /></td>
                <td><StatusPill status={tc.status} /></td>
                <td className="muted">{formatDate(tc.updated_at)}</td>
                <td className="row-actions">
                  <button
                    className="btn btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuId(menuId === tc.id ? null : tc.id)
                    }}
                    aria-label="Row actions"
                  >
                    ⋯
                  </button>
                  {menuId === tc.id && (
                    <div className="menu" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setMenuId(null)
                          setEditing(tc)
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="danger"
                        onClick={() => {
                          setMenuId(null)
                          handleDelete(tc)
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && <div className="empty">Loading…</div>}
        {error && !loading && <div className="empty">Error: {error}</div>}
        {!loading && !error && items.length === 0 && (
          <div className="empty">
            No test cases match. {search || status ? 'Try clearing filters.' : 'Create your first one.'}
          </div>
        )}
      </div>

      {data && data.total > 0 && (
        <div className="pagination">
          <span>
            {data.total} test case{data.total === 1 ? '' : 's'} · page {data.page} of {data.totalPages}
          </span>
          <div className="pages">
            <button
              className="btn btn-sm"
              disabled={data.page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹ Prev
            </button>
            <button
              className="btn btn-sm"
              disabled={data.page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next ›
            </button>
          </div>
        </div>
      )}

      {editing !== undefined && (
        <TestCaseForm
          initial={editing}
          onSave={handleSave}
          onClose={() => setEditing(undefined)}
          findDuplicateTitle={findDuplicateTitle}
        />
      )}
    </div>
  )
}

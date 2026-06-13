import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listSuites, createSuite, deleteSuite } from '../api.js'
import StatusPill from '../components/StatusPill.jsx'
import SuiteForm from '../components/SuiteForm.jsx'

const SUITE_STATUSES = ['draft', 'ready', 'in-progress', 'passed', 'failed']

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TestSuitesPage() {
  const navigate = useNavigate()
  const [suites, setSuites] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('')
  const [creating, setCreating] = useState(false)
  const [menuId, setMenuId] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setSuites(await listSuites({ status }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  useEffect(() => {
    if (menuId === null) return
    const close = () => setMenuId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuId])

  async function handleCreate(payload) {
    const suite = await createSuite(payload)
    setCreating(false)
    navigate(`/test-suites/${suite.id}`)
  }

  async function handleDelete(suite) {
    if (!window.confirm(`Delete "${suite.name}"? This cannot be undone.`)) return
    try {
      await deleteSuite(suite.id)
      load()
    } catch (err) {
      window.alert(err.message)
    }
  }

  const items = suites ?? []

  return (
    <div className="container">
      <div className="page-head">
        <h2>Test Suites</h2>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          + New suite
        </button>
      </div>

      <div className="toolbar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {SUITE_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Feature</th>
              <th>Status</th>
              <th>Cases</th>
              <th>Updated</th>
              <th style={{ width: 50 }} />
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="clickable" onClick={() => navigate(`/test-suites/${s.id}`)}>
                <td className="title-cell">{s.name}</td>
                <td className="muted">{s.feature}</td>
                <td><StatusPill status={s.status} /></td>
                <td>{s.case_count}</td>
                <td className="muted">{formatDate(s.updated_at)}</td>
                <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn btn-sm"
                    onClick={() => setMenuId(menuId === s.id ? null : s.id)}
                    aria-label="Row actions"
                  >
                    ⋯
                  </button>
                  {menuId === s.id && (
                    <div className="menu">
                      <button onClick={() => { setMenuId(null); navigate(`/test-suites/${s.id}`) }}>
                        Open
                      </button>
                      <button className="danger" onClick={() => { setMenuId(null); handleDelete(s) }}>
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
            No suites match. {status ? 'Try clearing the filter.' : 'Create your first one.'}
          </div>
        )}
      </div>

      {creating && (
        <SuiteForm onSave={handleCreate} onClose={() => setCreating(false)} />
      )}
    </div>
  )
}

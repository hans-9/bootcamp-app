import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  getSuite,
  updateSuite,
  deleteSuite,
  addCaseToSuite,
  removeCaseFromSuite,
  reorderSuiteCases,
} from '../api.js'
import StatusPill from '../components/StatusPill.jsx'
import SeverityBadge from '../components/SeverityBadge.jsx'
import SuiteForm from '../components/SuiteForm.jsx'
import AddCaseModal from '../components/AddCaseModal.jsx'

export default function SuiteDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [suite, setSuite] = useState(null)
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await getSuite(id)
      setSuite(data)
      setCases(data.cases)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleEdit(payload) {
    const updated = await updateSuite(id, payload)
    setSuite(updated)
    setCases(updated.cases)
    setEditing(false)
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${suite.name}"? This cannot be undone.`)) return
    try {
      await deleteSuite(id)
      navigate('/test-suites')
    } catch (err) {
      window.alert(err.message)
    }
  }

  async function handleAdd(caseId) {
    try {
      const data = await addCaseToSuite(id, caseId)
      setCases(data.cases)
    } catch (err) {
      if (err.status === 409) {
        const fresh = await getSuite(id) // already in the suite — just re-sync
        setCases(fresh.cases)
        return
      }
      throw err
    }
  }

  async function handleRemove(caseId) {
    try {
      const data = await removeCaseFromSuite(id, caseId)
      setCases(data.cases)
    } catch (err) {
      window.alert(err.message)
    }
  }

  function onDragOver(e, overIndex) {
    e.preventDefault()
    if (dragIndex === null || dragIndex === overIndex) return
    setCases((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(overIndex, 0, moved)
      return next
    })
    setDragIndex(overIndex)
  }

  function onDragEnd() {
    setDragIndex(null)
    persistOrder(cases)
  }

  async function move(index, dir) {
    const target = index + dir
    if (target < 0 || target >= cases.length) return
    const next = [...cases]
    ;[next[index], next[target]] = [next[target], next[index]]
    setCases(next)
    persistOrder(next)
  }

  async function persistOrder(order) {
    try {
      const data = await reorderSuiteCases(id, order.map((c) => c.id))
      setCases(data.cases) // server is the source of truth for order
    } catch (err) {
      window.alert(err.message)
      load() // re-sync from the server if the save failed
    }
  }

  if (loading) return <div className="container"><div className="empty">Loading…</div></div>
  if (error) return <div className="container"><div className="empty">Error: {error}</div></div>
  if (!suite) return null

  const existingIds = new Set(cases.map((c) => c.id))

  return (
    <div className="container">
      <Link to="/test-suites" className="back-link">← Test Suites</Link>

      <div className="page-head">
        <div>
          <h2>{suite.name}</h2>
          <div className="suite-meta">
            <span className="muted">Feature: {suite.feature}</span>
            <StatusPill status={suite.status} />
          </div>
        </div>
        <div className="head-actions">
          <button className="btn" onClick={() => setEditing(true)}>Edit</button>
          <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className="toolbar">
        <span className="muted grow">{cases.length} case{cases.length === 1 ? '' : 's'} · drag or use ↑↓ to reorder</span>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Add cases</button>
      </div>

      <div className="card">
        {cases.length === 0 ? (
          <div className="empty">No cases in this suite yet. Add some to get started.</div>
        ) : (
          <ul className="case-list">
            {cases.map((c, i) => (
              <li
                key={c.id}
                className={`case-row${dragIndex === i ? ' dragging' : ''}`}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => onDragOver(e, i)}
                onDragEnd={onDragEnd}
              >
                <span className="drag-handle" aria-hidden="true">⠿</span>
                <span className="case-order">{i + 1}</span>
                <span className="case-title">{c.title}</span>
                <SeverityBadge severity={c.severity} />
                <StatusPill status={c.status} />
                <span className="move-buttons">
                  <button
                    className="btn btn-sm"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={`Move ${c.title} up`}
                  >
                    ↑
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => move(i, 1)}
                    disabled={i === cases.length - 1}
                    aria-label={`Move ${c.title} down`}
                  >
                    ↓
                  </button>
                </span>
                <button
                  className="btn btn-sm remove-case"
                  onClick={() => handleRemove(c.id)}
                  aria-label={`Remove ${c.title}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <SuiteForm initial={suite} onSave={handleEdit} onClose={() => setEditing(false)} />
      )}
      {adding && (
        <AddCaseModal existingIds={existingIds} onAdd={handleAdd} onClose={() => setAdding(false)} />
      )}
    </div>
  )
}

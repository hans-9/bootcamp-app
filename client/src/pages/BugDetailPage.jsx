import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getBug, updateBug, deleteBug, changeBugStatus, addBugComment } from '../api.js'
import SeverityBadge from '../components/SeverityBadge.jsx'
import PriorityBadge from '../components/PriorityBadge.jsx'
import StatusPill from '../components/StatusPill.jsx'
import BugForm from '../components/BugForm.jsx'

// Allowed next statuses — mirrors the server's transition rules so the dropdown
// only offers moves the backend will accept.
const TRANSITIONS = {
  open: ['in-progress', 'closed'],
  'in-progress': ['resolved', 'closed'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
  reopened: ['in-progress', 'closed'],
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export default function BugDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [bug, setBug] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)

  const [nextStatus, setNextStatus] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setBug(await getBug(id))
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
    setBug(await updateBug(id, payload))
    setEditing(false)
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${bug.title}"? This cannot be undone.`)) return
    try {
      await deleteBug(id)
      navigate('/bugs')
    } catch (err) {
      window.alert(err.message)
    }
  }

  async function applyStatus() {
    if (!nextStatus) return
    setBusy(true)
    try {
      setBug(await changeBugStatus(id, nextStatus, statusMessage.trim(), bug.updated_at))
      setNextStatus('')
      setStatusMessage('')
    } catch (err) {
      window.alert(err.message)
      load() // re-sync so the dropdown reflects the current server state
    } finally {
      setBusy(false)
    }
  }

  async function postComment() {
    if (!comment.trim()) return
    setBusy(true)
    try {
      const data = await addBugComment(id, comment.trim())
      setBug((b) => ({ ...b, activity: data.activity }))
      setComment('')
    } catch (err) {
      window.alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="container"><div className="empty">Loading…</div></div>
  if (error) return <div className="container"><div className="empty">Error: {error}</div></div>
  if (!bug) return null

  const nextOptions = TRANSITIONS[bug.status] ?? []

  return (
    <div className="container">
      <Link to="/bugs" className="back-link">← Bugs</Link>

      <div className="page-head">
        <div>
          <h2>{bug.title}</h2>
          <div className="suite-meta">
            <StatusPill status={bug.status} />
            <SeverityBadge severity={bug.severity} />
            <PriorityBadge priority={bug.priority} />
          </div>
        </div>
        <div className="head-actions">
          <button className="btn" onClick={() => setEditing(true)}>Edit</button>
          <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className="bug-grid">
        <div className="card bug-main">
          {bug.description && <Field label="Description">{bug.description}</Field>}
          <Field label="Steps to reproduce">
            <ol className="bug-steps">
              {bug.steps_to_reproduce.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </Field>
          <div style={{ display: 'flex', gap: 24 }}>
            <Field label="Expected">{bug.expected || <span className="muted">—</span>}</Field>
            <Field label="Actual">{bug.actual || <span className="muted">—</span>}</Field>
          </div>
          <Field label="Environment">{bug.environment || <span className="muted">—</span>}</Field>
          {bug.github_issue_url && (
            <Field label="GitHub Issue">
              <a href={bug.github_issue_url} target="_blank" rel="noreferrer">{bug.github_issue_url}</a>
            </Field>
          )}
        </div>

        <div className="card bug-side">
          <div className="side-block">
            <label>Change status</label>
            {nextOptions.length === 0 ? (
              <p className="muted">No transitions available from “{bug.status}”.</p>
            ) : (
              <>
                <select aria-label="Change status" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} style={{ width: '100%' }}>
                  <option value="">Select new status…</option>
                  {nextOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <textarea
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  rows={2}
                  placeholder="Optional note for the timeline"
                  aria-label="Status change note"
                  style={{ marginTop: 8 }}
                />
                <button className="btn btn-primary" onClick={applyStatus} disabled={busy || !nextStatus} style={{ marginTop: 8 }}>
                  Apply
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <h3 className="timeline-head">Activity</h3>
      <div className="card">
        <div className="comment-box">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Add a comment…"
            aria-label="Add a comment"
          />
          <button className="btn" onClick={postComment} disabled={busy || !comment.trim()}>Comment</button>
        </div>

        {bug.activity.length === 0 ? (
          <div className="empty">No activity yet. Comment or change the status to start the trail.</div>
        ) : (
          <ul className="timeline">
            {bug.activity.map((a) => (
              <li key={a.id} className="timeline-item">
                <span className={`timeline-dot ${a.action}`} />
                <div className="timeline-body">
                  {a.action === 'status_change' ? (
                    <span>Status changed <StatusPill status={a.old_value} /> → <StatusPill status={a.new_value} /></span>
                  ) : (
                    <span className="timeline-comment">{a.message}</span>
                  )}
                  {a.action === 'status_change' && a.message && (
                    <div className="muted timeline-note">{a.message}</div>
                  )}
                  <div className="muted timeline-time">{formatDateTime(a.created_at)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && <BugForm initial={bug} onSave={handleEdit} onClose={() => setEditing(false)} />}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="bug-field">
      <label>{label}</label>
      <div>{children}</div>
    </div>
  )
}

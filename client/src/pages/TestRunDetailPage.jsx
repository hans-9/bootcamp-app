import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getRun, updateRunResult, createReport, listReports } from '../api.js'
import StatusPill from '../components/StatusPill.jsx'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const RESULT_LABELS = { passed: '✓ Pass', failed: '✗ Fail', skipped: '— Skip' }
const RESULT_COLORS = {
  passed: 'var(--st-passed)',
  failed: 'var(--st-failed)',
  skipped: 'var(--st-skipped)',
}

export default function TestRunDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [run, setRun] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notes, setNotes] = useState({})
  const [saving, setSaving] = useState(new Set())
  const [generating, setGenerating] = useState(false)
  const savedNotes = useRef({})

  useEffect(() => {
    setLoading(true)
    setError(null)
    getRun(id)
      .then((data) => {
        setRun(data)
        const initial = {}
        data.results.forEach((r) => { initial[r.id] = r.notes })
        setNotes(initial)
        savedNotes.current = initial
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const hasUnsavedNotes = Object.keys(notes).some((k) => notes[k] !== savedNotes.current[k])

  useEffect(() => {
    if (!hasUnsavedNotes) return
    const handler = (e) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsavedNotes])

  async function handleSetResult(resultId, result) {
    setSaving((prev) => new Set(prev).add(resultId))
    try {
      const updated = await updateRunResult(id, resultId, {
        result,
        notes: notes[resultId] ?? '',
      })
      setRun(updated)
      const next = {}
      updated.results.forEach((r) => { next[r.id] = r.notes })
      setNotes(next)
      savedNotes.current = next
    } catch (err) {
      window.alert(err.message)
    } finally {
      setSaving((prev) => {
        const next = new Set(prev)
        next.delete(resultId)
        return next
      })
    }
  }

  async function handleGenerateReport() {
    setGenerating(true)
    try {
      const warnings = []
      const pending = run.results.filter((r) => r.result === null).length
      if (pending > 0)
        warnings.push(`${pending} test case(s) are still pending and will be recorded as not run.`)
      if (hasUnsavedNotes) warnings.push('Unsaved notes on this page will not be included.')
      const existing = (await listReports()).filter((rep) => rep.run_id === Number(id))
      if (existing.length > 0)
        warnings.push(`A report already exists for this run (#${existing[0].id}).`)

      if (warnings.length > 0 && !window.confirm(`${warnings.join('\n\n')}\n\nGenerate a new report anyway?`)) {
        setGenerating(false)
        return
      }

      const report = await createReport(Number(id))
      navigate(`/reports/${report.id}`)
    } catch (err) {
      window.alert(err.message)
      setGenerating(false)
    }
  }

  if (loading) return <div className="container"><div className="empty">Loading…</div></div>
  if (error) return <div className="container"><div className="empty">Error: {error}</div></div>
  if (!run) return null

  const isClosed = run.status !== 'running'
  const total = run.results.length
  const done = run.results.filter((r) => r.result !== null).length

  return (
    <div className="container">
      <Link to="/test-runs" className="back-link">← Test Runs</Link>

      <div className="page-head">
        <div>
          <h2>{run.suite_name}</h2>
          <div className="suite-meta">
            <StatusPill status={run.status} />
            <span className="muted">Started {formatDate(run.start_time)}</span>
            {run.end_time && <span className="muted">· Ended {formatDate(run.end_time)}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <span style={{ color: 'var(--st-passed)', fontWeight: 600 }}>{run.pass_count} passed</span>
          <span style={{ color: 'var(--st-failed)', fontWeight: 600 }}>{run.fail_count} failed</span>
          <span style={{ color: 'var(--st-skipped)', fontWeight: 600 }}>{run.skip_count} skipped</span>
          <span className="muted">{done}/{total} done</span>
          <button className="btn btn-primary" onClick={handleGenerateReport} disabled={generating}>
            {generating ? 'Generating…' : 'Generate report'}
          </button>
        </div>
      </div>

      <div className="card">
        {isClosed && (
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--muted)', fontSize: 13 }}>
            This run is complete — results are locked.
          </div>
        )}
        {run.results.length === 0 ? (
          <div className="empty">No test cases in this run.</div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {run.results.map((r, i) => {
              const isSaving = saving.has(r.id)
              const isDisabled = isSaving || isClosed
              const resultColor = r.result ? RESULT_COLORS[r.result] : undefined
              return (
                <li
                  key={r.id}
                  style={{
                    padding: '14px 16px',
                    borderBottom: i < run.results.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span
                      style={{
                        minWidth: 22,
                        color: 'var(--muted)',
                        fontSize: 12,
                        paddingTop: 2,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                        <span style={{ fontWeight: 500 }}>{r.case_title}</span>
                        {r.result && (
                          <span
                            style={{
                              color: resultColor,
                              fontSize: 12,
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {r.result}
                          </span>
                        )}
                        {r.issue_url && (
                          <a
                            href={r.issue_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 12, color: 'var(--accent)' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            🔗 GitHub issue
                          </a>
                        )}
                      </div>

                      <textarea
                        placeholder="Notes (optional)"
                        aria-label={`Notes for ${r.case_title}`}
                        value={notes[r.id] ?? ''}
                        onChange={(e) =>
                          setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))
                        }
                        rows={2}
                        disabled={isDisabled}
                        style={{
                          width: '100%',
                          marginBottom: 8,
                          resize: 'vertical',
                          fontFamily: 'inherit',
                          fontSize: 13,
                          padding: '6px 8px',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          background: 'var(--bg)',
                          color: 'var(--text)',
                        }}
                      />

                      <div style={{ display: 'flex', gap: 6 }}>
                        {['passed', 'failed', 'skipped'].map((res) => (
                          <button
                            key={res}
                            className="btn btn-sm"
                            disabled={isDisabled}
                            onClick={() => handleSetResult(r.id, res)}
                            style={{
                              color: r.result === res ? RESULT_COLORS[res] : undefined,
                              fontWeight: r.result === res ? 700 : undefined,
                              borderColor: r.result === res ? RESULT_COLORS[res] : undefined,
                            }}
                          >
                            {RESULT_LABELS[res]}
                          </button>
                        ))}
                        {isSaving && <span className="muted" style={{ fontSize: 12, alignSelf: 'center' }}>Saving…</span>}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

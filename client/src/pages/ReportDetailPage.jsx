import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getReport, reportHtmlExportUrl } from '../api.js'

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const RESULT_COLORS = {
  passed: 'var(--st-passed)',
  failed: 'var(--st-failed)',
  skipped: 'var(--st-skipped)',
}

const isHttpUrl = (u) => /^https?:\/\//i.test(u || '')

export default function ReportDetailPage() {
  const { id } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getReport(id)
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="container"><div className="empty">Loading…</div></div>
  if (error)
    return (
      <div className="container">
        <Link to="/reports" className="back-link">← Reports</Link>
        <div className="empty">Error: {error}</div>
      </div>
    )
  if (!report) return null

  const decided = report.passed_count + report.failed_count
  const rate = decided === 0 ? null : Math.round((report.passed_count / decided) * 100)
  const pending = report.total_count - report.passed_count - report.failed_count - report.skipped_count

  const stats = [
    { label: 'Total', value: report.total_count },
    { label: 'Passed', value: report.passed_count, color: 'var(--st-passed)' },
    { label: 'Failed', value: report.failed_count, color: 'var(--st-failed)' },
    { label: 'Skipped', value: report.skipped_count, color: 'var(--st-skipped)' },
    ...(pending > 0 ? [{ label: 'Pending', value: pending }] : []),
    { label: 'Pass rate (of decided)', value: rate == null ? '—' : `${rate}%` },
  ]

  return (
    <div className="container">
      <Link to="/reports" className="back-link no-print">← Reports</Link>

      <div className="page-head">
        <div>
          <h2>{report.suite_name}</h2>
          <div className="suite-meta muted" style={{ fontSize: 13 }}>
            <span>Snapshot of run #{report.run_id}</span>
            <span> · Started {formatDateTime(report.run_date)}</span>
            <span> · Generated {formatDateTime(report.generated_at)}</span>
          </div>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: 8 }}>
          <a className="btn" href={reportHtmlExportUrl(report.id)}>Download HTML</a>
          <a className="btn btn-primary" href={`${reportHtmlExportUrl(report.id)}?view=print`} target="_blank" rel="noreferrer">Print / Save as PDF</a>
        </div>
      </div>

      <div className="report-summary">
        {stats.map((s) => (
          <div key={s.label} className="card report-stat">
            <div className="report-stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="report-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        {report.results.length === 0 ? (
          <div className="empty">No results in this run.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 32 }}>#</th>
                <th>Test case</th>
                <th>Result</th>
                <th>Duration</th>
                <th>Issue</th>
              </tr>
            </thead>
            <tbody>
              {report.results.map((r, i) => (
                <tr key={i}>
                  <td className="muted">{i + 1}</td>
                  <td className="title-cell">
                    {r.case_title}
                    {r.notes && <div className="muted" style={{ fontWeight: 400, fontSize: 13, marginTop: 4 }}>{r.notes}</div>}
                  </td>
                  <td>
                    <span style={{ color: r.result ? RESULT_COLORS[r.result] : 'var(--muted)', fontWeight: 600, textTransform: 'capitalize' }}>
                      {r.result ?? 'pending'}
                    </span>
                  </td>
                  <td className="muted">{r.duration_ms == null ? '—' : `${r.duration_ms} ms`}</td>
                  <td>
                    {isHttpUrl(r.issue_url)
                      ? <a href={r.issue_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>issue</a>
                      : <span className="muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

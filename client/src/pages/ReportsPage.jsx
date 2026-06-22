import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listReports } from '../api.js'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function passRate(r) {
  const decided = r.passed_count + r.failed_count
  if (decided === 0) return '—'
  return `${Math.round((r.passed_count / decided) * 100)}%`
}

export default function ReportsPage() {
  const navigate = useNavigate()
  const [reports, setReports] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    listReports()
      .then(setReports)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const items = reports ?? []

  return (
    <div className="container">
      <div className="page-head">
        <h2>Reports</h2>
      </div>

      <div className="card">
        {loading && <div className="empty">Loading…</div>}
        {error && !loading && <div className="empty">Error: {error}</div>}
        {!loading && !error && items.length === 0 && (
          <div className="empty">No reports yet. Generate one from a test run.</div>
        )}
        {!loading && !error && items.length > 0 && (
          <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Suite</th>
                <th>Total</th>
                <th>Pass</th>
                <th>Fail</th>
                <th>Skip</th>
                <th>Pass rate</th>
                <th>Generated</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr
                  key={r.id}
                  className="clickable"
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/reports/${r.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(`/reports/${r.id}`)
                    }
                  }}
                >
                  <td className="title-cell">{r.suite_name}</td>
                  <td>{r.total_count}</td>
                  <td className="status-count" style={{ color: 'var(--st-passed)' }}>{r.passed_count}</td>
                  <td className="status-count" style={{ color: r.failed_count > 0 ? 'var(--st-failed)' : undefined }}>{r.failed_count}</td>
                  <td className="status-count" style={{ color: 'var(--st-skipped)' }}>{r.skipped_count}</td>
                  <td>{passRate(r)}</td>
                  <td className="muted">{formatDate(r.generated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listRuns } from '../api.js'
import StatusPill from '../components/StatusPill.jsx'
import { navProps } from '../nav.js'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TestRunsPage() {
  const navigate = useNavigate()
  const [runs, setRuns] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    listRuns()
      .then(setRuns)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const items = runs ?? []

  return (
    <div className="container">
      <div className="page-head">
        <h2>Test Runs</h2>
      </div>

      <div className="card">
        {loading && <div className="empty">Loading…</div>}
        {error && !loading && <div className="empty">Error: {error}</div>}
        {!loading && !error && items.length === 0 && (
          <div className="empty">No test runs yet. Start one from a suite.</div>
        )}
        {!loading && !error && items.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Suite</th>
                <th>Status</th>
                <th>Pass</th>
                <th>Fail</th>
                <th>Skip</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr
                  key={r.id}
                  className="clickable"
                  aria-label={`Open test run for ${r.suite_name}`}
                  {...navProps(navigate, `/test-runs/${r.id}`)}
                >
                  <td className="title-cell">{r.suite_name}</td>
                  <td><StatusPill status={r.status} /></td>
                  <td style={{ color: 'var(--st-passed)', fontWeight: 500 }}>{r.pass_count}</td>
                  <td style={{ color: r.fail_count > 0 ? 'var(--st-failed)' : undefined, fontWeight: 500 }}>{r.fail_count}</td>
                  <td style={{ color: 'var(--st-skipped)', fontWeight: 500 }}>{r.skip_count}</td>
                  <td className="muted">{formatDate(r.start_time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

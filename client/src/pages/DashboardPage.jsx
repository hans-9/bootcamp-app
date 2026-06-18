import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardMetrics } from '../api.js'
import StatusPill from '../components/StatusPill.jsx'

const REFRESH_MS = 30000

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function relativeTime(iso) {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

function formatDuration(ms) {
  if (ms == null) return '—'
  const totalSeconds = Math.round(ms / 1000)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs}s`
}

function describeActivity(a) {
  if (a.action === 'status_change') return `bug #${a.bug_id} marked ${a.new_value}`
  if (a.action === 'comment') return `bug #${a.bug_id} got a new comment`
  return `bug #${a.bug_id} ${a.action}`
}

function navProps(navigate, to) {
  return {
    role: 'link',
    tabIndex: 0,
    onClick: () => navigate(to),
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        navigate(to)
      }
    },
  }
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [stale, setStale] = useState(false)
  const initialLoad = useRef(true)

  useEffect(() => {
    let cancelled = false

    const load = () => {
      getDashboardMetrics()
        .then((d) => {
          if (cancelled) return
          setData(d)
          setError(null)
          setStale(false)
          setUpdatedAt(new Date().toISOString())
        })
        .catch((err) => {
          if (cancelled) return
          if (initialLoad.current) setError(err.message)
          else setStale(true)
        })
        .finally(() => {
          if (cancelled) return
          setLoading(false)
          initialLoad.current = false
        })
    }

    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  if (loading) return <DashboardSkeleton />

  if (error) {
    return (
      <div className="container">
        <div className="page-head">
          <h2>Dashboard</h2>
        </div>
        <div className="card">
          <div className="empty">Couldn’t load the dashboard: {error}</div>
        </div>
      </div>
    )
  }

  const { metrics, recentRuns, recentActivity } = data
  const isEmpty =
    metrics.totalCases === 0 && recentRuns.length === 0 && recentActivity.length === 0

  if (isEmpty) {
    return (
      <div className="container">
        <div className="page-head">
          <h2>Dashboard</h2>
        </div>
        <div className="card">
          <div className="empty">
            Nothing to show yet. Add test cases, run a suite, or file a bug to get started.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="page-head">
        <h2>Dashboard</h2>
        {stale ? (
          <span className="stale-badge">Refresh failed — retrying every 30s</span>
        ) : (
          <span className="muted">
            Updated {updatedAt ? relativeTime(updatedAt) : 'just now'} · refreshes every 30s
          </span>
        )}
      </div>

      <div className="metric-grid">
        <MetricCard label="Total test cases" value={metrics.totalCases} />
        <MetricCard
          label="Pass rate"
          value={metrics.passRate == null ? '—' : `${metrics.passRate}%`}
          hint={metrics.passRate == null ? 'Run a test case to start tracking' : 'of passed + failed cases'}
          empty={metrics.passRate == null}
        />
        <MetricCard label="Open bugs" value={metrics.openBugs} />
        <MetricCard
          label="Avg run duration"
          value={formatDuration(metrics.avgDurationMs)}
          hint={metrics.avgDurationMs == null ? 'Finish a test run to see timing' : undefined}
          empty={metrics.avgDurationMs == null}
        />
      </div>

      <div className="dash-columns">
        <div className="card dash-panel">
          <div className="dash-panel-head">Recent test runs</div>
          {recentRuns.length === 0 ? (
            <div className="empty">
              No test runs yet. Start a test run to track pass and fail history here.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Suite</th>
                  <th>Status</th>
                  <th>Pass</th>
                  <th>Fail</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((r) => (
                  <tr
                    key={r.id}
                    className="clickable"
                    aria-label={`Open test run for ${r.suite_name}`}
                    {...navProps(navigate, `/test-runs/${r.id}`)}
                  >
                    <td className="title-cell">{r.suite_name}</td>
                    <td><StatusPill status={r.status} /></td>
                    <td style={{ color: 'var(--st-passed)', fontWeight: 500 }}>{r.pass_count}</td>
                    <td style={{ color: r.fail_count > 0 ? 'var(--st-failed)' : undefined, fontWeight: 500 }}>
                      {r.fail_count}
                    </td>
                    <td className="muted">{relativeTime(r.start_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card dash-panel">
          <div className="dash-panel-head">Recent activity</div>
          {recentActivity.length === 0 ? (
            <div className="empty">
              No activity yet. Comment on or change a bug’s status to see it here.
            </div>
          ) : (
            <ul className="activity-feed">
              {recentActivity.map((a) => (
                <li
                  key={a.id}
                  className="activity-item clickable"
                  aria-label={describeActivity(a)}
                  {...navProps(navigate, `/bugs/${a.bug_id}`)}
                >
                  <span className={`timeline-dot ${a.action}`} />
                  <div className="activity-body">
                    <span>{describeActivity(a)}</span>
                    <span className="muted activity-time">{formatDateTime(a.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, hint, empty }) {
  return (
    <div className="card metric-card">
      <div className={empty ? 'metric-value metric-value-empty' : 'metric-value'}>{value}</div>
      <div className="metric-label">{label}</div>
      {hint && <div className="metric-hint">{hint}</div>}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="container">
      <div className="page-head">
        <h2>Dashboard</h2>
      </div>
      <div className="metric-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card metric-card">
            <div className="skeleton skeleton-value" />
            <div className="skeleton skeleton-label" />
          </div>
        ))}
      </div>
      <div className="dash-columns">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card dash-panel">
            <div className="dash-panel-head">
              <div className="skeleton skeleton-label" />
            </div>
            <div style={{ padding: '14px' }}>
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="skeleton skeleton-row" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

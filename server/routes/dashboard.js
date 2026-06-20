import db, { STATUSES } from '../db.js'

const ok = (res, data) => res.json({ success: true, data, error: null })

// Monday 00:00 UTC of the week containing `date`, as a Date.
function weekStart(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - day)
  return d
}

export function handleGetMetrics(req, res) {
  const { totalCases } = db.prepare('SELECT COUNT(*) AS totalCases FROM test_cases').get()

  const { passed, failed } = db
    .prepare(
      `SELECT
         COALESCE(SUM(status = 'passed'), 0) AS passed,
         COALESCE(SUM(status = 'failed'), 0) AS failed
       FROM test_cases`,
    )
    .get()
  const decided = passed + failed
  const passRate = decided === 0 ? null : Math.round((passed / decided) * 100)

  const { openBugs } = db
    .prepare(
      `SELECT COUNT(*) AS openBugs FROM bugs WHERE status NOT IN ('resolved', 'closed')`,
    )
    .get()

  const { avgDurationMs } = db
    .prepare(
      `SELECT AVG((julianday(end_time) - julianday(start_time)) * 86400000) AS avgDurationMs
       FROM test_runs_v2
       WHERE end_time IS NOT NULL`,
    )
    .get()

  const recentRuns = db
    .prepare(
      `SELECT r.id, r.status, r.pass_count, r.fail_count, r.skip_count, r.start_time, r.end_time,
              s.name AS suite_name
       FROM test_runs_v2 r
       JOIN test_suites s ON s.id = r.suite_id
       ORDER BY r.start_time DESC, r.id DESC
       LIMIT 10`,
    )
    .all()

  const recentActivity = db
    .prepare(
      `SELECT a.id, a.bug_id, a.action, a.old_value, a.new_value, a.message, a.created_at,
              b.title AS bug_title
       FROM bug_activity a
       JOIN bugs b ON b.id = a.bug_id
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT 10`,
    )
    .all()

  ok(res, {
    metrics: {
      totalCases,
      passRate,
      openBugs,
      avgDurationMs: avgDurationMs == null ? null : Math.round(avgDurationMs),
    },
    recentRuns,
    recentActivity,
  })
}

export function handleGetTrends(req, res) {
  const passRateTrend = db
    .prepare(
      `SELECT id, start_time, pass_count, fail_count, skip_count
       FROM test_runs_v2
       WHERE end_time IS NOT NULL
       ORDER BY start_time DESC, id DESC
       LIMIT 10`,
    )
    .all()
    .reverse()
    .map((r) => {
      const executed = r.pass_count + r.fail_count + r.skip_count
      // A finished run with no executed cases has an undefined pass rate, not 0% —
      // return null so the chart gaps it instead of plotting a false zero.
      return {
        runId: r.id,
        date: r.start_time,
        passRate: executed === 0 ? null : Math.round((r.pass_count / executed) * 100),
      }
    })

  const buckets = []
  const byKey = new Map()
  const thisWeek = weekStart(new Date())
  for (let i = 7; i >= 0; i--) {
    const start = new Date(thisWeek)
    start.setUTCDate(start.getUTCDate() - i * 7)
    const key = start.toISOString().slice(0, 10)
    const bucket = { weekStart: key, opened: 0, closed: 0 }
    buckets.push(bucket)
    byKey.set(key, bucket)
  }
  const earliest = buckets[0].weekStart

  const bucketKeyOf = (iso) => weekStart(new Date(iso)).toISOString().slice(0, 10)

  db.prepare(`SELECT created_at FROM bugs WHERE created_at >= ?`)
    .all(earliest)
    .forEach((b) => {
      const bucket = byKey.get(bucketKeyOf(b.created_at))
      if (bucket) bucket.opened += 1
    })

  // A reopen counts as "opened" too, so a close→reopen→close cycle stays balanced
  // against the close transitions counted below.
  db.prepare(
    `SELECT created_at FROM bug_activity
     WHERE action = 'status_change' AND new_value = 'reopened' AND created_at >= ?`,
  )
    .all(earliest)
    .forEach((a) => {
      const bucket = byKey.get(bucketKeyOf(a.created_at))
      if (bucket) bucket.opened += 1
    })

  // A "close" is a transition INTO a terminal state, so a resolve→close pair counts once.
  db.prepare(
    `SELECT created_at FROM bug_activity
     WHERE action = 'status_change'
       AND new_value IN ('resolved', 'closed')
       AND (old_value IS NULL OR old_value NOT IN ('resolved', 'closed'))
       AND created_at >= ?`,
  )
    .all(earliest)
    .forEach((a) => {
      const bucket = byKey.get(bucketKeyOf(a.created_at))
      if (bucket) bucket.closed += 1
    })

  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]))
  db.prepare(`SELECT status, COUNT(*) AS count FROM test_cases GROUP BY status`)
    .all()
    .forEach((row) => {
      if (row.status in counts) counts[row.status] = row.count
    })
  const coverageByStatus = STATUSES.map((status) => ({ status, count: counts[status] }))

  ok(res, { passRateTrend, bugsPerWeek: buckets, coverageByStatus })
}

import db from '../db.js'

const ok = (res, data) => res.json({ success: true, data, error: null })

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

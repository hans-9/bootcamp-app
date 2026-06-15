import db, { RESULT_STATUSES } from './db.js'

const ok = (res, data) => res.json({ success: true, data, error: null })
const fail = (res, status, message) =>
  res.status(status).json({ success: false, data: null, error: message })

function getRunWithResults(runId) {
  const run = db
    .prepare(
      `SELECT r.*, s.name AS suite_name
       FROM test_runs_v2 r
       JOIN test_suites s ON s.id = r.suite_id
       WHERE r.id = ?`,
    )
    .get(runId)
  if (!run) return null
  const results = db
    .prepare('SELECT * FROM test_run_results WHERE run_id = ? ORDER BY sort_order, id')
    .all(runId)
  return { ...run, results }
}

function recomputeRunCounts(runId) {
  const counts = db
    .prepare(
      `SELECT
         COALESCE(SUM(result = 'passed'),  0) AS pass_count,
         COALESCE(SUM(result = 'failed'),  0) AS fail_count,
         COALESCE(SUM(result = 'skipped'), 0) AS skip_count,
         COALESCE(SUM(result IS NULL),     0) AS pending_count
       FROM test_run_results WHERE run_id = ?`,
    )
    .get(runId)

  const allDone = counts.pending_count === 0
  const status = allDone ? (counts.fail_count > 0 ? 'failed' : 'passed') : 'running'
  const endTime = allDone ? new Date().toISOString() : null

  db.prepare(
    `UPDATE test_runs_v2
     SET pass_count = ?, fail_count = ?, skip_count = ?, status = ?, end_time = ?
     WHERE id = ?`,
  ).run(counts.pass_count, counts.fail_count, counts.skip_count, status, endTime, runId)
}

const GITHUB_REPO = 'hans-9/bootcamp-app'

async function createGithubIssue(title, body) {
  const token = process.env.GITHUB_MCP_TOKEN
  if (!token) return null
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, body }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.html_url
  } catch {
    return null
  }
}

export function handleListRuns(req, res) {
  const rows = db
    .prepare(
      `SELECT r.*, s.name AS suite_name
       FROM test_runs_v2 r
       JOIN test_suites s ON s.id = r.suite_id
       ORDER BY r.start_time DESC`,
    )
    .all()
  ok(res, rows)
}

export function handleCreateRun(req, res) {
  const suiteId = Number(req.body.suite_id)
  if (!Number.isInteger(suiteId) || suiteId <= 0)
    return fail(res, 400, 'A numeric suite_id is required.')

  const suite = db.prepare('SELECT id FROM test_suites WHERE id = ?').get(suiteId)
  if (!suite) return fail(res, 404, 'Suite not found.')

  const cases = db
    .prepare(
      `SELECT tc.id, tc.title, sc.sort_order
       FROM suite_cases sc
       JOIN test_cases tc ON tc.id = sc.case_id
       WHERE sc.suite_id = ?
       ORDER BY sc.sort_order, sc.id`,
    )
    .all(suiteId)
  if (cases.length === 0) return fail(res, 400, 'Suite has no test cases.')

  const now = new Date().toISOString()
  const createdBy = String(req.body.created_by ?? '').trim()

  const runId = db.transaction(() => {
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO test_runs_v2 (suite_id, status, pass_count, fail_count, skip_count, start_time, created_by)
         VALUES (?, 'running', 0, 0, 0, ?, ?)`,
      )
      .run(suiteId, now, createdBy)

    const insertResult = db.prepare(
      'INSERT INTO test_run_results (run_id, test_case_id, case_title, sort_order) VALUES (?, ?, ?, ?)',
    )
    cases.forEach((c, i) => insertResult.run(lastInsertRowid, c.id, c.title, i))
    return lastInsertRowid
  })()

  res.status(201).json({ success: true, data: getRunWithResults(runId), error: null })
}

export function handleGetRun(req, res) {
  const run = getRunWithResults(req.params.id)
  if (!run) return fail(res, 404, 'Run not found.')
  ok(res, run)
}

export async function handleUpdateResult(req, res) {
  const { id, resultId } = req.params

  const result = String(req.body.result ?? '').trim()
  if (!RESULT_STATUSES.includes(result))
    return fail(res, 400, `result must be one of: ${RESULT_STATUSES.join(', ')}.`)

  const notes = String(req.body.notes ?? '').trim()
  const rawDuration = req.body.duration_ms
  const duration_ms = rawDuration != null ? Number(rawDuration) : null

  const run = db.prepare('SELECT id FROM test_runs_v2 WHERE id = ?').get(id)
  if (!run) return fail(res, 404, 'Run not found.')

  const existing = db
    .prepare('SELECT * FROM test_run_results WHERE id = ? AND run_id = ?')
    .get(resultId, id)
  if (!existing) return fail(res, 404, 'Result not found.')

  const now = new Date().toISOString()

  let issueUrl = existing.issue_url
  if (result === 'failed' && !issueUrl) {
    issueUrl = await createGithubIssue(
      `Test failed: ${existing.case_title}`,
      notes || 'No failure notes provided.',
    )
  }

  db.prepare(
    `UPDATE test_run_results
     SET result = ?, notes = ?, duration_ms = ?, failed_at = ?, issue_url = ?
     WHERE id = ?`,
  ).run(result, notes, duration_ms, result === 'failed' ? now : null, issueUrl, resultId)

  recomputeRunCounts(Number(id))
  ok(res, getRunWithResults(Number(id)))
}

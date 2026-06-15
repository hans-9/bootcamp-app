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

async function githubFetch(path, method, body) {
  const token = process.env.GITHUB_MCP_TOKEN
  if (!token) return null
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function createGithubIssue(title, body) {
  const data = await githubFetch('/issues', 'POST', { title, body })
  return data?.html_url ?? null
}

async function addGithubIssueComment(issueUrl, body) {
  const match = issueUrl.match(/\/issues\/(\d+)$/)
  if (!match) return
  await githubFetch(`/issues/${match[1]}/comments`, 'POST', { body })
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
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return fail(res, 400, 'Invalid run id.')
  const run = getRunWithResults(id)
  if (!run) return fail(res, 404, 'Run not found.')
  ok(res, run)
}

export async function handleUpdateResult(req, res) {
  const id = Number(req.params.id)
  const resultId = Number(req.params.resultId)
  if (!Number.isInteger(id) || id <= 0) return fail(res, 400, 'Invalid run id.')
  if (!Number.isInteger(resultId) || resultId <= 0) return fail(res, 400, 'Invalid result id.')

  const result = String(req.body.result ?? '').trim()
  if (!RESULT_STATUSES.includes(result))
    return fail(res, 400, `result must be one of: ${RESULT_STATUSES.join(', ')}.`)

  const notes = String(req.body.notes ?? '').trim()

  const rawDuration = req.body.duration_ms
  let duration_ms = null
  if (rawDuration != null) {
    duration_ms = Number(rawDuration)
    if (!Number.isInteger(duration_ms) || duration_ms < 0)
      return fail(res, 400, 'duration_ms must be a non-negative integer.')
  }

  const run = db.prepare('SELECT * FROM test_runs_v2 WHERE id = ?').get(id)
  if (!run) return fail(res, 404, 'Run not found.')
  if (run.status !== 'running') return fail(res, 409, 'Run is already closed.')

  const existing = db
    .prepare('SELECT * FROM test_run_results WHERE id = ? AND run_id = ?')
    .get(resultId, id)
  if (!existing) return fail(res, 404, 'Result not found.')

  const now = new Date().toISOString()

  // Write to DB first — GitHub call fires only after the record is safe.
  db.prepare(
    `UPDATE test_run_results
     SET result = ?, notes = ?, duration_ms = ?, failed_at = ?
     WHERE id = ?`,
  ).run(result, notes, duration_ms, result === 'failed' ? now : null, resultId)

  recomputeRunCounts(id)

  if (result === 'failed') {
    if (!existing.issue_url) {
      const issueUrl = await createGithubIssue(
        `Test failed: ${existing.case_title}`,
        notes || 'No failure notes provided.',
      )
      if (issueUrl) {
        db.prepare('UPDATE test_run_results SET issue_url = ? WHERE id = ?').run(issueUrl, resultId)
      }
    } else {
      await addGithubIssueComment(
        existing.issue_url,
        `**Re-failed:** ${notes || 'No failure notes provided.'}`,
      )
    }
  }

  ok(res, getRunWithResults(id))
}

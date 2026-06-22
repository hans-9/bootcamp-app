// Records one test-run result row, the way a targeted re-run of a single test
// would. Each call opens a fresh single-case run so the outcome lands in history
// with a new timestamp. The PostToolUse hook matches this command and recomputes
// the flake leaderboard afterward.
//
//   node server/scripts/record-result.js <caseId> <passed|failed|skipped> [notes]

import db, { RESULT_STATUSES } from '../db.js'

const [caseIdArg, result, ...noteParts] = process.argv.slice(2)
const caseId = Number(caseIdArg)
const notes = noteParts.join(' ')

if (!Number.isInteger(caseId) || caseId <= 0) {
  console.error('Usage: record-result.js <caseId> <passed|failed|skipped> [notes]')
  process.exit(1)
}
if (!RESULT_STATUSES.includes(result)) {
  console.error(`result must be one of: ${RESULT_STATUSES.join(', ')}`)
  process.exit(1)
}

const testCase = db.prepare('SELECT id, title FROM test_cases WHERE id = ?').get(caseId)
if (!testCase) {
  console.error(`No test case with id ${caseId}`)
  process.exit(1)
}

const suite = db.prepare('SELECT id FROM test_suites ORDER BY id LIMIT 1').get()
if (!suite) {
  console.error('No suite to attach the run to.')
  process.exit(1)
}

const now = new Date().toISOString()
const status = result === 'failed' ? 'failed' : 'passed'

const { runId, resultId } = db.transaction(() => {
  const { lastInsertRowid: runId } = db
    .prepare(
      `INSERT INTO test_runs_v2 (suite_id, status, pass_count, fail_count, skip_count, start_time, end_time, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'cli')`,
    )
    .run(
      suite.id,
      status,
      result === 'passed' ? 1 : 0,
      result === 'failed' ? 1 : 0,
      result === 'skipped' ? 1 : 0,
      now,
      now,
    )
  const { lastInsertRowid: resultId } = db
    .prepare(
      `INSERT INTO test_run_results (run_id, test_case_id, case_title, result, notes, failed_at, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
    )
    .run(runId, caseId, testCase.title, result, notes, result === 'failed' ? now : null)
  return { runId, resultId }
})()

console.log(`Recorded ${result} for case ${caseId} ("${testCase.title}") — run ${runId}, result ${resultId}`)

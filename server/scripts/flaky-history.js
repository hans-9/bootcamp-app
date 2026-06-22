// Prints the flaky-test leaderboard enriched with each case's steps and a few
// real failure notes — the input the flake-analyzer subagent reasons over to
// write a root-cause hypothesis. Reads straight from the DB, no server needed.
//
//   node server/scripts/flaky-history.js

import db from '../db.js'
import { rankedFlakes } from '../flakes.js'

const enriched = rankedFlakes().map((s) => {
  const tc = db.prepare('SELECT steps, expected_result, severity FROM test_cases WHERE id = ?').get(s.test_case_id)
  const notes = db
    .prepare(
      `SELECT DISTINCT notes FROM test_run_results
       WHERE test_case_id = ? AND result = 'failed' AND notes <> '' LIMIT 5`,
    )
    .all(s.test_case_id)
    .map((r) => r.notes)
  let steps = []
  try {
    steps = JSON.parse(tc?.steps ?? '[]')
  } catch {
    steps = []
  }
  return {
    test_case_id: s.test_case_id,
    title: s.title,
    fingerprint: s.fingerprint,
    runs: s.runs,
    pass_count: s.pass_count,
    fail_count: s.fail_count,
    fail_ratio: Number(s.fail_ratio.toFixed(2)),
    flip_count: s.flip_count,
    recent_results: s.recent_results,
    severity: tc?.severity ?? null,
    steps,
    expected_result: tc?.expected_result ?? null,
    failure_notes: notes,
  }
})

console.log(JSON.stringify(enriched, null, 2))

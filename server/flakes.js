import db from './db.js'

// A test must have this many recorded (passed/failed) runs before it can be
// called flaky — below this the signal is too noisy to trust.
export const MIN_RUNS = 3
// How many recent outcomes the UI sparkline shows per row.
const RECENT_LIMIT = 12

// Per test case across every run, ordered by the run's start_time. Skips and
// in-progress (NULL) results are excluded — only passed/failed count toward
// flakiness. Groups by test_case_id (results have no FK to test_cases), and
// falls back to the stored case_title when the case was later deleted.
function collectHistories() {
  const rows = db
    .prepare(
      `SELECT rr.test_case_id, rr.result, rr.case_title, r.start_time
       FROM test_run_results rr
       JOIN test_runs_v2 r ON r.id = rr.run_id
       WHERE rr.result IN ('passed', 'failed')
       ORDER BY rr.test_case_id, r.start_time, rr.id`,
    )
    .all()

  const liveTitles = new Map(
    db.prepare('SELECT id, title FROM test_cases').all().map((c) => [c.id, c.title]),
  )

  const byCase = new Map()
  for (const row of rows) {
    if (!byCase.has(row.test_case_id)) {
      byCase.set(row.test_case_id, { test_case_id: row.test_case_id, title: null, outcomes: [] })
    }
    const entry = byCase.get(row.test_case_id)
    entry.outcomes.push(row.result)
    entry.title = liveTitles.get(row.test_case_id) ?? row.case_title
  }
  return byCase
}

function statsFor(entry) {
  const { outcomes } = entry
  const passCount = outcomes.filter((o) => o === 'passed').length
  const failCount = outcomes.filter((o) => o === 'failed').length
  const total = passCount + failCount
  let flips = 0
  for (let i = 1; i < outcomes.length; i++) {
    if (outcomes[i] !== outcomes[i - 1]) flips++
  }
  return {
    test_case_id: entry.test_case_id,
    title: entry.title,
    runs: outcomes.length,
    pass_count: passCount,
    fail_count: failCount,
    // total is only 0 for an entry with no passed/failed rows, which can't reach
    // here today — guard anyway so the metric stays self-protecting.
    fail_ratio: total ? failCount / total : 0,
    flip_count: flips,
    recent_results: outcomes.slice(-RECENT_LIMIT),
    fingerprint: `pass${passCount}-fail${failCount}`,
  }
}

// Flaky = enough runs AND a mixed history (both a pass and a fail). This single
// gate drops single-run tests, never-failing tests, and always-failing tests
// (those are broken, not flaky).
function isFlaky(s) {
  return s.runs >= MIN_RUNS && s.pass_count > 0 && s.fail_count > 0
}

// Stats for every flaky test, ranked: fail ratio DESC (the headline metric),
// then more runs first (more evidence), then test_case_id for a stable order.
export function rankedFlakes() {
  return [...collectHistories().values()]
    .map(statsFor)
    .filter(isFlaky)
    .sort(
      (a, b) =>
        b.fail_ratio - a.fail_ratio || b.runs - a.runs || a.test_case_id - b.test_case_id,
    )
}

// The top-10 leaderboard, each row joined to its cached hypothesis (null when
// the analyzer hasn't written one yet).
export function buildLeaderboard(limit = 10) {
  const hypotheses = new Map(
    db
      .prepare('SELECT test_case_id, hypothesis, generated_at FROM flaky_hypotheses')
      .all()
      .map((h) => [h.test_case_id, h]),
  )
  return rankedFlakes()
    .slice(0, limit)
    .map((s, i) => {
      const h = hypotheses.get(s.test_case_id)
      return {
        rank: i + 1,
        ...s,
        hypothesis: h?.hypothesis ?? null,
        hypothesis_at: h?.generated_at ?? null,
      }
    })
}

// Flakes that qualify now but have not been alerted yet. Detection does NOT
// record them — recording is deferred to recordAlerts() after a Discord post
// actually succeeds, so a failed post leaves the flake un-alerted and it retries
// on the next result rather than being silently swallowed.
//
// Also re-arms: a test that has settled and dropped out of the flaky set has its
// alert row cleared, so if it starts flaking again later it alerts afresh.
export function detectNewFlakes() {
  const flaky = rankedFlakes()
  const flakyIds = new Set(flaky.map((s) => s.test_case_id))

  const alertedRows = db.prepare('SELECT test_case_id FROM flake_alerts').all()
  const alerted = new Set(alertedRows.map((r) => r.test_case_id))

  const settled = alertedRows.map((r) => r.test_case_id).filter((id) => !flakyIds.has(id))
  if (settled.length) {
    const clear = db.prepare('DELETE FROM flake_alerts WHERE test_case_id = ?')
    db.transaction((ids) => ids.forEach((id) => clear.run(id)))(settled)
  }

  return flaky.filter((s) => !alerted.has(s.test_case_id))
}

// Marks test cases as alerted. Called only after a confirmed Discord post, so an
// alert is recorded at-most-once per flake episode and never lost on a failed post.
export function recordAlerts(testCaseIds, nowIso) {
  const record = db.prepare(
    'INSERT OR IGNORE INTO flake_alerts (test_case_id, first_alerted_at) VALUES (?, ?)',
  )
  db.transaction((ids) => ids.forEach((id) => record.run(id, nowIso)))(testCaseIds)
}

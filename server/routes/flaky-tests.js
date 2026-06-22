import { buildLeaderboard, MIN_RUNS } from '../flakes.js'

const ok = (res, data) => res.json({ success: true, data, error: null })

export function handleListFlakyTests(req, res) {
  ok(res, { min_runs: MIN_RUNS, items: buildLeaderboard(10) })
}

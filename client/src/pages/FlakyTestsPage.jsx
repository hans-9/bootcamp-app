import { useEffect, useState } from 'react'
import { listFlakyTests } from '../api.js'

// Oldest → newest pass/fail dots. The sequence shape is the whole point, so the
// order is preserved and summarized for screen readers.
function Sparkline({ results }) {
  if (!results || results.length === 0) return <span className="muted">—</span>
  const passes = results.filter((r) => r === 'passed').length
  const label = `${results.length} recent runs, ${passes} passed, ${results.length - passes} failed, oldest to newest`
  return (
    <span className="flake-spark" role="img" aria-label={label}>
      {results.map((r, i) => (
        <span key={i} className={`flake-dot flake-dot-${r}`} title={r} />
      ))}
    </span>
  )
}

// flips per opportunity-to-flip. High = the outcome oscillates rather than
// trending, the classic flake signature.
function volatility(flipCount, runs) {
  const rate = runs > 1 ? flipCount / (runs - 1) : 0
  if (rate >= 0.6) return { level: 'high', label: 'High' }
  if (rate >= 0.3) return { level: 'med', label: 'Medium' }
  return { level: 'low', label: 'Low' }
}

export default function FlakyTestsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    listFlakyTests()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const items = data?.items ?? []
  const minRuns = data?.min_runs ?? 3

  return (
    <div className="container">
      <div className="page-head">
        <h2>Flaky Tests</h2>
      </div>

      <p className="flaky-intro muted">
        The tests most likely to pass or fail without a code change, ranked by fail rate across
        every run. A test appears here once it has at least {minRuns} runs with both a pass and a
        fail — clean passes and total failures are filtered out.
      </p>

      <div className="card">
        {loading && <div className="empty">Loading…</div>}
        {error && !loading && <div className="empty">Error: {error}</div>}
        {!loading && !error && items.length === 0 && (
          <div className="empty">
            No flaky tests yet. Once tests pass on some runs and fail on others, they’ll surface
            here.
          </div>
        )}
        {!loading && !error && items.length > 0 && (
          <table className="flaky-table">
            <thead>
              <tr>
                <th className="flake-rank-col">#</th>
                <th>Test</th>
                <th>Fail rate</th>
                <th>Volatility</th>
                <th>Recent runs</th>
                <th>Likely root cause</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => {
                const pct = Math.max(0, Math.min(100, Math.round((Number(t.fail_ratio) || 0) * 100)))
                const vol = volatility(t.flip_count, t.runs)
                return (
                  <tr key={t.test_case_id}>
                    <td className="flake-rank-col">{t.rank}</td>
                    <td className="title-cell">
                      <div>{t.title}</div>
                      <div className="muted flake-subtle">
                        {t.fail_count} failed / {t.runs} runs
                      </div>
                    </td>
                    <td>
                      <div className="flake-ratio">
                        <div className="flake-ratio-bar" aria-hidden="true">
                          <span style={{ width: `${pct}%` }} />
                        </div>
                        <span className="flake-ratio-pct">{pct}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge flake-vol flake-vol-${vol.level}`}>
                        {vol.label} · {t.flip_count} flips
                      </span>
                    </td>
                    <td>
                      <Sparkline results={t.recent_results} />
                    </td>
                    <td className="flake-hyp">
                      {t.hypothesis ? (
                        t.hypothesis
                      ) : (
                        <span className="muted">Analysis pending — run the flake-analyzer.</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && !error && items.length > 0 && (
        <div className="card flaky-note">
          <h3>What the data shows</h3>
          <p>
            Fail rate is the headline because it’s stable and easy to read — a test that fails 4 of 6
            runs is plainly less trustworthy than one that fails 2 of 6. Volatility (flip count) sits
            beside it on purpose: a test can have a moderate fail rate but flip every single run,
            which points at a race condition rather than a clean regression. Ranking on flip rate
            alone would have floated a 2-run coin-flip above a 20-run test failing 40% of the time —
            which reads as broken to a QA lead.
          </p>
          <p className="muted">
            Next I’d weight recent runs more heavily than old ones, so a test that has settled down
            drops off the board faster than its lifetime average suggests.
          </p>
        </div>
      )}
    </div>
  )
}

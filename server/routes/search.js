import db from '../db.js'

const ok = (res, data) => res.json({ success: true, data, error: null })

const PER_TYPE_LIMIT = 6

// Escape LIKE wildcards so a literal % or _ in the query matches literally.
const likeParam = (q) => `%${q.replace(/[\\%_]/g, '\\$&')}%`

const searchTestCases = db.prepare(
  `SELECT id, title, severity, status FROM test_cases
   WHERE title LIKE @like ESCAPE '\\'
   ORDER BY updated_at DESC LIMIT @limit`,
)
const searchBugs = db.prepare(
  `SELECT id, title, severity, status FROM bugs
   WHERE title LIKE @like ESCAPE '\\' OR description LIKE @like ESCAPE '\\'
   ORDER BY updated_at DESC LIMIT @limit`,
)
const searchSuites = db.prepare(
  `SELECT id, name AS title, feature, status FROM test_suites
   WHERE name LIKE @like ESCAPE '\\' OR feature LIKE @like ESCAPE '\\'
   ORDER BY updated_at DESC LIMIT @limit`,
)

// Single-character queries match almost everything via LIKE; require two so a
// keystroke can't trigger three near-full table scans for a near-useless result.
const MIN_CHARS = 2

export function handleSearch(req, res) {
  const query = String(req.query.q ?? '').trim()
  if (query.length < MIN_CHARS) return ok(res, { query, testCases: [], bugs: [], suites: [] })

  const params = { like: likeParam(query), limit: PER_TYPE_LIMIT }
  ok(res, {
    query,
    testCases: searchTestCases.all(params),
    bugs: searchBugs.all(params),
    suites: searchSuites.all(params),
  })
}

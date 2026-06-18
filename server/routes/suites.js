import db, { SUITE_STATUSES } from '../db.js'

const ok = (res, data) => res.json({ success: true, data, error: null })
const fail = (res, status, message) =>
  res.status(status).json({ success: false, data: null, error: message })

function validate(body) {
  const name = String(body.name ?? '').trim()
  const feature = String(body.feature ?? '').trim()
  const status = String(body.status ?? 'draft').trim()

  if (!name) return { error: 'Name is required.' }
  if (!feature) return { error: 'Feature is required.' }
  if (!SUITE_STATUSES.includes(status))
    return { error: `Status must be one of: ${SUITE_STATUSES.join(', ')}.` }

  return { value: { name, feature, status } }
}

const caseCount = db.prepare('SELECT COUNT(*) AS n FROM suite_cases WHERE suite_id = ?')

// Cases in a suite, in sort order, with the fields the detail page needs.
const casesInSuite = db.prepare(`
  SELECT tc.id, tc.title, tc.severity, tc.status, sc.sort_order
  FROM suite_cases sc
  JOIN test_cases tc ON tc.id = sc.case_id
  WHERE sc.suite_id = ?
  ORDER BY sc.sort_order, sc.id
`)

export function handleListSuites(req, res) {
  const status = String(req.query.status ?? '').trim()
  const where = status && SUITE_STATUSES.includes(status) ? 'WHERE s.status = @status' : ''

  const rows = db
    .prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM suite_cases sc WHERE sc.suite_id = s.id) AS case_count
       FROM test_suites s ${where}
       ORDER BY s.updated_at DESC`,
    )
    .all(status ? { status } : {})

  ok(res, rows)
}

export function handleGetSuite(req, res) {
  const suite = db.prepare('SELECT * FROM test_suites WHERE id = ?').get(req.params.id)
  if (!suite) return fail(res, 404, 'Suite not found.')
  ok(res, { ...suite, cases: casesInSuite.all(suite.id) })
}

export function handleCreateSuite(req, res) {
  const { value, error } = validate(req.body)
  if (error) return fail(res, 400, error)

  const now = new Date().toISOString()
  const info = db
    .prepare(
      `INSERT INTO test_suites (name, feature, status, created_at, updated_at)
       VALUES (@name, @feature, @status, @created_at, @updated_at)`,
    )
    .run({ ...value, created_at: now, updated_at: now })

  const suite = db.prepare('SELECT * FROM test_suites WHERE id = ?').get(info.lastInsertRowid)
  res.status(201).json({ success: true, data: { ...suite, cases: [] }, error: null })
}

export function handleUpdateSuite(req, res) {
  const existing = db.prepare('SELECT id FROM test_suites WHERE id = ?').get(req.params.id)
  if (!existing) return fail(res, 404, 'Suite not found.')

  const { value, error } = validate(req.body)
  if (error) return fail(res, 400, error)

  db.prepare(
    `UPDATE test_suites
       SET name = @name, feature = @feature, status = @status, updated_at = @updated_at
     WHERE id = @id`,
  ).run({ ...value, updated_at: new Date().toISOString(), id: req.params.id })

  const suite = db.prepare('SELECT * FROM test_suites WHERE id = ?').get(req.params.id)
  ok(res, { ...suite, cases: casesInSuite.all(suite.id) })
}

export function handleDeleteSuite(req, res) {
  const info = db.prepare('DELETE FROM test_suites WHERE id = ?').run(req.params.id)
  if (info.changes === 0) return fail(res, 404, 'Suite not found.')
  ok(res, { id: Number(req.params.id) })
}

export function handleAddCaseToSuite(req, res) {
  const suite = db.prepare('SELECT id FROM test_suites WHERE id = ?').get(req.params.id)
  if (!suite) return fail(res, 404, 'Suite not found.')

  const caseId = Number(req.body.case_id)
  if (!Number.isInteger(caseId)) return fail(res, 400, 'A numeric case_id is required.')

  const testCase = db.prepare('SELECT id FROM test_cases WHERE id = ?').get(caseId)
  if (!testCase) return fail(res, 404, 'Test case not found.')

  const already = db
    .prepare('SELECT id FROM suite_cases WHERE suite_id = ? AND case_id = ?')
    .get(req.params.id, caseId)
  if (already) return fail(res, 409, 'That test case is already in this suite.')

  const { next } = db
    .prepare('SELECT COALESCE(MAX(sort_order) + 1, 0) AS next FROM suite_cases WHERE suite_id = ?')
    .get(req.params.id)
  db.prepare('INSERT INTO suite_cases (suite_id, case_id, sort_order) VALUES (?, ?, ?)').run(
    req.params.id,
    caseId,
    next,
  )
  touchSuite(req.params.id)

  ok(res, { cases: casesInSuite.all(req.params.id) })
}

export function handleRemoveCaseFromSuite(req, res) {
  const info = db
    .prepare('DELETE FROM suite_cases WHERE suite_id = ? AND case_id = ?')
    .run(req.params.id, req.params.caseId)
  if (info.changes === 0) return fail(res, 404, 'That test case is not in this suite.')
  touchSuite(req.params.id)

  ok(res, { cases: casesInSuite.all(req.params.id) })
}

export function handleReorderSuiteCases(req, res) {
  const suite = db.prepare('SELECT id FROM test_suites WHERE id = ?').get(req.params.id)
  if (!suite) return fail(res, 404, 'Suite not found.')

  const order = Array.isArray(req.body.case_ids) ? req.body.case_ids.map(Number) : null
  if (!order) return fail(res, 400, 'case_ids must be an array of test case ids.')

  const current = db
    .prepare('SELECT case_id FROM suite_cases WHERE suite_id = ?')
    .all(req.params.id)
    .map((r) => r.case_id)

  const sameSet =
    order.length === current.length && current.every((id) => order.includes(id))
  if (!sameSet)
    return fail(res, 400, 'case_ids must list exactly the cases currently in the suite.')

  const update = db.prepare(
    'UPDATE suite_cases SET sort_order = ? WHERE suite_id = ? AND case_id = ?',
  )
  db.transaction(() => {
    order.forEach((caseId, i) => update.run(i, req.params.id, caseId))
  })()
  touchSuite(req.params.id)

  ok(res, { cases: casesInSuite.all(req.params.id) })
}

function touchSuite(id) {
  db.prepare('UPDATE test_suites SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), id)
}

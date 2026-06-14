import db, { SEVERITIES, STATUSES, SEVERITY_RANK } from './db.js'

// ---- helpers ----

const ok = (res, data) => res.json({ success: true, data, error: null })
const fail = (res, status, message) =>
  res.status(status).json({ success: false, data: null, error: message })

const serialize = (row) => {
  // A corrupt steps value degrades to [] instead of 500-ing the whole list.
  let steps
  try {
    steps = JSON.parse(row.steps)
  } catch {
    steps = []
  }
  return { ...row, steps }
}

// Validate a create/update body. Returns { value } or { error }.
function validate(body) {
  const title = String(body.title ?? '').trim()
  const preconditions = String(body.preconditions ?? '').trim() // optional
  const expected_result = String(body.expected_result ?? '').trim()
  const severity = String(body.severity ?? '').trim()
  const status = String(body.status ?? 'draft').trim()
  const steps = Array.isArray(body.steps)
    ? body.steps.map((s) => String(s).trim()).filter(Boolean)
    : []

  if (!title) return { error: 'Title is required.' }
  if (steps.length === 0) return { error: 'At least one step is required.' }
  if (!expected_result) return { error: 'Expected result is required.' }
  if (!SEVERITIES.includes(severity))
    return { error: `Severity must be one of: ${SEVERITIES.join(', ')}.` }
  if (!STATUSES.includes(status))
    return { error: `Status must be one of: ${STATUSES.join(', ')}.` }

  return { value: { title, preconditions, steps, expected_result, severity, status } }
}

// ---- handlers ----

export function handleListTestCases(req, res) {
  const requestedPage = Math.max(1, parseInt(req.query.page) || 1)
  const perPage = 20
  const search = String(req.query.search ?? '').trim()
  const title = String(req.query.title ?? '').trim()
  const status = String(req.query.status ?? '').trim()
  const sort = req.query.sort === 'severity' ? 'severity' : 'updated' // default: updated
  const dir = req.query.dir === 'asc' ? 'ASC' : 'DESC' // default: desc

  const where = []
  const params = {}
  if (search) {
    where.push('title LIKE @search')
    params.search = `%${search}%`
  }
  if (title) {
    where.push('lower(title) = lower(@title)')
    params.title = title
  }
  if (status && STATUSES.includes(status)) {
    where.push('status = @status')
    params.status = status
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  // For severity sort, order by the rank (Critical first when DESC reversed) via a CASE.
  const rankCase = `CASE severity
      WHEN 'Critical' THEN ${SEVERITY_RANK.Critical}
      WHEN 'Major' THEN ${SEVERITY_RANK.Major}
      WHEN 'Minor' THEN ${SEVERITY_RANK.Minor}
      ELSE ${SEVERITY_RANK.Trivial} END`
  const orderSql =
    sort === 'severity' ? `ORDER BY ${rankCase} ${dir}, updated_at DESC` : `ORDER BY updated_at ${dir}`

  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM test_cases ${whereSql}`).get(params)
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const page = Math.min(requestedPage, totalPages) // an out-of-range page returns the last page, not empty
  const offset = (page - 1) * perPage

  const rows = db
    .prepare(`SELECT * FROM test_cases ${whereSql} ${orderSql} LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit: perPage, offset })

  ok(res, {
    items: rows.map(serialize),
    page,
    perPage,
    total,
    totalPages,
  })
}

export function handleGetTestCase(req, res) {
  const row = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id)
  if (!row) return fail(res, 404, 'Test case not found.')
  ok(res, serialize(row))
}

export function handleCreateTestCase(req, res) {
  const { value, error } = validate(req.body)
  if (error) return fail(res, 400, error)

  const now = new Date().toISOString()
  const info = db
    .prepare(
      `INSERT INTO test_cases (title, preconditions, steps, expected_result, severity, status, created_at, updated_at)
       VALUES (@title, @preconditions, @steps, @expected_result, @severity, @status, @created_at, @updated_at)`,
    )
    .run({ ...value, steps: JSON.stringify(value.steps), created_at: now, updated_at: now })

  const row = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(info.lastInsertRowid)
  res.status(201).json({ success: true, data: serialize(row), error: null })
}

export function handleUpdateTestCase(req, res) {
  const existing = db.prepare('SELECT updated_at FROM test_cases WHERE id = ?').get(req.params.id)
  if (!existing) return fail(res, 404, 'Test case not found.')

  if (req.body.updated_at && req.body.updated_at !== existing.updated_at)
    return fail(res, 409, 'This test case changed since you opened it. Reload and try again.')

  const { value, error } = validate(req.body)
  if (error) return fail(res, 400, error)

  db.prepare(
    `UPDATE test_cases
       SET title = @title, preconditions = @preconditions, steps = @steps,
           expected_result = @expected_result, severity = @severity, status = @status,
           updated_at = @updated_at
     WHERE id = @id`,
  ).run({
    ...value,
    steps: JSON.stringify(value.steps),
    updated_at: new Date().toISOString(),
    id: req.params.id,
  })

  const row = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id)
  ok(res, serialize(row))
}

export function handleDeleteTestCase(req, res) {
  const info = db.prepare('DELETE FROM test_cases WHERE id = ?').run(req.params.id)
  if (info.changes === 0) return fail(res, 404, 'Test case not found.')
  ok(res, { id: Number(req.params.id) })
}

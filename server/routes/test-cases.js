import db, { SEVERITIES, STATUSES, SEVERITY_RANK } from '../db.js'
import { toCsv } from '../csv.js'

// Columns written to an exported CSV, in order. `steps` is joined one-per-line
// so the file round-trips back through the import parser.
const EXPORT_COLUMNS = [
  'id',
  'title',
  'preconditions',
  'steps',
  'expected_result',
  'severity',
  'status',
  'created_at',
  'updated_at',
]

// Size caps that bound a single test case (and so every imported row too).
const MAX_TITLE_LENGTH = 200
const MAX_TEXT_LENGTH = 2000 // preconditions, expected_result
const MAX_STEPS = 50
const MAX_STEP_LENGTH = 500

// ---- helpers ----

const ok = (res, data) => res.json({ success: true, data, error: null })
const fail = (res, status, message) =>
  res.status(status).json({ success: false, data: null, error: message })

const isUniqueViolation = (err) => String(err?.code).startsWith('SQLITE_CONSTRAINT')

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
export function validate(body) {
  const title = String(body.title ?? '').trim()
  const preconditions = String(body.preconditions ?? '').trim() // optional
  const expected_result = String(body.expected_result ?? '').trim()
  const severity = String(body.severity ?? '').trim()
  const status = String(body.status ?? 'draft').trim()
  const steps = Array.isArray(body.steps)
    ? body.steps.map((s) => String(s).trim()).filter(Boolean)
    : []

  if (!title) return { error: 'Title is required.' }
  if (!/[\p{L}\p{N}]/u.test(title))
    return { error: 'Title must contain at least one letter or number.' }
  if (title.length > MAX_TITLE_LENGTH)
    return { error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer.` }
  if (steps.length === 0) return { error: 'At least one step is required.' }
  if (steps.length > MAX_STEPS) return { error: `A test case can have at most ${MAX_STEPS} steps.` }
  if (steps.some((s) => s.length > MAX_STEP_LENGTH))
    return { error: `Each step must be ${MAX_STEP_LENGTH} characters or fewer.` }
  if (!expected_result) return { error: 'Expected result is required.' }
  if (expected_result.length > MAX_TEXT_LENGTH)
    return { error: `Expected result must be ${MAX_TEXT_LENGTH} characters or fewer.` }
  if (preconditions.length > MAX_TEXT_LENGTH)
    return { error: `Preconditions must be ${MAX_TEXT_LENGTH} characters or fewer.` }
  if (!SEVERITIES.includes(severity))
    return { error: `Severity must be one of: ${SEVERITIES.join(', ')}.` }
  if (!STATUSES.includes(status))
    return { error: `Status must be one of: ${STATUSES.join(', ')}.` }

  return { value: { title, preconditions, steps, expected_result, severity, status } }
}

// Build the WHERE/ORDER BY (and bound params) shared by list and export, so a
// CSV export applies exactly the filters the user is looking at.
function buildListFilter(query) {
  const search = String(query.search ?? '').trim()
  const title = String(query.title ?? '').trim()
  const status = String(query.status ?? '').trim()
  const sort = query.sort === 'severity' ? 'severity' : 'updated'
  const dir = query.dir === 'asc' ? 'ASC' : 'DESC'

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

  return { whereSql, orderSql, params }
}

// ---- handlers ----

export function handleListTestCases(req, res) {
  const requestedPage = Math.max(1, parseInt(req.query.page) || 1)
  const perPage = 20
  const { whereSql, orderSql, params } = buildListFilter(req.query)

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

export function handleExportTestCases(req, res) {
  const { whereSql, orderSql, params } = buildListFilter(req.query)
  const rows = db
    .prepare(`SELECT * FROM test_cases ${whereSql} ${orderSql}`)
    .all(params)
    .map(serialize)

  const data = rows.map((r) =>
    EXPORT_COLUMNS.map((c) => (c === 'steps' ? r.steps.join('\n') : r[c])),
  )
  // The BOM makes Excel read the file as UTF-8; the import parser strips it.
  const csv = '﻿' + toCsv(EXPORT_COLUMNS, data)

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="test-cases.csv"')
  res.send(csv)
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
  let info
  try {
    info = db
      .prepare(
        `INSERT INTO test_cases (title, preconditions, steps, expected_result, severity, status, created_at, updated_at)
         VALUES (@title, @preconditions, @steps, @expected_result, @severity, @status, @created_at, @updated_at)`,
      )
      .run({ ...value, steps: JSON.stringify(value.steps), created_at: now, updated_at: now })
  } catch (err) {
    if (isUniqueViolation(err)) return fail(res, 409, 'A test case with this title already exists.')
    throw err
  }

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

  try {
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
  } catch (err) {
    if (isUniqueViolation(err)) return fail(res, 409, 'A test case with this title already exists.')
    throw err
  }

  const row = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id)
  ok(res, serialize(row))
}

export function handleDeleteTestCase(req, res) {
  const info = db.prepare('DELETE FROM test_cases WHERE id = ?').run(req.params.id)
  if (info.changes === 0) return fail(res, 404, 'Test case not found.')
  ok(res, { id: Number(req.params.id) })
}

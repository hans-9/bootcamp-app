import db from '../db.js'
import { parseCsv } from '../csv.js'
import { validate } from './test-cases.js'

const ok = (res, data) => res.json({ success: true, data, error: null })
const fail = (res, status, message) =>
  res.status(status).json({ success: false, data: null, error: message })

const REQUIRED_HEADERS = ['title', 'severity', 'steps']
const KNOWN_HEADERS = [...REQUIRED_HEADERS, 'preconditions', 'expected_result', 'status']
const MAX_ROWS = 1000 // cap rows per import so a huge file can't freeze parsing or the UI

// "Expected Result" -> "expected_result", " Steps " -> "steps"
const normalizeHeader = (h) => String(h ?? '').trim().toLowerCase().replace(/\s+/g, '_')

// Parse, validate headers, map+validate each row, and flag duplicate titles.
// Returns { error } on a header-level failure, otherwise { headers, summary, rows }.
// Each row: { rowNumber, title, severity, stepCount, valid, errors, value }.
function buildReport(csvText) {
  const { headers, rows } = parseCsv(csvText)

  if (headers.length === 0) return { error: 'The CSV file is empty.' }

  const normalized = headers.map(normalizeHeader)
  const missing = REQUIRED_HEADERS.filter((h) => !normalized.includes(h))
  if (missing.length > 0)
    return { error: `Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.` }

  if (rows.length > MAX_ROWS)
    return { error: `This file has ${rows.length} rows; the limit is ${MAX_ROWS} per import. Split it into smaller files.` }

  const colIndex = {}
  normalized.forEach((h, i) => {
    if (KNOWN_HEADERS.includes(h) && !(h in colIndex)) colIndex[h] = i
  })

  // Existing titles in the DB, lowercased, for duplicate detection.
  const existingTitles = new Set(
    db.prepare('SELECT lower(title) AS t FROM test_cases').all().map((r) => r.t),
  )
  const seenInFile = new Set()

  const cell = (row, name) => (colIndex[name] != null ? row[colIndex[name]] ?? '' : '')

  const report = rows.map((row, idx) => {
    const rowNumber = idx + 2 // header is row 1
    const title = String(cell(row, 'title')).trim()
    const stepsRaw = String(cell(row, 'steps'))
    const steps = stepsRaw
      .split(/\r\n|\r|\n/)
      .map((s) => s.trim())
      .filter(Boolean)
    const statusCell = String(cell(row, 'status')).trim()

    const candidate = {
      title,
      severity: String(cell(row, 'severity')).trim(),
      expected_result: String(cell(row, 'expected_result')).trim(),
      preconditions: String(cell(row, 'preconditions')).trim(),
      steps,
      ...(statusCell ? { status: statusCell } : {}), // empty status defaults to draft
    }

    const errors = []
    let value = null

    // A column-count mismatch means the cells are misaligned — report that
    // rather than the misleading field errors it would otherwise produce.
    if (row.length !== headers.length) {
      errors.push(
        `Row has ${row.length} column${row.length === 1 ? '' : 's'} but the header has ${headers.length}.`,
      )
    } else {
      const result = validate(candidate)
      if (result.error) errors.push(result.error)
      else {
        value = result.value
        const key = title.toLowerCase()
        if (existingTitles.has(key)) errors.push('A test case with this title already exists.')
        else if (seenInFile.has(key)) errors.push('Duplicate title within this file.')
        else seenInFile.add(key)
      }
    }

    return {
      rowNumber,
      title: title || '(untitled)',
      severity: candidate.severity,
      stepCount: steps.length,
      valid: errors.length === 0,
      errors,
      value: errors.length === 0 ? value : null,
    }
  })

  const valid = report.filter((r) => r.valid).length
  return {
    headers,
    summary: { total: report.length, valid, invalid: report.length - valid },
    rows: report,
  }
}

export function handleImportPreview(req, res) {
  const csv = req.body?.csv
  if (typeof csv !== 'string' || csv.trim() === '')
    return fail(res, 400, 'No CSV content was provided.')

  const result = buildReport(csv)
  if (result.error) return fail(res, 400, result.error)

  // Drop the internal `value` from the preview payload.
  const rows = result.rows.map(({ value, ...rest }) => rest)
  ok(res, { headers: result.headers, summary: result.summary, rows })
}

export function handleImportCommit(req, res) {
  const csv = req.body?.csv
  if (typeof csv !== 'string' || csv.trim() === '')
    return fail(res, 400, 'No CSV content was provided.')

  const result = buildReport(csv)
  if (result.error) return fail(res, 400, result.error)

  const now = new Date().toISOString()
  const insert = db.prepare(
    `INSERT INTO test_cases (title, preconditions, steps, expected_result, severity, status, created_at, updated_at)
     VALUES (@title, @preconditions, @steps, @expected_result, @severity, @status, @created_at, @updated_at)`,
  )

  // A unique-title violation here means a concurrent insert beat us to it after
  // the duplicate pre-check. Skip that row and keep the rest of the batch.
  const raceErrors = []
  let imported = 0
  const insertAll = db.transaction((validRows) => {
    for (const r of validRows) {
      try {
        insert.run({ ...r.value, steps: JSON.stringify(r.value.steps), created_at: now, updated_at: now })
        imported++
      } catch (err) {
        if (String(err?.code).startsWith('SQLITE_CONSTRAINT'))
          raceErrors.push({ rowNumber: r.rowNumber, title: r.title, reason: 'A test case with this title already exists.' })
        else throw err
      }
    }
  })

  insertAll(result.rows.filter((r) => r.valid))

  const errors = result.rows
    .filter((r) => !r.valid)
    .map((r) => ({ rowNumber: r.rowNumber, title: r.title, reason: r.errors.join(' ') }))
    .concat(raceErrors)
    .sort((a, b) => a.rowNumber - b.rowNumber)

  ok(res, { imported, skipped: errors.length, errors })
}

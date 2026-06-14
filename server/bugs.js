import db, { SEVERITIES, BUG_STATUSES, BUG_PRIORITIES, SEVERITY_RANK, PRIORITY_RANK } from './db.js'

const ok = (res, data) => res.json({ success: true, data, error: null })
const fail = (res, status, message) =>
  res.status(status).json({ success: false, data: null, error: message })

const serialize = (row) => {
  let steps
  try {
    steps = JSON.parse(row.steps_to_reproduce)
  } catch {
    steps = []
  }
  return { ...row, steps_to_reproduce: steps }
}

// Allowed next statuses from each current status.
const TRANSITIONS = {
  open: ['in-progress', 'closed'],
  'in-progress': ['resolved', 'closed'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
  reopened: ['in-progress', 'closed'],
}

function validate(body) {
  const title = String(body.title ?? '').trim()
  const description = String(body.description ?? '').trim()
  const severity = String(body.severity ?? '').trim()
  const priority = String(body.priority ?? 'Medium').trim()
  const expected = String(body.expected ?? '').trim()
  const actual = String(body.actual ?? '').trim()
  const environment = String(body.environment ?? '').trim()
  const steps = Array.isArray(body.steps_to_reproduce)
    ? body.steps_to_reproduce.map((s) => String(s).trim()).filter(Boolean)
    : []

  if (!title) return { error: 'Title is required.' }
  if (steps.length === 0) return { error: 'At least one step to reproduce is required.' }
  if (!SEVERITIES.includes(severity))
    return { error: `Severity must be one of: ${SEVERITIES.join(', ')}.` }
  if (!BUG_PRIORITIES.includes(priority))
    return { error: `Priority must be one of: ${BUG_PRIORITIES.join(', ')}.` }

  return { value: { title, description, severity, priority, expected, actual, environment, steps } }
}

const activityForBug = db.prepare(
  'SELECT * FROM bug_activity WHERE bug_id = ? ORDER BY created_at DESC, id DESC',
)

export function handleListBugs(req, res) {
  const status = String(req.query.status ?? '').trim()
  const severity = String(req.query.severity ?? '').trim()
  const priority = String(req.query.priority ?? '').trim()
  const search = String(req.query.search ?? '').trim()
  const sort = ['severity', 'priority', 'status', 'title', 'created'].includes(req.query.sort)
    ? req.query.sort
    : 'updated'
  const dir = req.query.dir === 'asc' ? 'ASC' : 'DESC'

  const where = []
  const params = {}
  if (status && BUG_STATUSES.includes(status)) {
    where.push('status = @status')
    params.status = status
  }
  if (severity && SEVERITIES.includes(severity)) {
    where.push('severity = @severity')
    params.severity = severity
  }
  if (priority && BUG_PRIORITIES.includes(priority)) {
    where.push('priority = @priority')
    params.priority = priority
  }
  if (search) {
    where.push("(title LIKE @search ESCAPE '\\' OR description LIKE @search ESCAPE '\\')")
    params.search = `%${search.replace(/[\\%_]/g, '\\$&')}%`
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const sevCase = `CASE severity
      WHEN 'Critical' THEN ${SEVERITY_RANK.Critical} WHEN 'Major' THEN ${SEVERITY_RANK.Major}
      WHEN 'Minor' THEN ${SEVERITY_RANK.Minor} ELSE ${SEVERITY_RANK.Trivial} END`
  const prioCase = `CASE priority
      WHEN 'Urgent' THEN ${PRIORITY_RANK.Urgent} WHEN 'High' THEN ${PRIORITY_RANK.High}
      WHEN 'Medium' THEN ${PRIORITY_RANK.Medium} ELSE ${PRIORITY_RANK.Low} END`
  const orderSql = {
    severity: `${sevCase} ${dir}, updated_at DESC`,
    priority: `${prioCase} ${dir}, updated_at DESC`,
    status: `status ${dir}, updated_at DESC`,
    title: `title COLLATE NOCASE ${dir}`,
    created: `created_at ${dir}`,
    updated: `updated_at ${dir}`,
  }[sort]

  const rows = db.prepare(`SELECT * FROM bugs ${whereSql} ORDER BY ${orderSql}`).all(params)
  ok(res, rows.map(serialize))
}

export function handleGetBug(req, res) {
  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id)
  if (!bug) return fail(res, 404, 'Bug not found.')
  ok(res, { ...serialize(bug), activity: activityForBug.all(bug.id) })
}

export function handleCreateBug(req, res) {
  const { value, error } = validate(req.body)
  if (error) return fail(res, 400, error)

  const now = new Date().toISOString()
  const info = db
    .prepare(
      `INSERT INTO bugs (title, description, severity, priority, status, steps_to_reproduce, expected, actual, environment, created_at, updated_at)
       VALUES (@title, @description, @severity, @priority, 'open', @steps, @expected, @actual, @environment, @created_at, @updated_at)`,
    )
    .run({ ...value, steps: JSON.stringify(value.steps), created_at: now, updated_at: now })

  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(info.lastInsertRowid)
  res.status(201).json({ success: true, data: { ...serialize(bug), activity: [] }, error: null })
}

export function handleUpdateBug(req, res) {
  const existing = db.prepare('SELECT id FROM bugs WHERE id = ?').get(req.params.id)
  if (!existing) return fail(res, 404, 'Bug not found.')

  const { value, error } = validate(req.body)
  if (error) return fail(res, 400, error)

  // Status is intentionally not updated here — it only changes via PATCH /status
  // so transition rules and the activity log are always enforced.
  db.prepare(
    `UPDATE bugs
       SET title = @title, description = @description, severity = @severity, priority = @priority,
           steps_to_reproduce = @steps, expected = @expected, actual = @actual,
           environment = @environment, updated_at = @updated_at
     WHERE id = @id`,
  ).run({
    ...value,
    steps: JSON.stringify(value.steps),
    updated_at: new Date().toISOString(),
    id: req.params.id,
  })

  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id)
  ok(res, { ...serialize(bug), activity: activityForBug.all(req.params.id) })
}

export function handleDeleteBug(req, res) {
  const info = db.prepare('DELETE FROM bugs WHERE id = ?').run(req.params.id)
  if (info.changes === 0) return fail(res, 404, 'Bug not found.')
  ok(res, { id: Number(req.params.id) })
}

export function handleChangeBugStatus(req, res) {
  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id)
  if (!bug) return fail(res, 404, 'Bug not found.')

  const next = String(req.body.status ?? '').trim()
  if (!BUG_STATUSES.includes(next)) return fail(res, 400, `Unknown status: ${next || '(empty)'}.`)
  // Check before the transition rules so a stale client gets "refresh", not a confusing 422.
  if (req.body.updated_at && req.body.updated_at !== bug.updated_at)
    return fail(res, 409, 'This bug changed since you opened it. Refresh and try again.')
  if (next === bug.status) return fail(res, 400, `Bug is already ${next}.`)
  if (!TRANSITIONS[bug.status].includes(next))
    return fail(res, 422, `Cannot move a bug from ${bug.status} to ${next}.`)

  const now = new Date().toISOString()
  const tx = db.transaction(() => {
    db.prepare('UPDATE bugs SET status = ?, updated_at = ? WHERE id = ?').run(next, now, bug.id)
    db.prepare(
      `INSERT INTO bug_activity (bug_id, action, old_value, new_value, message, created_at)
       VALUES (?, 'status_change', ?, ?, ?, ?)`,
    ).run(bug.id, bug.status, next, String(req.body.message ?? '').trim(), now)
  })
  tx()

  const updated = db.prepare('SELECT * FROM bugs WHERE id = ?').get(bug.id)
  ok(res, { ...serialize(updated), activity: activityForBug.all(bug.id) })
}

export function handleAddBugComment(req, res) {
  const bug = db.prepare('SELECT id FROM bugs WHERE id = ?').get(req.params.id)
  if (!bug) return fail(res, 404, 'Bug not found.')

  const message = String(req.body.message ?? '').trim()
  if (!message) return fail(res, 400, 'A comment message is required.')

  db.prepare(
    `INSERT INTO bug_activity (bug_id, action, message, created_at)
     VALUES (?, 'comment', ?, ?)`,
  ).run(req.params.id, message, new Date().toISOString())

  ok(res, { activity: activityForBug.all(req.params.id) })
}

import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, 'data.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON') // enforce suite_cases foreign keys + ON DELETE CASCADE

// Allowed values, per CLAUDE.md.
export const SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial']
export const STATUSES = ['draft', 'ready', 'passed', 'failed', 'skipped']
export const SUITE_STATUSES = ['draft', 'ready', 'in-progress', 'passed', 'failed']
export const BUG_STATUSES = ['open', 'in-progress', 'resolved', 'closed', 'reopened']
export const BUG_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
export const RUN_STATUSES = ['running', 'passed', 'failed']
export const RESULT_STATUSES = ['passed', 'failed', 'skipped']

// Rank used for "sort by severity" — higher number = more severe, so
// ORDER BY rank DESC puts Critical first (matches "updated DESC = newest first").
export const SEVERITY_RANK = { Critical: 4, Major: 3, Minor: 2, Trivial: 1 }
export const PRIORITY_RANK = { Urgent: 4, High: 3, Medium: 2, Low: 1 }

db.exec(`
  CREATE TABLE IF NOT EXISTS test_cases (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT NOT NULL,
    preconditions   TEXT NOT NULL DEFAULT '',
    steps           TEXT NOT NULL,            -- JSON array of numbered action strings
    expected_result TEXT NOT NULL,
    severity        TEXT NOT NULL,            -- Critical | Major | Minor | Trivial
    status          TEXT NOT NULL DEFAULT 'draft',
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS test_suites (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    feature    TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'draft',  -- draft | ready | in-progress | passed | failed
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS suite_cases (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    suite_id   INTEGER NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
    case_id    INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    UNIQUE (suite_id, case_id)
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS bugs (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    title              TEXT NOT NULL,
    description        TEXT NOT NULL DEFAULT '',
    severity           TEXT NOT NULL,            -- Critical | Major | Minor | Trivial
    priority           TEXT NOT NULL DEFAULT 'Medium', -- Low | Medium | High | Urgent
    status             TEXT NOT NULL DEFAULT 'open',
    steps_to_reproduce TEXT NOT NULL,            -- JSON array of step strings
    expected           TEXT NOT NULL DEFAULT '',
    actual             TEXT NOT NULL DEFAULT '',
    environment        TEXT NOT NULL DEFAULT '',
    created_at         TEXT NOT NULL,
    updated_at         TEXT NOT NULL
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS bug_activity (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    bug_id     INTEGER NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    action     TEXT NOT NULL,            -- 'status_change' | 'comment'
    old_value  TEXT,
    new_value  TEXT,
    message    TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS test_runs_v2 (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    suite_id    INTEGER NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'running',
    pass_count  INTEGER NOT NULL DEFAULT 0,
    fail_count  INTEGER NOT NULL DEFAULT 0,
    skip_count  INTEGER NOT NULL DEFAULT 0,
    start_time  TEXT NOT NULL,
    end_time    TEXT,
    created_by  TEXT NOT NULL DEFAULT ''
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS test_run_results (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id       INTEGER NOT NULL REFERENCES test_runs_v2(id) ON DELETE CASCADE,
    test_case_id INTEGER NOT NULL,
    case_title   TEXT NOT NULL DEFAULT '',
    result       TEXT,
    duration_ms  INTEGER,
    notes        TEXT NOT NULL DEFAULT '',
    failed_at    TEXT,
    issue_url    TEXT,
    sort_order   INTEGER NOT NULL DEFAULT 0
  )
`)

// Seed once, only when the table is empty.
const { count } = db.prepare('SELECT COUNT(*) AS count FROM test_cases').get()
if (count === 0) seed()

const { suiteCount } = db.prepare('SELECT COUNT(*) AS suiteCount FROM test_suites').get()
if (suiteCount === 0) seedSuites()

const { bugCount } = db.prepare('SELECT COUNT(*) AS bugCount FROM bugs').get()
if (bugCount === 0) seedBugs()

const { runCount } = db.prepare('SELECT COUNT(*) AS runCount FROM test_runs_v2').get()
if (runCount === 0) seedRuns()

function seed() {
  const now = new Date().toISOString()
  const rows = [
    {
      title: 'User logs in with valid credentials',
      preconditions: 'App is running. Account test@example.com / Password123 exists.',
      steps: [
        'Open /login',
        'Enter test@example.com in the email field',
        'Enter Password123 in the password field',
        'Click the Log In button',
      ],
      expected_result: 'User lands on the dashboard and their email shows in the header.',
      severity: 'Critical',
      status: 'passed',
    },
    {
      title: 'Login rejects a wrong password',
      preconditions: 'App is running. Account test@example.com exists.',
      steps: [
        'Open /login',
        'Enter test@example.com in the email field',
        'Enter wrong123 in the password field',
        'Click the Log In button',
      ],
      expected_result: 'The form shows "Incorrect email or password" and the user stays on /login.',
      severity: 'Major',
      status: 'ready',
    },
    {
      title: 'Login rejects an unknown email',
      preconditions: 'App is running. No account exists for ghost@example.com.',
      steps: [
        'Open /login',
        'Enter ghost@example.com in the email field',
        'Enter Password123 in the password field',
        'Click the Log In button',
      ],
      expected_result: 'The form shows "Incorrect email or password" and no session is created.',
      severity: 'Major',
      status: 'draft',
    },
    {
      title: 'Empty login form shows validation errors',
      preconditions: 'App is running.',
      steps: [
        'Open /login',
        'Leave the email and password fields blank',
        'Click the Log In button',
      ],
      expected_result: 'Inline "This field is required" errors appear under both fields and no request is sent.',
      severity: 'Minor',
      status: 'draft',
    },
    {
      title: 'Session persists after a page refresh',
      preconditions: 'App is running. User is logged in as test@example.com.',
      steps: [
        'Open the dashboard while logged in',
        'Reload the page',
      ],
      expected_result: 'The user stays logged in and the dashboard reloads without redirecting to /login.',
      severity: 'Major',
      status: 'failed',
    },
  ]

  const insert = db.prepare(`
    INSERT INTO test_cases (title, preconditions, steps, expected_result, severity, status, created_at, updated_at)
    VALUES (@title, @preconditions, @steps, @expected_result, @severity, @status, @created_at, @updated_at)
  `)
  const insertMany = db.transaction((items) => {
    items.forEach((r) => {
      insert.run({
        ...r,
        steps: JSON.stringify(r.steps),
        created_at: now,
        updated_at: now,
      })
    })
  })
  insertMany(rows)
}

function seedSuites() {
  const now = new Date().toISOString()
  const ids = db
    .prepare('SELECT id FROM test_cases ORDER BY id LIMIT 6')
    .all()
    .map((r) => r.id)

  const suites = [
    { name: 'Login flow', feature: 'login', status: 'in-progress', caseIds: ids.slice(0, 3) },
    { name: 'Session & validation', feature: 'session', status: 'draft', caseIds: ids.slice(2, 5) },
  ]

  const insertSuite = db.prepare(
    `INSERT INTO test_suites (name, feature, status, created_at, updated_at)
     VALUES (@name, @feature, @status, @created_at, @updated_at)`,
  )
  const insertLink = db.prepare(
    `INSERT INTO suite_cases (suite_id, case_id, sort_order) VALUES (?, ?, ?)`,
  )

  const seedAll = db.transaction((items) => {
    items.forEach((s) => {
      const { lastInsertRowid: suiteId } = insertSuite.run({
        name: s.name,
        feature: s.feature,
        status: s.status,
        created_at: now,
        updated_at: now,
      })
      s.caseIds.forEach((caseId, i) => insertLink.run(suiteId, caseId, i))
    })
  })
  seedAll(suites)
}

function seedBugs() {
  const now = new Date().toISOString()
  const earlier = '2026-06-11T09:00:00.000Z'
  const bugs = [
    {
      title: 'Login button unresponsive on first click',
      description: 'The Log In button does nothing on the first click and only works on the second.',
      severity: 'Major',
      priority: 'High',
      status: 'open',
      steps_to_reproduce: ['Open /login', 'Enter valid credentials', 'Click Log In once'],
      expected: 'The form submits on the first click.',
      actual: 'Nothing happens until a second click.',
      environment: 'Chrome 125, macOS 14',
      activity: [],
    },
    {
      title: 'Dashboard totals double-count archived items',
      description: 'Archived records are still included in the dashboard totals.',
      severity: 'Critical',
      priority: 'Urgent',
      status: 'in-progress',
      steps_to_reproduce: ['Archive a record', 'Open the dashboard', 'Read the totals'],
      expected: 'Archived records are excluded from totals.',
      actual: 'Totals include archived records.',
      environment: 'Firefox 126, Windows 11',
      activity: [
        { action: 'status_change', old_value: 'open', new_value: 'in-progress', message: 'Picked up for the current sprint.' },
      ],
    },
    {
      title: 'Date picker shows wrong month in Safari',
      description: 'The date picker opens to the previous month in Safari only.',
      severity: 'Minor',
      priority: 'Low',
      status: 'resolved',
      steps_to_reproduce: ['Open any form with a date field in Safari', 'Click the date field'],
      expected: 'The picker opens on the current month.',
      actual: 'The picker opens on the previous month.',
      environment: 'Safari 17, macOS 14',
      activity: [
        { action: 'status_change', old_value: 'open', new_value: 'in-progress', message: '' },
        { action: 'comment', old_value: null, new_value: null, message: 'Caused by a 0-indexed month off-by-one.' },
        { action: 'status_change', old_value: 'in-progress', new_value: 'resolved', message: 'Fixed the month offset.' },
      ],
    },
  ]

  const insertBug = db.prepare(
    `INSERT INTO bugs (title, description, severity, priority, status, steps_to_reproduce, expected, actual, environment, created_at, updated_at)
     VALUES (@title, @description, @severity, @priority, @status, @steps_to_reproduce, @expected, @actual, @environment, @created_at, @updated_at)`,
  )
  const insertActivity = db.prepare(
    `INSERT INTO bug_activity (bug_id, action, old_value, new_value, message, created_at)
     VALUES (@bug_id, @action, @old_value, @new_value, @message, @created_at)`,
  )

  const seedAll = db.transaction((items) => {
    items.forEach((b) => {
      const { lastInsertRowid: bugId } = insertBug.run({
        title: b.title,
        description: b.description,
        severity: b.severity,
        priority: b.priority,
        status: b.status,
        steps_to_reproduce: JSON.stringify(b.steps_to_reproduce),
        expected: b.expected,
        actual: b.actual,
        environment: b.environment,
        created_at: earlier,
        updated_at: now,
      })
      b.activity.forEach((a) => {
        insertActivity.run({
          bug_id: bugId,
          action: a.action,
          old_value: a.old_value ?? null,
          new_value: a.new_value ?? null,
          message: a.message ?? '',
          created_at: now,
        })
      })
    })
  })
  seedAll(bugs)
}

function seedRuns() {
  const suite = db.prepare('SELECT id FROM test_suites ORDER BY id LIMIT 1').get()
  if (!suite) return

  const cases = db
    .prepare(`
      SELECT tc.id, tc.title, sc.sort_order
      FROM suite_cases sc
      JOIN test_cases tc ON tc.id = sc.case_id
      WHERE sc.suite_id = ?
      ORDER BY sc.sort_order, sc.id
    `)
    .all(suite.id)
  if (cases.length === 0) return

  const startTime = '2026-06-14T10:00:00.000Z'
  const endTime = '2026-06-14T10:22:00.000Z'
  const failedAt = '2026-06-14T10:15:00.000Z'

  const resultMap = [
    { result: 'passed', notes: '', failed_at: null, issue_url: null },
    {
      result: 'failed',
      notes: 'Login button required two clicks before submitting the form.',
      failed_at: failedAt,
      issue_url: 'https://github.com/example/repo/issues/42',
    },
    { result: 'skipped', notes: 'Deferred — depends on session fix in next sprint.', failed_at: null, issue_url: null },
  ]

  const passCount = resultMap.filter((r) => r.result === 'passed').length
  const failCount = resultMap.filter((r) => r.result === 'failed').length
  const skipCount = resultMap.filter((r) => r.result === 'skipped').length

  db.transaction(() => {
    const { lastInsertRowid: runId } = db
      .prepare(`
        INSERT INTO test_runs_v2 (suite_id, status, pass_count, fail_count, skip_count, start_time, end_time, created_by)
        VALUES (?, 'failed', ?, ?, ?, ?, ?, 'demo')
      `)
      .run(suite.id, passCount, failCount, skipCount, startTime, endTime)

    const insertResult = db.prepare(
      'INSERT INTO test_run_results (run_id, test_case_id, case_title, result, notes, failed_at, issue_url, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
    cases.forEach((c, i) => {
      const r = resultMap[i] ?? { result: 'skipped', notes: '', failed_at: null, issue_url: null }
      insertResult.run(runId, c.id, c.title, r.result, r.notes, r.failed_at, r.issue_url, i)
    })
  })()
}

export default db

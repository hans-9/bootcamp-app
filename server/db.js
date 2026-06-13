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

// Rank used for "sort by severity" — higher number = more severe, so
// ORDER BY rank DESC puts Critical first (matches "updated DESC = newest first").
export const SEVERITY_RANK = { Critical: 4, Major: 3, Minor: 2, Trivial: 1 }

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

// Seed once, only when the table is empty.
const { count } = db.prepare('SELECT COUNT(*) AS count FROM test_cases').get()
if (count === 0) seed()

const { suiteCount } = db.prepare('SELECT COUNT(*) AS suiteCount FROM test_suites').get()
if (suiteCount === 0) seedSuites()

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

export default db

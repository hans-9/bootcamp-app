import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, 'data.db'))
db.pragma('journal_mode = WAL')

// Allowed values, per CLAUDE.md.
export const SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial']
export const STATUSES = ['draft', 'ready', 'passed', 'failed', 'skipped']

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

// Seed once, only when the table is empty.
const { count } = db.prepare('SELECT COUNT(*) AS count FROM test_cases').get()
if (count === 0) seed()

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

export default db

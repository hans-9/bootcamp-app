import db, { SEVERITIES, THEMES, PAGE_SIZES } from '../db.js'

// ---- helpers ----

const ok = (res, data) => res.json({ success: true, data, error: null })
const fail = (res, status, message) =>
  res.status(status).json({ success: false, data: null, error: message })

const PREFS_ID = 1

const serialize = (row) => ({
  theme: row.theme,
  default_severity_for_new_bugs: row.default_severity_for_new_bugs,
  default_page_size: row.default_page_size,
  timezone: row.timezone,
  auto_generate_report_after_run: row.auto_generate_report_after_run === 1,
  updated_at: row.updated_at,
})

// The canonical IANA zone list when the runtime exposes it; otherwise null and
// we fall back to asking Intl.DateTimeFormat whether it accepts the name.
const IANA_ZONES =
  typeof Intl.supportedValuesOf === 'function' ? new Set(Intl.supportedValuesOf('timeZone')) : null

function isValidTimezone(tz) {
  if (tz === '') return true
  if (IANA_ZONES) return IANA_ZONES.has(tz)
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

function validate(body) {
  const theme = String(body.theme ?? '').trim()
  const default_severity_for_new_bugs = String(body.default_severity_for_new_bugs ?? '').trim()
  const default_page_size = Number(body.default_page_size)
  const timezone = String(body.timezone ?? '').trim()
  const auto_generate_report_after_run = body.auto_generate_report_after_run

  if (!THEMES.includes(theme)) return { error: `Theme must be one of: ${THEMES.join(', ')}.` }
  if (!SEVERITIES.includes(default_severity_for_new_bugs))
    return { error: `Default severity must be one of: ${SEVERITIES.join(', ')}.` }
  if (!PAGE_SIZES.includes(default_page_size))
    return { error: `Default page size must be one of: ${PAGE_SIZES.join(', ')}.` }
  if (timezone.length > 100 || !isValidTimezone(timezone))
    return { error: 'Timezone must be a valid IANA name (or blank to follow the browser).' }
  if (typeof auto_generate_report_after_run !== 'boolean')
    return { error: 'Auto-generate report must be true or false.' }

  return {
    value: {
      theme,
      default_severity_for_new_bugs,
      default_page_size,
      timezone,
      auto_generate_report_after_run: auto_generate_report_after_run ? 1 : 0,
    },
  }
}

// ---- handlers ----

export function handleGetSettings(req, res) {
  const row = db.prepare('SELECT * FROM user_preferences WHERE id = ?').get(PREFS_ID)
  if (!row) return fail(res, 404, 'Settings not found.')
  ok(res, serialize(row))
}

export function handleUpdateSettings(req, res) {
  const existing = db.prepare('SELECT * FROM user_preferences WHERE id = ?').get(PREFS_ID)
  if (!existing) return fail(res, 404, 'Settings not found.')

  // Match the optimistic-locking contract used by the bug routes.
  if (req.body.updated_at && req.body.updated_at !== existing.updated_at)
    return fail(res, 409, 'Settings changed since you opened them. Reload and try again.')

  // Merge incoming fields over the stored row, so a partial body updates only
  // what it sends instead of resetting the omitted columns.
  const merged = {
    theme: req.body.theme ?? existing.theme,
    default_severity_for_new_bugs:
      req.body.default_severity_for_new_bugs ?? existing.default_severity_for_new_bugs,
    default_page_size: req.body.default_page_size ?? existing.default_page_size,
    timezone: req.body.timezone ?? existing.timezone,
    auto_generate_report_after_run:
      req.body.auto_generate_report_after_run ?? (existing.auto_generate_report_after_run === 1),
  }

  const { value, error } = validate(merged)
  if (error) return fail(res, 400, error)

  db.prepare(
    `UPDATE user_preferences
       SET theme = @theme,
           default_severity_for_new_bugs = @default_severity_for_new_bugs,
           default_page_size = @default_page_size,
           timezone = @timezone,
           auto_generate_report_after_run = @auto_generate_report_after_run,
           updated_at = @updated_at
     WHERE id = @id`,
  ).run({ ...value, updated_at: new Date().toISOString(), id: PREFS_ID })

  const row = db.prepare('SELECT * FROM user_preferences WHERE id = ?').get(PREFS_ID)
  ok(res, serialize(row))
}

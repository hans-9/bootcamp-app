import { useEffect, useRef, useState } from 'react'
import { useSettings } from '../SettingsContext.jsx'

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]
const SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial']
const PAGE_SIZES = [10, 20, 50, 100]

const TIMEZONES =
  typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone

export default function SettingsPage() {
  const { settings, loading, save } = useSettings()
  const [form, setForm] = useState(settings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  // Seed the form once, when settings first load — not on every settings change,
  // so a slow fetch resolving mid-edit can't overwrite in-progress input.
  const seeded = useRef(false)
  useEffect(() => {
    if (!loading && !seeded.current) {
      setForm(settings)
      seeded.current = true
    }
  }, [loading, settings])

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const updated = await save({
        theme: form.theme,
        default_severity_for_new_bugs: form.default_severity_for_new_bugs,
        default_page_size: Number(form.default_page_size),
        timezone: form.timezone,
        auto_generate_report_after_run: form.auto_generate_report_after_run,
        updated_at: form.updated_at,
      })
      // Adopt the saved row (notably its fresh updated_at) so a second save in
      // the same session doesn't trip the optimistic-locking check.
      setForm(updated)
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="empty">Loading…</div>
      </div>
    )
  }

  // Keep a stored zone selectable even if it isn't in the browser's list.
  const tzOptions =
    form.timezone && !TIMEZONES.includes(form.timezone) ? [form.timezone, ...TIMEZONES] : TIMEZONES

  return (
    <div className="container">
      <div className="page-head">
        <h2>Settings</h2>
      </div>

      <form className="settings-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <section className="card settings-section">
          <h3>Appearance</h3>
          <p className="section-hint">Controls the color theme across the app.</p>
          <div className="field">
            <label htmlFor="theme">Theme</label>
            <select id="theme" value={form.theme} onChange={set('theme')}>
              {THEMES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="card settings-section">
          <h3>Defaults</h3>
          <p className="section-hint">Pre-filled values for new work.</p>
          <div className="field">
            <label htmlFor="default-severity">Default severity for new bugs</label>
            <select
              id="default-severity"
              value={form.default_severity_for_new_bugs}
              onChange={set('default_severity_for_new_bugs')}
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="default-page-size">Default page size</label>
            <select
              id="default-page-size"
              value={form.default_page_size}
              onChange={set('default_page_size')}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} per page
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="card settings-section">
          <h3>Localization</h3>
          <p className="section-hint">Used when displaying dates and times.</p>
          <div className="field">
            <label htmlFor="timezone">Timezone</label>
            <select id="timezone" value={form.timezone} onChange={set('timezone')}>
              <option value="">Browser default ({browserTz})</option>
              {tzOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="card settings-section">
          <h3>Test runs</h3>
          <p className="section-hint">Behavior after a test run finishes.</p>
          <div className="checkbox-field">
            <input
              id="auto-report"
              type="checkbox"
              checked={form.auto_generate_report_after_run}
              onChange={set('auto_generate_report_after_run')}
            />
            <label htmlFor="auto-report" style={{ marginBottom: 0, fontWeight: 400 }}>
              Automatically generate a report after a run completes
              <span className="hint" style={{ display: 'block' }}>
                Saved now; takes effect once automatic report generation ships.
              </span>
            </label>
          </div>
        </section>

        <div className="settings-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saved && <span className="saved-note">Saved</span>}
        </div>
      </form>
    </div>
  )
}

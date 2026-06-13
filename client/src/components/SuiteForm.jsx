import { useState } from 'react'

const SUITE_STATUSES = ['draft', 'ready', 'in-progress', 'passed', 'failed']

const blank = { name: '', feature: '', status: 'draft' }

// `initial` is a suite to edit, or null/undefined to create a new one.
export default function SuiteForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() => (initial ? { ...initial } : blank))
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Name is required.')
    if (!form.feature.trim()) return setError('Feature is required.')

    setSaving(true)
    setError(null)
    try {
      await onSave({
        name: form.name.trim(),
        feature: form.feature.trim(),
        status: form.status,
      })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h3>{initial ? 'Edit suite' : 'New suite'}</h3>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Name <span className="required-mark">*</span></label>
            <input
              value={form.name}
              onChange={set('name')}
              placeholder="Login flow"
              style={{ width: '100%' }}
              autoFocus
            />
          </div>

          <div className="field">
            <label>Feature <span className="required-mark">*</span></label>
            <input
              value={form.feature}
              onChange={set('feature')}
              placeholder="login"
              style={{ width: '100%' }}
            />
          </div>

          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={set('status')} style={{ width: '100%' }}>
              {SUITE_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : initial ? 'Save changes' : 'Create suite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

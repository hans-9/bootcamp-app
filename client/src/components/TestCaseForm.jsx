import { useState } from 'react'

const SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial']
const STATUSES = ['draft', 'ready', 'passed', 'failed', 'skipped']

const blank = {
  title: '',
  preconditions: '',
  steps: [''],
  expected_result: '',
  severity: 'Major',
  status: 'draft',
}

// `initial` is a test case to edit, or null/undefined to create a new one.
export default function TestCaseForm({ initial, onSave, onClose, findDuplicateTitle }) {
  const [form, setForm] = useState(() =>
    initial ? { ...initial, steps: initial.steps.length ? initial.steps : [''] } : blank,
  )
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const setStep = (i, value) =>
    setForm((f) => ({ ...f, steps: f.steps.map((s, idx) => (idx === i ? value : s)) }))
  const addStep = () => setForm((f) => ({ ...f, steps: [...f.steps, ''] }))
  const removeStep = (i) =>
    setForm((f) => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }))

  async function handleSubmit(e) {
    e.preventDefault()
    const steps = form.steps.map((s) => s.trim()).filter(Boolean)
    if (!form.title.trim()) return setError('Title is required.')
    if (steps.length === 0) return setError('Add at least one step.')
    if (!form.expected_result.trim()) return setError('Expected result is required.')

    setSaving(true)
    setError(null)
    try {
      if (!initial && findDuplicateTitle) {
        const dup = await findDuplicateTitle(form.title.trim())
        if (
          dup &&
          !window.confirm(
            `A test case titled "${dup}" already exists. Create another with the same title?`,
          )
        ) {
          setSaving(false)
          return
        }
      }

      await onSave({
        title: form.title.trim(),
        preconditions: form.preconditions.trim(),
        steps,
        expected_result: form.expected_result.trim(),
        severity: form.severity,
        status: form.status,
        updated_at: initial?.updated_at,
      })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h3>{initial ? 'Edit test case' : 'New test case'}</h3>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Title <span className="required-mark">*</span></label>
            <input
              value={form.title}
              onChange={set('title')}
              placeholder="User logs in with valid credentials"
              style={{ width: '100%' }}
              autoFocus
            />
          </div>

          <div className="field">
            <label>Preconditions <span className="hint">(optional)</span></label>
            <textarea
              value={form.preconditions}
              onChange={set('preconditions')}
              rows={2}
              placeholder="App is running. Account test@example.com / Password123 exists."
            />
          </div>

          <div className="field">
            <label>Steps <span className="required-mark">*</span></label>
            {form.steps.map((step, i) => (
              <div className="step-row" key={i}>
                <span className="num">{i + 1}.</span>
                <input
                  value={step}
                  onChange={(e) => setStep(i, e.target.value)}
                  placeholder="Describe one action"
                  aria-label={`Step ${i + 1}`}
                />
                {form.steps.length > 1 && (
                  <button
                    type="button"
                    className="remove"
                    onClick={() => removeStep(i)}
                    aria-label="Remove step"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-sm" onClick={addStep}>
              + Add step
            </button>
          </div>

          <div className="field">
            <label>Expected result <span className="required-mark">*</span></label>
            <textarea
              value={form.expected_result}
              onChange={set('expected_result')}
              rows={2}
              placeholder="User lands on the dashboard and their email shows in the header."
            />
          </div>

          <div style={{ display: 'flex', gap: 14 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Severity <span className="required-mark">*</span></label>
              <select value={form.severity} onChange={set('severity')} style={{ width: '100%' }}>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Status</label>
              <select value={form.status} onChange={set('status')} style={{ width: '100%' }}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : initial ? 'Save changes' : 'Create test case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

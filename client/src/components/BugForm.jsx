import { useState } from 'react'

const SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial']
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']

const blank = {
  title: '',
  description: '',
  severity: 'Major',
  priority: 'Medium',
  steps_to_reproduce: [''],
  expected: '',
  actual: '',
  environment: '',
}

// `initial` is a bug to edit, or null/undefined to create a new one.
export default function BugForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() =>
    initial
      ? { ...initial, steps_to_reproduce: initial.steps_to_reproduce.length ? initial.steps_to_reproduce : [''] }
      : blank,
  )
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const setStep = (i, value) =>
    setForm((f) => ({ ...f, steps_to_reproduce: f.steps_to_reproduce.map((s, idx) => (idx === i ? value : s)) }))
  const addStep = () => setForm((f) => ({ ...f, steps_to_reproduce: [...f.steps_to_reproduce, ''] }))
  const removeStep = (i) =>
    setForm((f) => ({ ...f, steps_to_reproduce: f.steps_to_reproduce.filter((_, idx) => idx !== i) }))

  async function handleSubmit(e) {
    e.preventDefault()
    const steps = form.steps_to_reproduce.map((s) => s.trim()).filter(Boolean)
    if (!form.title.trim()) return setError('Title is required.')
    if (steps.length === 0) return setError('Add at least one step to reproduce.')

    setSaving(true)
    setError(null)
    try {
      await onSave({
        title: form.title.trim(),
        description: form.description.trim(),
        severity: form.severity,
        priority: form.priority,
        steps_to_reproduce: steps,
        expected: form.expected.trim(),
        actual: form.actual.trim(),
        environment: form.environment.trim(),
      })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h3>{initial ? 'Edit bug' : 'Report a bug'}</h3>
        {error && <div className="form-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Title <span className="required-mark">*</span></label>
            <input
              value={form.title}
              onChange={set('title')}
              placeholder="Login button unresponsive on first click"
              style={{ width: '100%' }}
              autoFocus
            />
          </div>

          <div className="field">
            <label>Description</label>
            <textarea value={form.description} onChange={set('description')} rows={2} />
          </div>

          <div style={{ display: 'flex', gap: 14 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Severity <span className="required-mark">*</span></label>
              <select value={form.severity} onChange={set('severity')} style={{ width: '100%' }}>
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Priority</label>
              <select value={form.priority} onChange={set('priority')} style={{ width: '100%' }}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Steps to reproduce <span className="required-mark">*</span></label>
            {form.steps_to_reproduce.map((step, i) => (
              <div className="step-row" key={i}>
                <span className="num">{i + 1}.</span>
                <input
                  value={step}
                  onChange={(e) => setStep(i, e.target.value)}
                  placeholder="Describe one action"
                />
                {form.steps_to_reproduce.length > 1 && (
                  <button type="button" className="remove" onClick={() => removeStep(i)} aria-label="Remove step">
                    ×
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-sm" onClick={addStep}>+ Add step</button>
          </div>

          <div style={{ display: 'flex', gap: 14 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Expected</label>
              <textarea value={form.expected} onChange={set('expected')} rows={2} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Actual</label>
              <textarea value={form.actual} onChange={set('actual')} rows={2} />
            </div>
          </div>

          <div className="field">
            <label>Environment</label>
            <input
              value={form.environment}
              onChange={set('environment')}
              placeholder="Chrome 125, macOS 14"
              style={{ width: '100%' }}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : initial ? 'Save changes' : 'Create bug'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

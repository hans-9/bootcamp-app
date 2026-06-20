import { useState } from 'react'
import { Link } from 'react-router-dom'
import { previewImport, commitImport } from '../api.js'
import SeverityBadge from '../components/SeverityBadge.jsx'

const SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial']
const MAX_BYTES = 5 * 1024 * 1024 // matches the server's 5mb import limit

export default function TestCaseImportPage() {
  const [fileName, setFileName] = useState('')
  const [csv, setCsv] = useState('')
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [expectedValid, setExpectedValid] = useState(0)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  function reset() {
    setCsv('')
    setFileName('')
    setPreview(null)
    setResult(null)
    setError(null)
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return

    setError(null)
    setPreview(null)
    setResult(null)

    if (!/\.csv$/i.test(file.name)) {
      setError('Please choose a .csv file.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('That file is larger than the 5 MB import limit. Split it into smaller files.')
      return
    }

    setFileName(file.name)
    setBusy(true)
    try {
      const text = await file.text()
      setCsv(text)
      const report = await previewImport(text)
      setPreview(report)
    } catch (err) {
      setError(err.message)
      setFileName('')
      setCsv('')
    } finally {
      setBusy(false)
    }
  }

  async function handleImport() {
    const expected = preview.summary.valid
    if (
      !window.confirm(
        `Import ${expected} test case${expected === 1 ? '' : 's'}? Imported rows can't be removed in bulk.`,
      )
    )
      return
    setBusy(true)
    setError(null)
    try {
      const res = await commitImport(csv)
      setExpectedValid(expected)
      setResult(res)
      setPreview(null)
    } catch (err) {
      setError(
        err.status === 413
          ? 'That file is too large to import (5 MB limit).'
          : err.message,
      )
    } finally {
      setBusy(false)
    }
  }

  const validCount = preview?.summary.valid ?? 0

  return (
    <div className="container">
      <div className="page-head">
        <h2>Import Test Cases</h2>
        <Link to="/test-cases" className="btn">
          ← Back to test cases
        </Link>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 16 }}>
        <p style={{ marginTop: 0 }}>
          Upload a CSV file. Required columns: <code>title</code>, <code>severity</code>,{' '}
          <code>steps</code>. Optional: <code>preconditions</code>, <code>expected_result</code>,{' '}
          <code>status</code>.
        </p>
        <p className="muted" style={{ fontSize: 13 }}>
          Put one step per line inside the <code>steps</code> cell. Severity must be one of{' '}
          {SEVERITIES.join(', ')}. A row needs a non-empty <code>expected_result</code> to be
          valid. Rows with a title that already exists (or repeats earlier in the file) are
          skipped.
        </p>
        <label className="btn btn-primary" style={{ display: 'inline-block', cursor: 'pointer' }}>
          {busy && !preview && !result ? 'Reading…' : 'Choose CSV file'}
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            disabled={busy}
            style={{ display: 'none' }}
          />
        </label>
        {fileName && <span className="muted" style={{ marginLeft: 10 }}>{fileName}</span>}
      </div>

      {error && <div className="form-error">{error}</div>}

      {busy && !preview && !result && <div className="empty">Validating…</div>}

      {result && (
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ marginTop: 0 }}>Import complete</h3>
          {result.imported !== expectedValid && (
            <div className="form-error">
              Heads up: {expectedValid} row{expectedValid === 1 ? '' : 's'} {expectedValid === 1 ? 'was' : 'were'} valid
              at preview, but {result.imported} {result.imported === 1 ? 'was' : 'were'} imported — the data changed in
              between. Review the skipped rows below.
            </div>
          )}
          <p>
            Imported <strong>{result.imported}</strong> test case
            {result.imported === 1 ? '' : 's'}.
            {result.skipped > 0 && <> Skipped <strong>{result.skipped}</strong>.</>}
          </p>
          {result.errors.length > 0 && (
            <table style={{ marginTop: 10 }}>
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Row</th>
                  <th>Title</th>
                  <th>Reason skipped</th>
                </tr>
              </thead>
              <tbody>
                {result.errors.map((r) => (
                  <tr key={r.rowNumber}>
                    <td className="muted">{r.rowNumber}</td>
                    <td>{r.title}</td>
                    <td className="muted">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <Link to="/test-cases" className="btn btn-primary">
              View test cases
            </Link>
            <button className="btn" onClick={reset}>
              Import another file
            </button>
          </div>
        </div>
      )}

      {preview && !result && (
        <>
          <div className="toolbar">
            <strong>{preview.summary.total}</strong> row
            {preview.summary.total === 1 ? '' : 's'} · {preview.summary.valid} valid ·{' '}
            {preview.summary.invalid} will be skipped
          </div>
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 50 }}>Row</th>
                  <th>Title</th>
                  <th>Severity</th>
                  <th style={{ width: 60 }}>Steps</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.rowNumber}>
                    <td className="muted">{r.rowNumber}</td>
                    <td className="title-cell">{r.title}</td>
                    <td>{SEVERITIES.includes(r.severity) ? <SeverityBadge severity={r.severity} /> : <span className="muted">{r.severity || '—'}</span>}</td>
                    <td className="muted">{r.stepCount}</td>
                    <td>
                      {r.valid ? (
                        <span className="status-pill st-passed">
                          <span className="dot" />
                          Valid
                        </span>
                      ) : (
                        <span className="status-pill st-failed" style={{ alignItems: 'flex-start' }}>
                          <span className="dot" style={{ marginTop: 5 }} />
                          {r.errors.join(' ')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.rows.length === 0 && <div className="empty">No data rows found in the file.</div>}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={busy || validCount === 0}
            >
              {busy ? 'Importing…' : `Import ${validCount} valid row${validCount === 1 ? '' : 's'}`}
            </button>
            <button className="btn" onClick={reset} disabled={busy}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}

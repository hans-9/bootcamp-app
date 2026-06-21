import { useEffect, useState } from 'react'
import { listTestCases } from '../api.js'
import SeverityBadge from './SeverityBadge.jsx'

// `existingIds` is a Set of case ids already in the suite (hidden from the list).
// `onAdd(caseId)` should resolve once the case is added; the modal stays open so
// several cases can be added in a row.
export default function AddCaseModal({ existingIds, onAdd, onClose }) {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    let active = true
    setLoading(true)
    listTestCases({ search })
      .then((res) => active && setData(res))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [search])

  async function add(caseId) {
    setBusyId(caseId)
    try {
      await onAdd(caseId)
    } catch (err) {
      window.alert(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const available = (data?.items ?? []).filter((tc) => !existingIds.has(tc.id))

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h3>Add test cases</h3>
        <div className="field">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title…"
            aria-label="Search test cases by title"
            style={{ width: '100%' }}
            autoFocus
          />
        </div>

        <div className="picker-list">
          {loading && <div className="empty">Loading…</div>}
          {error && !loading && <div className="empty">Error: {error}</div>}
          {!loading && !error && available.length === 0 && (
            <div className="empty">No test cases to add.</div>
          )}
          {available.map((tc) => (
            <div className="picker-row" key={tc.id}>
              <span className="picker-title">{tc.title}</span>
              <SeverityBadge severity={tc.severity} />
              <button
                className="btn btn-sm btn-primary"
                onClick={() => add(tc.id)}
                disabled={busyId === tc.id}
              >
                {busyId === tc.id ? 'Adding…' : 'Add'}
              </button>
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}

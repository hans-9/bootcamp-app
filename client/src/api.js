// Thin wrapper around fetch that unwraps the { success, data, error } envelope.
// Resolves to `data` on success, throws Error(error) otherwise.
async function request(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  let body
  try {
    body = await res.json()
  } catch {
    throw new Error(`Unexpected response (${res.status})`)
  }
  if (!body.success) {
    const err = new Error(body.error || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return body.data
}

export function listTestCases({ page, search, title, status, sort, dir } = {}) {
  const qs = new URLSearchParams()
  if (page) qs.set('page', page)
  if (search) qs.set('search', search)
  if (title) qs.set('title', title)
  if (status) qs.set('status', status)
  if (sort) qs.set('sort', sort)
  if (dir) qs.set('dir', dir)
  return request(`/api/test-cases?${qs.toString()}`)
}

export const createTestCase = (payload) =>
  request('/api/test-cases', { method: 'POST', body: JSON.stringify(payload) })

export const updateTestCase = (id, payload) =>
  request(`/api/test-cases/${id}`, { method: 'PUT', body: JSON.stringify(payload) })

export const deleteTestCase = (id) =>
  request(`/api/test-cases/${id}`, { method: 'DELETE' })

export function listSuites({ status } = {}) {
  const qs = new URLSearchParams()
  if (status) qs.set('status', status)
  return request(`/api/test-suites?${qs.toString()}`)
}

export const getSuite = (id) => request(`/api/test-suites/${id}`)

export const createSuite = (payload) =>
  request('/api/test-suites', { method: 'POST', body: JSON.stringify(payload) })

export const updateSuite = (id, payload) =>
  request(`/api/test-suites/${id}`, { method: 'PUT', body: JSON.stringify(payload) })

export const deleteSuite = (id) =>
  request(`/api/test-suites/${id}`, { method: 'DELETE' })

export const addCaseToSuite = (id, caseId) =>
  request(`/api/test-suites/${id}/cases`, { method: 'POST', body: JSON.stringify({ case_id: caseId }) })

export const removeCaseFromSuite = (id, caseId) =>
  request(`/api/test-suites/${id}/cases/${caseId}`, { method: 'DELETE' })

export const reorderSuiteCases = (id, caseIds) =>
  request(`/api/test-suites/${id}/cases/order`, {
    method: 'PUT',
    body: JSON.stringify({ case_ids: caseIds }),
  })

export function listBugs({ status, severity, priority, search, sort, dir } = {}) {
  const qs = new URLSearchParams()
  if (status) qs.set('status', status)
  if (severity) qs.set('severity', severity)
  if (priority) qs.set('priority', priority)
  if (search) qs.set('search', search)
  if (sort) qs.set('sort', sort)
  if (dir) qs.set('dir', dir)
  return request(`/api/bugs?${qs.toString()}`)
}

export const getBug = (id) => request(`/api/bugs/${id}`)

export const createBug = (payload) =>
  request('/api/bugs', { method: 'POST', body: JSON.stringify(payload) })

export const updateBug = (id, payload) =>
  request(`/api/bugs/${id}`, { method: 'PUT', body: JSON.stringify(payload) })

export const deleteBug = (id) =>
  request(`/api/bugs/${id}`, { method: 'DELETE' })

export const changeBugStatus = (id, status, message, updatedAt) =>
  request(`/api/bugs/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, message, updated_at: updatedAt }),
  })

export const addBugComment = (id, message) =>
  request(`/api/bugs/${id}/comments`, { method: 'POST', body: JSON.stringify({ message }) })

export const listRuns = () => request('/api/test-runs')

export const getRun = (id) => request(`/api/test-runs/${id}`)

export const createRun = (suiteId, createdBy = '') =>
  request('/api/test-runs', {
    method: 'POST',
    body: JSON.stringify({ suite_id: suiteId, created_by: createdBy }),
  })

export const updateRunResult = (runId, resultId, payload) =>
  request(`/api/test-runs/${runId}/results/${resultId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

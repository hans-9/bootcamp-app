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
  if (!body.success) throw new Error(body.error || `Request failed (${res.status})`)
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

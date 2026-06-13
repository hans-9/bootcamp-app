import express from 'express'
import {
  handleListTestCases,
  handleGetTestCase,
  handleCreateTestCase,
  handleUpdateTestCase,
  handleDeleteTestCase,
} from './test-cases.js'
import {
  handleListSuites,
  handleGetSuite,
  handleCreateSuite,
  handleUpdateSuite,
  handleDeleteSuite,
  handleAddCaseToSuite,
  handleRemoveCaseFromSuite,
  handleReorderSuiteCases,
} from './suites.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' }, error: null })
})

app.get('/api/test-cases', handleListTestCases)
app.get('/api/test-cases/:id', handleGetTestCase)
app.post('/api/test-cases', handleCreateTestCase)
app.put('/api/test-cases/:id', handleUpdateTestCase)
app.delete('/api/test-cases/:id', handleDeleteTestCase)

app.get('/api/test-suites', handleListSuites)
app.post('/api/test-suites', handleCreateSuite)
app.get('/api/test-suites/:id', handleGetSuite)
app.put('/api/test-suites/:id', handleUpdateSuite)
app.delete('/api/test-suites/:id', handleDeleteSuite)
app.post('/api/test-suites/:id/cases', handleAddCaseToSuite)
app.put('/api/test-suites/:id/cases/order', handleReorderSuiteCases)
app.delete('/api/test-suites/:id/cases/:caseId', handleRemoveCaseFromSuite)

// Unmatched API routes still return the { success, data, error } shape.
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, data: null, error: `Cannot ${req.method} ${req.path}` })
})

// Any thrown error (incl. malformed JSON bodies) returns the same shape.
app.use((err, req, res, next) => {
  const status = err.status || 500
  const message =
    status === 400
      ? 'Invalid request body.'
      : status === 413
        ? 'Request body is too large.'
        : 'Internal server error.'
  res.status(status).json({ success: false, data: null, error: message })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

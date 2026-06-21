import express from 'express'
import {
  handleListTestCases,
  handleExportTestCases,
  handleGetTestCase,
  handleCreateTestCase,
  handleUpdateTestCase,
  handleDeleteTestCase,
} from './routes/test-cases.js'
import {
  handleListSuites,
  handleGetSuite,
  handleCreateSuite,
  handleUpdateSuite,
  handleDeleteSuite,
  handleAddCaseToSuite,
  handleRemoveCaseFromSuite,
  handleReorderSuiteCases,
} from './routes/suites.js'
import {
  handleListBugs,
  handleGetBug,
  handleCreateBug,
  handleUpdateBug,
  handleDeleteBug,
  handleChangeBugStatus,
  handleAddBugComment,
} from './routes/bugs.js'
import {
  handleListRuns,
  handleCreateRun,
  handleGetRun,
  handleUpdateResult,
} from './routes/test-runs.js'
import { handleImportPreview, handleImportCommit } from './routes/imports.js'
import { handleGetMetrics, handleGetTrends } from './routes/dashboard.js'
import {
  handleListReports,
  handleGetReport,
  handleCreateReport,
  handleExportReportHtml,
} from './routes/reports.js'
import { handleGetSettings, handleUpdateSettings } from './routes/settings.js'
import { handleSearch } from './routes/search.js'

const app = express()
const PORT = process.env.PORT || 3001

// CSV import ships the whole file as JSON, so it gets a higher limit. The
// global parser must skip these paths or it would cap them at 100kb first.
const importJson = express.json({ limit: '5mb' })
const standardJson = express.json({ limit: '100kb' })
app.use((req, res, next) => {
  if (req.path.startsWith('/api/test-cases/import/')) return importJson(req, res, next)
  return standardJson(req, res, next)
})

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' }, error: null })
})

app.post('/api/test-cases/import/preview', handleImportPreview)
app.post('/api/test-cases/import/commit', handleImportCommit)

app.get('/api/test-cases', handleListTestCases)
app.get('/api/test-cases/export', handleExportTestCases)
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

app.get('/api/bugs', handleListBugs)
app.post('/api/bugs', handleCreateBug)
app.get('/api/bugs/:id', handleGetBug)
app.put('/api/bugs/:id', handleUpdateBug)
app.delete('/api/bugs/:id', handleDeleteBug)
app.patch('/api/bugs/:id/status', handleChangeBugStatus)
app.post('/api/bugs/:id/comments', handleAddBugComment)

app.get('/api/dashboard/metrics', handleGetMetrics)
app.get('/api/dashboard/trends', handleGetTrends)

app.get('/api/test-runs', handleListRuns)
app.post('/api/test-runs', handleCreateRun)
app.get('/api/test-runs/:id', handleGetRun)
app.patch('/api/test-runs/:id/results/:resultId', handleUpdateResult)

app.get('/api/reports', handleListReports)
app.post('/api/reports', handleCreateReport)
app.get('/api/reports/:id', handleGetReport)
app.get('/api/reports/:id/export/html', handleExportReportHtml)

app.get('/api/settings', handleGetSettings)
app.put('/api/settings', handleUpdateSettings)

app.get('/api/search', handleSearch)

// Unmatched API routes still return the { success, data, error } shape.
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, data: null, error: `Cannot ${req.method} ${req.path}` })
})

// Any thrown error (incl. malformed JSON bodies) returns the same shape.
app.use((err, req, res, next) => {
  const status = err.status || 500
  if (status >= 500) console.error(`${req.method} ${req.originalUrl} →`, err)
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

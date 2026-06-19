import db from '../db.js'

const ok = (res, data) => res.json({ success: true, data, error: null })
const fail = (res, status, message) =>
  res.status(status).json({ success: false, data: null, error: message })

// Snapshots are immutable, but a malformed `results` blob must not 500 the
// whole report — fall back to an empty array and log which row is broken.
function parseReport(row) {
  let results = []
  try {
    results = JSON.parse(row.results)
  } catch {
    console.error(`reports: corrupt results JSON for report id=${row.id}`)
  }
  return { ...row, results }
}

export function handleListReports(req, res) {
  const rows = db
    .prepare(
      `SELECT id, run_id, suite_name, run_date, total_count, passed_count, failed_count, skipped_count, generated_at
       FROM reports
       ORDER BY generated_at DESC, id DESC`,
    )
    .all()
  ok(res, rows)
}

export function handleGetReport(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return fail(res, 400, 'Invalid report id.')
  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(id)
  if (!row) return fail(res, 404, 'Report not found.')
  ok(res, parseReport(row))
}

export function handleCreateReport(req, res) {
  const runId = Number(req.body.run_id)
  if (!Number.isInteger(runId) || runId <= 0)
    return fail(res, 400, 'A numeric run_id is required.')

  const run = db
    .prepare(
      `SELECT r.*, s.name AS suite_name
       FROM test_runs_v2 r
       JOIN test_suites s ON s.id = r.suite_id
       WHERE r.id = ?`,
    )
    .get(runId)
  if (!run) return fail(res, 404, 'Run not found.')

  const results = db
    .prepare(
      `SELECT test_case_id, case_title, result, duration_ms, notes, failed_at, issue_url
       FROM test_run_results WHERE run_id = ? ORDER BY sort_order, id`,
    )
    .all(runId)

  // Derive counts from the snapshotted results (not the live run row) so the
  // report is internally consistent even for a still-running run. Cases with a
  // null result are pending — total may exceed passed + failed + skipped.
  const passed = results.filter((r) => r.result === 'passed').length
  const failed = results.filter((r) => r.result === 'failed').length
  const skipped = results.filter((r) => r.result === 'skipped').length

  const now = new Date().toISOString()
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO reports (run_id, suite_name, run_date, total_count, passed_count, failed_count, skipped_count, results, generated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      runId,
      run.suite_name,
      run.start_time,
      results.length,
      passed,
      failed,
      skipped,
      JSON.stringify(results),
      now,
    )

  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(lastInsertRowid)
  res.status(201).json({ success: true, data: parseReport(row), error: null })
}

// This route serves a file, not the JSON envelope, so errors are returned as a
// small HTML page — a raw JSON blob in the browser would just confuse the user.
const failHtml = (res, status, message) =>
  res
    .status(status)
    .type('html')
    .send(
      `<!doctype html><meta charset="utf-8"><title>Report export error</title>` +
        `<body style="font-family:-apple-system,sans-serif;padding:48px;color:#1c2530">` +
        `<h1 style="font-size:20px">${esc(message)}</h1>` +
        `<p><a href="/reports" style="color:#2f6feb">← Back to Reports</a></p></body>`,
    )

export function handleExportReportHtml(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return failHtml(res, 400, 'Invalid report id.')
  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(id)
  if (!row) return failHtml(res, 404, 'Report not found.')

  const report = parseReport(row)
  // `?view=print` opens the same styled export inline and fires the print
  // dialog, so Print/Save-as-PDF matches the download exactly. Default stays
  // a file download.
  const printMode = req.query.view === 'print'

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  if (printMode) {
    res.setHeader('Content-Disposition', 'inline')
  } else {
    const slug = report.suite_name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
    res.setHeader('Content-Disposition', `attachment; filename="report-${report.id}-${slug || 'suite'}.html"`)
  }
  res.send(renderReportHtml(report, { autoPrint: printMode }))
}

// Only http(s) links are safe to render — a stored `javascript:` URL would
// otherwise stay clickable in the self-contained export file.
const isHttpUrl = (u) => /^https?:\/\//i.test(u || '')

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c])

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function renderReportHtml(report, { autoPrint = false } = {}) {
  const decided = report.passed_count + report.failed_count
  const passRate = decided === 0 ? null : Math.round((report.passed_count / decided) * 100)
  const pending =
    report.total_count - report.passed_count - report.failed_count - report.skipped_count
  const overall =
    pending > 0 ? 'pending' : report.failed_count > 0 ? 'failed' : report.passed_count > 0 ? 'passed' : 'pending'
  const overallLabel = { passed: 'All passed', failed: 'Failures present', pending: 'In progress' }[overall]

  // Stacked bar segments — proportions of the whole run. Skip zero-width
  // segments so a thin sliver never shows for a count of 0.
  const total = report.total_count || 1
  const seg = (count, cls) =>
    count > 0 ? `<span class="seg ${cls}" style="width:${(count / total) * 100}%"></span>` : ''
  const bar =
    seg(report.passed_count, 'passed') +
    seg(report.failed_count, 'failed') +
    seg(report.skipped_count, 'skipped') +
    seg(pending, 'pending')

  const rows = report.results
    .map((r, i) => {
      const result = r.result ?? 'pending'
      const dur = r.duration_ms == null ? '—' : `${r.duration_ms} ms`
      const issue = isHttpUrl(r.issue_url)
        ? `<a href="${esc(r.issue_url)}">View issue ↗</a>`
        : '<span class="empty">—</span>'
      const notes = r.notes ? `<div class="notes">${esc(r.notes)}</div>` : ''
      return `<tr>
        <td class="num">${i + 1}</td>
        <td class="case">${esc(r.case_title)}${notes}</td>
        <td><span class="badge ${result}">${esc(result)}</span></td>
        <td class="dur">${dur}</td>
        <td class="issue">${issue}</td>
      </tr>`
    })
    .join('\n')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Test Report — ${esc(report.suite_name)}</title>
<style>
  :root {
    --ink: #15202b;
    --muted: #5b6875;
    --faint: #8b97a4;
    --hairline: #e6e9ed;
    --surface: #ffffff;
    --canvas: #f4f6f8;
    --accent: #3b5bdb;
    --pass: #18794e; --pass-bg: #e7f6ed;
    --fail: #c0392b; --fail-bg: #fde8e6;
    --skip: #a15c07; --skip-bg: #fbf0db;
    --pend: #5b6875; --pend-bg: #eef1f4;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: var(--ink);
    background: var(--canvas);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  .sheet {
    max-width: 920px; margin: 24px auto; padding: 40px 40px 32px;
    background: var(--surface); border: 1px solid var(--hairline); border-radius: 14px;
    box-shadow: 0 1px 2px rgba(21,32,43,.04), 0 12px 32px rgba(21,32,43,.06);
  }

  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
  .brand { display: flex; align-items: center; gap: 9px; font-size: 12px; font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 14px; }
  .brand .dot { width: 18px; height: 18px; border-radius: 5px; background: var(--accent);
    display: inline-flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; }
  h1 { font-size: 28px; line-height: 1.2; margin: 0 0 12px; letter-spacing: -.01em; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px 0; font-size: 13px; color: var(--muted); }
  .meta span + span::before { content: "·"; margin: 0 9px; color: #cdd4db; }
  .verdict { flex-shrink: 0; text-align: right; }
  .verdict .pill {
    display: inline-flex; align-items: center; gap: 7px; padding: 7px 14px; border-radius: 999px;
    font-size: 13px; font-weight: 700; white-space: nowrap;
  }
  .verdict .pill::before { content: ""; width: 8px; height: 8px; border-radius: 999px; background: currentColor; }
  .pill.passed { background: var(--pass-bg); color: var(--pass); }
  .pill.failed { background: var(--fail-bg); color: var(--fail); }
  .pill.pending { background: var(--pend-bg); color: var(--pend); }

  .rate { margin: 26px 0 22px; }
  .rate-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 9px; }
  .rate-head .big { font-size: 22px; font-weight: 700; }
  .rate-head .big small { font-size: 13px; font-weight: 500; color: var(--faint); margin-left: 6px; }
  .rate-head .ratio { font-size: 13px; color: var(--muted); }
  .bar { display: flex; height: 12px; border-radius: 999px; overflow: hidden; background: var(--pend-bg); }
  .seg { display: block; height: 100%; }
  .seg.passed { background: #2bb673; }
  .seg.failed { background: #e0594b; }
  .seg.skipped { background: #e0a13a; }
  .seg.pending { background: #c2cbd4; }

  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 0 0 30px; }
  .stat { border: 1px solid var(--hairline); border-radius: 10px; padding: 14px 16px; background: var(--surface); position: relative; }
  .stat::before { content: ""; position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 999px; background: var(--faint); }
  .stat.passed::before { background: var(--pass); }
  .stat.failed::before { background: var(--fail); }
  .stat.skipped::before { background: var(--skip); }
  .stat .value { font-size: 28px; font-weight: 700; line-height: 1; }
  .stat .label { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin-top: 6px; }
  .stat.passed .value { color: var(--pass); }
  .stat.failed .value { color: var(--fail); }
  .stat.skipped .value { color: var(--skip); }

  .section-label { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
    color: var(--muted); margin: 0 0 10px; }
  table { width: 100%; border-collapse: collapse; border: 1px solid var(--hairline); border-radius: 10px; overflow: hidden; }
  th, td { text-align: left; padding: 12px 16px; border-bottom: 1px solid var(--hairline); vertical-align: top; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); background: #fafbfc; font-weight: 700; }
  tbody tr:nth-child(even) { background: #fbfcfd; }
  tr:last-child td { border-bottom: none; }
  td.num { color: var(--faint); width: 36px; font-variant-numeric: tabular-nums; }
  td.case { font-weight: 600; max-width: 380px; }
  td.dur, td.issue { white-space: nowrap; color: var(--muted); font-size: 13px; font-variant-numeric: tabular-nums; }
  .empty { color: #c2cbd4; }
  .notes { font-weight: 400; color: var(--muted); font-size: 13px; margin-top: 5px; line-height: 1.45; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  .badge {
    display: inline-block; padding: 3px 11px; border-radius: 999px;
    font-size: 12px; font-weight: 700; text-transform: capitalize;
  }
  .badge.passed { background: var(--pass-bg); color: var(--pass); }
  .badge.failed { background: var(--fail-bg); color: var(--fail); }
  .badge.skipped { background: var(--skip-bg); color: var(--skip); }
  .badge.pending { background: var(--pend-bg); color: var(--pend); }

  footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;
    margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--hairline);
    font-size: 12px; color: var(--faint); }

  @media print {
    body { background: #fff; }
    .sheet { max-width: none; margin: 0; padding: 0; border: none; box-shadow: none; border-radius: 0; }
    .stat, table, th, td, footer, .section-label { border-color: #ccc !important; }
    .stat, tr, .rate { break-inside: avoid; }
    thead { display: table-header-group; }
    a { color: var(--ink); }
    a:hover { text-decoration: none; }
    .seg, .badge, .pill, .stat::before, .brand .dot { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { margin: 14mm; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <header>
      <div>
        <div class="brand"><span class="dot">✓</span> Bootcamp QA · Test Report</div>
        <h1>${esc(report.suite_name)}</h1>
        <div class="meta">
          <span>Run #${report.run_id}</span>
          <span>Executed ${esc(formatDateTime(report.run_date))}</span>
        </div>
      </div>
      <div class="verdict">
        <span class="pill ${overall}">${overallLabel}</span>
      </div>
    </header>

    <div class="rate">
      <div class="rate-head">
        <div class="big">${passRate == null ? '—' : passRate + '%'}<small>pass rate (of decided)</small></div>
        <div class="ratio">${report.passed_count} of ${decided} decided passed</div>
      </div>
      <div class="bar">${bar}</div>
    </div>

    <div class="summary">
      <div class="stat"><div class="value">${report.total_count}</div><div class="label">Total</div></div>
      <div class="stat passed"><div class="value">${report.passed_count}</div><div class="label">Passed</div></div>
      <div class="stat failed"><div class="value">${report.failed_count}</div><div class="label">Failed</div></div>
      <div class="stat skipped"><div class="value">${report.skipped_count}</div><div class="label">Skipped</div></div>
    </div>

    <p class="section-label">Results${pending > 0 ? ` · ${pending} pending` : ''}</p>
    <table>
      <thead>
        <tr><th>#</th><th>Test case</th><th>Result</th><th>Duration</th><th>Issue</th></tr>
      </thead>
      <tbody>
${rows || '<tr><td colspan="5" style="text-align:center;color:#9aa5b1;padding:32px">No results in this run.</td></tr>'}
      </tbody>
    </table>

    <footer>
      <span>Generated ${esc(formatDateTime(report.generated_at))}</span>
      <span>Bootcamp App · Report #${report.id}</span>
    </footer>
  </div>
${autoPrint ? '<script>window.addEventListener("load",function(){window.focus();window.print()})</script>' : ''}
</body>
</html>`
}

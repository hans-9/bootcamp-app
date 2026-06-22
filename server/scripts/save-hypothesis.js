// Upserts a flake-analyzer hypothesis for one test case. The fingerprint records
// the pass/fail tally it was written for, so the analyzer can skip cases whose
// history hasn't changed since last time.
//
//   node server/scripts/save-hypothesis.js <caseId> <fingerprint> "<hypothesis text>"

import db from '../db.js'

const [caseIdArg, fingerprint, ...textParts] = process.argv.slice(2)
const caseId = Number(caseIdArg)
const hypothesis = textParts.join(' ').trim()

if (!Number.isInteger(caseId) || caseId <= 0 || !fingerprint || !hypothesis) {
  console.error('Usage: save-hypothesis.js <caseId> <fingerprint> "<hypothesis text>"')
  process.exit(1)
}

const exists = db.prepare('SELECT 1 FROM test_cases WHERE id = ?').get(caseId)
if (!exists) {
  console.error(`No test case with id ${caseId} — refusing to write an orphan hypothesis.`)
  process.exit(1)
}

db.prepare(
  `INSERT INTO flaky_hypotheses (test_case_id, hypothesis, fingerprint, generated_at)
   VALUES (?, ?, ?, ?)
   ON CONFLICT(test_case_id) DO UPDATE SET
     hypothesis = excluded.hypothesis,
     fingerprint = excluded.fingerprint,
     generated_at = excluded.generated_at`,
).run(caseId, hypothesis, fingerprint, new Date().toISOString())

console.log(`Saved hypothesis for case ${caseId} (${fingerprint})`)

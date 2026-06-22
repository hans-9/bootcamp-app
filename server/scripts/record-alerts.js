// Marks test cases as alerted, so they are not re-posted to Discord. Run by the
// flake-alert agent hook ONLY after a Discord post succeeds — recording after
// the post (not before) means a failed post leaves the flake un-alerted and it
// retries on the next result rather than being silently lost.
//
//   node server/scripts/record-alerts.js <caseId> [caseId ...]

import { recordAlerts } from '../flakes.js'

const ids = process.argv
  .slice(2)
  .map(Number)
  .filter((n) => Number.isInteger(n) && n > 0)

if (ids.length === 0) {
  console.error('Usage: record-alerts.js <caseId> [caseId ...]')
  process.exit(1)
}

recordAlerts(ids, new Date().toISOString())
console.log(`Recorded alerts for case(s): ${ids.join(', ')}`)

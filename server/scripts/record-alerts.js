// Marks test cases as alerted, so they are not re-posted to Discord. Run by the
// flake-alert agent hook ONLY after a Discord post succeeds — recording after
// the post (not before) means a failed post leaves the flake un-alerted and it
// retries on the next result rather than being silently lost.
//
//   node server/scripts/record-alerts.js <caseId> [caseId ...]

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

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

// Clear the consumed flakes from the hand-off file so a later hook run (or any
// stray Bash command) reads an empty list and does nothing, rather than acting
// on a now-posted flake.
const projectDir = process.env.CLAUDE_PROJECT_DIR || join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const statePath = join(projectDir, '.claude', 'state', 'new-flakes.json')
try {
  const state = JSON.parse(readFileSync(statePath, 'utf8'))
  state.new_flakes = []
  writeFileSync(statePath, JSON.stringify(state, null, 2))
} catch {
  // No state file or unreadable — nothing to clear.
}

console.log(`Recorded alerts for case(s): ${ids.join(', ')}`)

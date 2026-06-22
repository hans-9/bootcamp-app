// PostToolUse (command) hook. Fires after `record-result.js` writes a result
// row. Recomputes the flake leaderboard, records any newly-qualifying flakes,
// and writes .claude/state/new-flakes.json for the paired agent hook to turn
// into a Discord alert. Deterministic and free — all DB work happens here so the
// agent hook only has to post.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectDir = process.env.CLAUDE_PROJECT_DIR || join(__dirname, '..', '..')

// Defense in depth: the matcher's `if` already scopes this to record-result, but
// re-check the command so the hook is a no-op for anything else.
let command = ''
try {
  command = JSON.parse(readFileSync(0, 'utf8'))?.tool_input?.command ?? ''
} catch {
  // No/!invalid stdin — nothing to act on.
}
if (!command.includes('record-result.js')) process.exit(0)

const now = new Date().toISOString()
const statePath = join(projectDir, '.claude', 'state', 'new-flakes.json')
const channel = process.env.DISCORD_FLAKE_CHANNEL || 'general'

let newFlakes = []
try {
  const { detectNewFlakes, buildLeaderboard } = await import(
    pathToFileURL(join(projectDir, 'server', 'flakes.js')).href
  )
  newFlakes = detectNewFlakes()
  const leaderboard = buildLeaderboard(10)
  mkdirSync(dirname(statePath), { recursive: true })
  writeFileSync(statePath, JSON.stringify({ generated_at: now, channel, new_flakes: newFlakes, leaderboard }, null, 2))
} catch (err) {
  // On failure write an empty list so the agent hook reads fresh state and does
  // nothing, rather than acting on a stale file left from a previous run.
  try {
    mkdirSync(dirname(statePath), { recursive: true })
    writeFileSync(statePath, JSON.stringify({ generated_at: now, channel, new_flakes: [], leaderboard: [], error: String(err?.message ?? err) }, null, 2))
  } catch {
    // Best effort — nothing more we can do from the hook.
  }
  console.log(JSON.stringify({ systemMessage: `Flake tracker: recompute failed — ${err?.message ?? err}. No alert posted.` }))
  process.exit(0)
}

if (newFlakes.length > 0) {
  const names = newFlakes.map((f) => `#${f.test_case_id} ${f.title}`).join(', ')
  console.log(
    JSON.stringify({
      systemMessage: `Flake tracker: ${newFlakes.length} new flake(s) detected (${names}). Wrote .claude/state/new-flakes.json — the agent hook will post the Discord alert.`,
    }),
  )
}
process.exit(0)

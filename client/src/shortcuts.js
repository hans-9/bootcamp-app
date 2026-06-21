// Single source of truth for keyboard shortcuts. The key handler
// (KeyboardShortcuts.jsx) and the help cheat sheet (ShortcutsHelpModal.jsx)
// both read this list, and the displayed keys are derived from it via
// keysFor() — so the help modal can never drift from real behavior.

const platform =
  (typeof navigator !== 'undefined' &&
    (navigator.userAgentData?.platform || navigator.platform)) ||
  ''
const isMac = /mac|iphone|ipad|ipod/i.test(platform)

export const MOD_LABEL = isMac ? '⌘' : 'Ctrl'

export const SHORTCUTS = [
  { id: 'search', group: 'General', combo: 'mod+k', label: 'Open quick search' },
  { id: 'help', group: 'General', combo: '?', label: 'Show keyboard shortcuts' },
  { id: 'goto-dashboard', group: 'Jump to', seq: 'd', path: '/dashboard', label: 'Dashboard' },
  { id: 'goto-tests', group: 'Jump to', seq: 't', path: '/test-cases', label: 'Test Cases' },
  { id: 'goto-suites', group: 'Jump to', seq: 's', path: '/test-suites', label: 'Test Suites' },
  { id: 'goto-bugs', group: 'Jump to', seq: 'b', path: '/bugs', label: 'Bugs' },
  { id: 'goto-runs', group: 'Jump to', seq: 'r', path: '/test-runs', label: 'Test Runs' },
  { id: 'goto-reports', group: 'Jump to', seq: 'p', path: '/reports', label: 'Reports' },
]

// Map of the second key in a "G then X" sequence to its destination path.
export const GOTO = Object.fromEntries(
  SHORTCUTS.filter((s) => s.seq).map((s) => [s.seq, s.path]),
)

// Render tokens for a shortcut's key hint. 'then' is a separator word, not a key.
export function keysFor(s) {
  if (s.combo === 'mod+k') return [MOD_LABEL, 'K']
  if (s.combo === '?') return ['?']
  if (s.seq) return ['G', 'then', s.seq.toUpperCase()]
  return []
}

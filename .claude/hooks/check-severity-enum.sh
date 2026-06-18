#!/usr/bin/env bash
# PostToolUse hook: warn (never block) when a JS/TS/React file uses a severity
# word outside the allowed set. CLAUDE.md defines exactly four severities —
# Critical, Major, Minor, Trivial — so words like "high"/"blocker" are wrong.

set -euo pipefail

payload="$(cat)"
file_path="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty')"

case "$file_path" in
  *.js|*.jsx|*.ts|*.tsx|*.mjs|*.cjs) ;;
  *) exit 0 ;;
esac

[ -f "$file_path" ] || exit 0

# Whole-word, case-insensitive match keeps "highlight"/"below" from tripping it.
matches="$(grep -niwoE 'high|medium|low|blocker|cosmetic' "$file_path" || true)"
[ -z "$matches" ] && exit 0

root="${CLAUDE_PROJECT_DIR:-$PWD}"
rel_path="${file_path#"$root"/}"

violations="$(printf '%s\n' "$matches" | awk -F: -v rel="$rel_path" '
  { printf "%s:%d  wrong severity word \"%s\" — use Critical, Major, Minor, or Trivial\n", rel, $1, $2 }
')"

msg="Severity-enum check found severity words outside the allowed set (CLAUDE.md → Severity Levels):"$'\n'"$violations"

jq -n --arg m "$msg" '{ systemMessage: $m }'
exit 0

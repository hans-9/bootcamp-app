#!/usr/bin/env bash
# Pre-commit gate: lint staged sources by language and refuse leftover markers in
# comments so unfinished work never lands. Exit 2 blocks the commit (stderr is
# surfaced to Claude).

set -uo pipefail

payload="$(cat)"
cmd="$(printf '%s' "$payload" | jq -r '.tool_input.command // empty')"
case "$cmd" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac

root="${CLAUDE_PROJECT_DIR:-$PWD}"
cd "$root" || exit 0

staged="$(git diff --cached --name-only --diff-filter=ACM)"
[ -z "$staged" ] && exit 0

eslint=""
for bin in node_modules/.bin/eslint client/node_modules/.bin/eslint server/node_modules/.bin/eslint; do
  [ -x "$bin" ] && { eslint="$bin"; break; }
done
shellcheck_bin="$(command -v shellcheck || true)"
node_bin="$(command -v node || true)"

lint_errors=""
missing=""
markers=""

while IFS= read -r f; do
  [ -f "$f" ] || continue

  case "$f" in
    *.js|*.mjs)
      if [ -n "$eslint" ]; then
        out="$("$eslint" "$f" 2>&1)" || lint_errors+="$out"$'\n'
      elif [ -n "$node_bin" ]; then
        # File-arg --check misses syntax errors in ESM .js; checking as a module catches them.
        if ! out="$(node --check --input-type=module < "$f" 2>&1)"; then
          lint_errors+="$f: $(printf '%s\n' "$out" | grep -E 'Error' | head -1)"$'\n'
        fi
      else
        missing+="$f (needs Node.js or ESLint)"$'\n'
      fi
      ;;
    *.cjs)
      if [ -n "$eslint" ]; then
        out="$("$eslint" "$f" 2>&1)" || lint_errors+="$out"$'\n'
      elif [ -n "$node_bin" ]; then
        if ! out="$(node --check "$f" 2>&1)"; then
          lint_errors+="$f: $(printf '%s\n' "$out" | grep -E 'Error' | head -1)"$'\n'
        fi
      else
        missing+="$f (needs Node.js or ESLint)"$'\n'
      fi
      ;;
    *.jsx|*.ts|*.tsx)
      if [ -n "$eslint" ]; then
        out="$("$eslint" "$f" 2>&1)" || lint_errors+="$out"$'\n'
      else
        missing+="$f (needs ESLint)"$'\n'
      fi
      ;;
    *.sh)
      if [ -n "$shellcheck_bin" ]; then
        out="$("$shellcheck_bin" "$f" 2>&1)" || lint_errors+="$out"$'\n'
      else
        out="$(bash -n "$f" 2>&1)" || lint_errors+="$out"$'\n'
      fi
      ;;
    *.json)
      out="$(jq empty "$f" 2>&1)" || lint_errors+="$f: $out"$'\n'
      ;;
  esac

  # Skip the gate's own scripts: they carry the marker as data, not as unfinished work.
  case "$f" in
    .claude/hooks/*|*/.claude/hooks/*) ;;
    *)
      hits="$(grep -nE '(//|/\*|\*|#).*TODO' "$f" || true)"
      [ -n "$hits" ] && while IFS= read -r h; do markers+="$f:$h"$'\n'; done <<< "$hits"
      ;;
  esac
done <<< "$staged"

msg=""
[ -n "$markers" ] && msg+="Unresolved TODO comments (remove or resolve before committing):"$'\n'"$markers"$'\n'
[ -n "$lint_errors" ] && msg+="Lint errors in staged files:"$'\n'"$lint_errors"$'\n'
[ -n "$missing" ] && msg+="No linter available for these files. Install ESLint to enable linting (e.g. \`npm install -D eslint -w client\`, then add an eslint config) and commit again:"$'\n'"$missing"$'\n'

[ -z "$msg" ] && exit 0

printf '%s\n' "Pre-commit gate failed." "" "$msg" "Fix the above and commit again." >&2
exit 2

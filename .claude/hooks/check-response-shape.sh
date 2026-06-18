#!/usr/bin/env bash
# PostToolUse hook: warn (never block) when an endpoint handler in server/routes/
# emits a response that does not use the { success, data, error } envelope
# required by CLAUDE.md. See the "API Response Shape" section.

set -euo pipefail

payload="$(cat)"
file_path="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty')"

# Only inspect route handlers; ignore everything else silently.
case "$file_path" in
  */server/routes/*.js) ;;
  *) exit 0 ;;
esac

[ -f "$file_path" ] || exit 0

# Render the path relative to the project root so it links in the transcript.
root="${CLAUDE_PROJECT_DIR:-$PWD}"
rel_path="${file_path#"$root"/}"

# Scan for response emissions that bypass the envelope.
#  - res.json(...) / res.status(...).json(...): the object must carry all three
#    keys (success, data, error). Object literals may span lines, so we join a
#    short window after the call before checking.
#  - res.send/.sendStatus/.end: a non-JSON response can't carry the envelope.
# Helper calls like ok(res, ...) / fail(res, ...) delegate to a compliant
# .json(...) and are not flagged here.
violations="$(awk -v rel="$rel_path" '
  { lines[NR] = $0 }
  END {
    for (i = 1; i <= NR; i++) {
      line = lines[i]

      if (line ~ /res[[:space:]]*\.[[:space:]]*(status[[:space:]]*\([^)]*\)[[:space:]]*\.[[:space:]]*)?json[[:space:]]*\(/) {
        window = ""
        for (j = i; j <= i + 8 && j <= NR; j++) window = window " " lines[j]
        if (window ~ /success/ && window ~ /data/ && window ~ /error/) continue
        printf "%s:%d  response missing the { success, data, error } envelope\n", rel, i
        continue
      }

      if (line ~ /res[[:space:]]*\.[[:space:]]*(send|sendStatus|end)[[:space:]]*\(/) {
        printf "%s:%d  non-JSON response bypasses the { success, data, error } envelope\n", rel, i
      }
    }
  }
' "$file_path")"

[ -z "$violations" ] && exit 0

msg="Response-shape check found endpoints that may not return the { success, data, error } envelope (CLAUDE.md → API Response Shape):"$'\n'"$violations"

jq -n --arg m "$msg" '{ systemMessage: $m }'
exit 0

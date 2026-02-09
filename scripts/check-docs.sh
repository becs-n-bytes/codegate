#!/usr/bin/env bash
# Pre-commit hook: warn when significant source changes lack corresponding doc updates.
#
# "Significant" = changes to src/routes/*, src/providers/*, src/config.ts, src/schemas.ts,
# or src/types.ts — the files that define the public API surface.
# Trivial internal changes (services, middleware internals) are ignored.

set -euo pipefail

API_SURFACE_PATTERNS=(
  "src/routes/"
  "src/providers/"
  "src/config.ts"
  "src/schemas.ts"
  "src/types.ts"
  "src/app.ts"
)

DOC_PATTERNS=(
  "docs/"
  "website/docs/"
  "README.md"
)

staged=$(git diff --cached --name-only)

api_changed=false
for pattern in "${API_SURFACE_PATTERNS[@]}"; do
  if echo "$staged" | grep -q "^${pattern}"; then
    api_changed=true
    break
  fi
done

if [ "$api_changed" = false ]; then
  exit 0
fi

docs_changed=false
for pattern in "${DOC_PATTERNS[@]}"; do
  if echo "$staged" | grep -q "^${pattern}"; then
    docs_changed=true
    break
  fi
done

if [ "$docs_changed" = false ]; then
  echo ""
  echo "  ⚠  Documentation reminder"
  echo "  ─────────────────────────────────────────────────"
  echo "  You changed files in the public API surface but"
  echo "  no documentation files (docs/, website/docs/,"
  echo "  or README.md) are staged."
  echo ""
  echo "  If this change affects how users interact with"
  echo "  codegate, please update the relevant docs."
  echo ""
  echo "  To skip this check: git commit --no-verify"
  echo "  ─────────────────────────────────────────────────"
  echo ""
  # Exit 1 to block the commit — forces an explicit --no-verify for intentional skips
  exit 1
fi

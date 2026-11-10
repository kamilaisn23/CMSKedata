#!/usr/bin/env bash
# repo-context.sh — gather repo context for the kedata-repo skill.
# Detects the platform (GitHub gh / GitLab glab / git-only), collects
# branch, diff, commit, and issue context, and prints a compact block
# the agent uses to draft PR/MR bodies and link issues.
#
# Usage: bash repo-context.sh [base-branch]
#   base-branch defaults to main/master/develop (first found).

set -uo pipefail

BASE="${1:-}"
if [ -z "$BASE" ]; then
  for b in main master develop; do
    if git rev-parse --verify "$b" >/dev/null 2>&1; then BASE="$b"; break; fi
  done
fi

CUR=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "(detached)")
REMOTE_URL=$(git config --get remote.origin.url 2>/dev/null || echo "")

echo "=== Platform ==="
if command -v gh >/dev/null 2>&1; then echo "gh: $(gh --version 2>/dev/null | head -1 || echo present)"; fi
if command -v glab >/dev/null 2>&1; then echo "glab: $(glab --version 2>/dev/null | head -1 || echo present)"; fi
echo "remote: ${REMOTE_URL:-none}"

echo ""
echo "=== Branch ==="
echo "current: $CUR"
echo "base: ${BASE:-unset}"

echo ""
echo "=== Commits since base ==="
if [ -n "$BASE" ]; then
  git log --oneline "$BASE..HEAD" 2>/dev/null | head -50 || echo "(no commits or no base)"
fi

echo ""
echo "=== Diff stat vs base ==="
if [ -n "$BASE" ]; then
  git diff --stat "$BASE...HEAD" 2>/dev/null | tail -30 || echo "(empty)"
fi

echo ""
echo "=== Changed files ==="
if [ -n "$BASE" ]; then
  git diff --name-only "$BASE...HEAD" 2>/dev/null | head -50 || echo "(empty)"
fi

echo ""
echo "=== Issue key from branch ==="
KEY=$(echo "$CUR" | grep -oE '[A-Z]+-[0-9]+' | head -1 || true)
echo "key: ${KEY:-none}"

echo ""
echo "=== Existing PR/MR ==="
if [ -n "$REMOTE_URL" ] && command -v gh >/dev/null 2>&1 && echo "$REMOTE_URL" | grep -qi "github"; then
  gh pr view --json number,title,url,state 2>/dev/null || echo "(no PR for this branch)"
  if [ -n "$KEY" ]; then
    echo "--- linked issue $KEY ---"
    gh issue view "$KEY" --json title,state,body 2>/dev/null | head -30 || echo "(issue not found)"
  fi
elif [ -n "$REMOTE_URL" ] && command -v glab >/dev/null 2>&1 && echo "$REMOTE_URL" | grep -qi "gitlab"; then
  glab mr view 2>/dev/null || echo "(no MR for this branch)"
  if [ -n "$KEY" ]; then
    echo "--- linked issue $KEY ---"
    glab issue view "$KEY" 2>/dev/null | head -30 || echo "(issue not found)"
  fi
else
  echo "(no platform CLI detected — git only)"
fi

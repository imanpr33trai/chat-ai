#!/usr/bin/env bash
set -euo pipefail

# ─── Generate release notes from conventional commits ─────────────
# Usage: ./script/generate-release-notes <TAG> <CHANNEL>

TAG="${1:-}"
CHANNEL="${2:-}"

if [[ -z "$TAG" ]]; then
  echo "Usage: $0 <TAG> <CHANNEL>"
  exit 1
fi

# Get commits since last tag
PREV_TAG=$(git describe --tags --abbrev=0 HEAD~1 2>/dev/null || echo "")
CHANGELOG="## $TAG"

if [[ -n "$PREV_TAG" ]]; then
  COMMITS=$(git log "$PREV_TAG..HEAD" --pretty=format:"%s" 2>/dev/null || echo "")
else
  COMMITS=$(git log --pretty=format:"%s" -20 2>/dev/null || echo "")
fi

# Categorize commits
FEATURES=""
FIXES=""
CHORES=""

while IFS= read -r msg; do
  lower=$(echo "$msg" | tr '[:upper:]' '[:lower:]')
  if [[ "$lower" == feat:* ]]; then
    FEATURES+="- ${msg#feat: }\n"
  elif [[ "$lower" == fix:* ]]; then
    FIXES+="- ${msg#fix: }\n"
  elif [[ "$lower" != merge"* ]]; then
    CHORES+="- $msg\n"
  fi
done <<< "$COMMITS"

# Build release notes
{
  echo "# Release $TAG"
  echo ""
  echo "**Channel:** ${CHANNEL:-stable}"
  echo "**Tag:** $TAG"
  echo ""
  if [[ -n "$FEATURES" ]]; then
    echo "## ✨ Features"
    echo -e "$FEATURES"
  fi
  if [[ -n "$FIXES" ]]; then
    echo "## 🐛 Bug Fixes"
    echo -e "$FIXES"
  fi
  if [[ -n "$CHORES" ]]; then
    echo "## 🔧 Other Changes"
    echo -e "$CHORES"
  fi
} > "target/release-notes-${TAG}.md"

cat "target/release-notes-${TAG}.md"
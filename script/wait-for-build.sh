#!/usr/bin/env bash
set -euo pipefail

# ─── Wait for EAS build to complete ──────────────────────────────
# Usage: ./script/wait-for-build <BUILD_ID> [MAX_WAIT_SECONDS]

BUILD_ID="${1:-}"
MAX_WAIT="${2:-2700}"  # 45 min default

if [[ -z "$BUILD_ID" ]]; then
  echo "Usage: $0 <BUILD_ID> [MAX_WAIT_SECONDS]"
  exit 1
fi

echo "Waiting for build $BUILD_ID (max ${MAX_WAIT}s)..."
ELAPSED=0
sleep 30

while (( ELAPSED < MAX_WAIT )); do
  STATUS=$(npx eas-cli build:view "$BUILD_ID" --json 2>/dev/null | jq -r '.status' 2>/dev/null || echo "unknown")

  if [[ "$STATUS" == "FINISHED" ]]; then
    echo "Build completed successfully"
    exit 0
  elif [[ "$STATUS" == "ERRORED" ]]; then
    echo "Build failed with ERRORED status"
    exit 1
  elif [[ "$STATUS" == "CANCELED" ]]; then
    echo "Build was canceled"
    exit 1
  fi

  echo "Status: $STATUS. Waiting... (${ELAPSED}s)"
  sleep 60
  (( ELAPSED += 60 ))
done

echo "Build timed out after ${MAX_WAIT} seconds"
exit 1
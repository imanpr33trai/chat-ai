#!/usr/bin/env bash
set -euo pipefail

# ─── Slack notification ───────────────────────────────────────────
# Usage: ./script/slack-notify <WEBHOOK_URL> <MESSAGE> [STATUS]

WEBHOOK="${1:-}"
MESSAGE="${2:-}"
STATUS="${3:-success}"

if [[ -z "$WEBHOOK" ]]; then
  echo "Slack webhook not configured — skipping notification"
  exit 0
fi

if [[ "$STATUS" == "success" ]]; then
  EMOJI="✅"
elif [[ "$STATUS" == "failure" ]]; then
  EMOJI="❌"
else
  EMOJI="ℹ️"
fi

PAYLOAD=$(jq -n \
  --arg text "$EMOJI $MESSAGE" \
  '{"text": $text}')

curl -s -X POST \
  -H 'Content-type: application/json' \
  --data "$PAYLOAD" \
  "$WEBHOOK" > /dev/null 2>&1 || true

echo "Slack notification sent: $STATUS — $MESSAGE"
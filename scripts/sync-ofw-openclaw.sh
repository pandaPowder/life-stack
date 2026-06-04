#!/usr/bin/env bash
set -euo pipefail

DAYS="${DAYS:-7}"

echo "[sync-ofw-openclaw] Exporting OFW messages (days=$DAYS)"
if [[ "$#" -gt 0 ]]; then
  npm run export-ofw -- --days "$DAYS" "$@"
else
  npm run export-ofw -- --days "$DAYS"
fi

echo "[sync-ofw-openclaw] Pushing artifacts to OpenClaw"
bash scripts/push-ofw-to-openclaw.sh

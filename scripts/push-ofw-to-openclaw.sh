#!/usr/bin/env bash
set -euo pipefail

SOURCE_FILE="${1:-data/ofw/ofw-recent.md}"
SOURCE_JSON_FILE="${2:-data/ofw/ofw-recent.json}"
REMOTE_HOST="${OPENCLAW_HOST:-mbot}"
REMOTE_PATH="${OPENCLAW_OFW_PATH:-/home/openclaw/.openclaw/workspace/data/ofw/ofw-recent.md}"
REMOTE_JSON_PATH="${OPENCLAW_OFW_JSON_PATH:-/home/openclaw/.openclaw/workspace/data/ofw/ofw-recent.json}"

if [[ ! -f "$SOURCE_FILE" ]]; then
  echo "[push-ofw-openclaw] Missing source file: $SOURCE_FILE" >&2
  echo "[push-ofw-openclaw] Run: npm run export-ofw" >&2
  exit 1
fi

REMOTE_DIR="$(dirname "$REMOTE_PATH")"

echo "[push-ofw-openclaw] Ensuring remote directory exists: $REMOTE_DIR"
ssh "$REMOTE_HOST" "mkdir -p '$REMOTE_DIR'"

echo "[push-ofw-openclaw] Uploading markdown artifact to $REMOTE_HOST:$REMOTE_PATH"
scp "$SOURCE_FILE" "$REMOTE_HOST:$REMOTE_PATH"

if [[ -f "$SOURCE_JSON_FILE" ]]; then
  echo "[push-ofw-openclaw] Uploading JSON artifact to $REMOTE_HOST:$REMOTE_JSON_PATH"
  scp "$SOURCE_JSON_FILE" "$REMOTE_HOST:$REMOTE_JSON_PATH"
fi

echo "[push-ofw-openclaw] Remote artifact details:"
ssh "$REMOTE_HOST" "ls -lh '$REMOTE_PATH' '$REMOTE_JSON_PATH' 2>/dev/null || ls -lh '$REMOTE_PATH'"

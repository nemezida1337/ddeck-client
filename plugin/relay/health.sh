#!/usr/bin/env bash
# Проверить публичный relay и при необходимости перезапустить локальный туннель.
#
# Использование:
#   plugin/relay/health.sh [https://PUBLIC:PORT]
#
# Origin по умолчанию берётся из ~/.dsh/dsh-remote/origins.json. Проверяется
# /mobile-access/metadata с CA плагина; если ответа нет — launchd-агент
# app.ddeck.relay перезапускается и проверка повторяется.
set -euo pipefail

ORIGIN="${1:-}"
if [ -z "$ORIGIN" ]; then
  ORIGIN=$(python3 - "$HOME/.dsh/dsh-remote/origins.json" <<'PY'
import json, sys
try:
    print(json.load(open(sys.argv[1]))["origins"][0])
except Exception:
    print("")
PY
)
fi
[ -n "$ORIGIN" ] || { echo "relay health: origin is not configured" >&2; exit 2; }
CA="$HOME/.dsh/dsh-remote/tls/ca.pem"
STATE="$HOME/.dsh/dsh-remote"
LOG="$STATE/relay-health.log"

check() {
  curl -fsS --max-time 8 --cacert "$CA" "$ORIGIN/mobile-access/metadata" >/dev/null 2>&1
}

if check; then
  exit 0
fi

printf '%s relay health failed for %s; restarting tunnel\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$ORIGIN" >> "$LOG"
if command -v launchctl >/dev/null 2>&1; then
  launchctl kickstart -k "gui/$(id -u)/app.ddeck.relay" 2>/dev/null || true
else
  printf '%s launchctl unavailable\n' "$(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG"
  exit 1
fi
sleep 4
if check; then
  printf '%s relay recovered\n' "$(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG"
  exit 0
fi
printf '%s relay still unavailable\n' "$(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG"
exit 1

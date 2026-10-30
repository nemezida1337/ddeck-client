#!/usr/bin/env bash
# Настроить собственный DDeck Relay на VPS из терминала Mac.
#
# Этот скрипт — кирпич для будущего визарда панели. Он:
#  1) выпускает TLS-сертификат на публичный домен/IP, подписанный CA текущего плагина;
#  2) копирует изолированный installer на сервер по SSH;
#  3) настраивает nginx или Caddy, не трогая посторонние site-блоки;
#  4) поднимает обратный SSH-туннель Mac -> сервер;
#  5) сохраняет публичный origin для QR/панели.
#
# Пример:
#   plugin/relay/setup.sh \
#     --ssh relay-vds \
#     --origin https://relay.example.com:3449 \
#     --gateway-origin https://100.x.y.z:3449
set -euo pipefail

SSH_HOST=''
ORIGIN=''
GATEWAY_ORIGIN=''
PROXY=auto
LOCAL_PORT=3449
REMOTE_TUNNEL_PORT=8816
while [ "$#" -gt 0 ]; do
  case "$1" in
    --ssh) SSH_HOST="$2"; shift 2 ;;
    --origin) ORIGIN="$2"; shift 2 ;;
    --gateway-origin) GATEWAY_ORIGIN="$2"; shift 2 ;;
    --proxy) PROXY="$2"; shift 2 ;;
    --local-port) LOCAL_PORT="$2"; shift 2 ;;
    --tunnel-port) REMOTE_TUNNEL_PORT="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done
[ -n "$SSH_HOST" ] && [ -n "$ORIGIN" ] && [ -n "$GATEWAY_ORIGIN" ] || {
  echo "usage: setup.sh --ssh HOST --origin https://PUBLIC:PORT --gateway-origin https://GATEWAY:PORT" >&2
  exit 2
}
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
CA="$HOME/.dsh/dsh-remote/tls/ca.pem"
CA_KEY="$HOME/.dsh/dsh-remote/tls/ca-key.pem"
[ -f "$CA" ] && [ -f "$CA_KEY" ] || { echo "plugin CA missing: $CA" >&2; exit 2; }
HOST=$(python3 - "$ORIGIN" <<'PY'
import sys, urllib.parse
u = urllib.parse.urlsplit(sys.argv[1])
if u.scheme != 'https' or not u.hostname or u.path not in ('', '/') or u.username or u.password:
    raise SystemExit('origin must be https://host[:port] without path')
print(u.hostname)
PY
)
PORT=$(python3 - "$ORIGIN" <<'PY'
import sys, urllib.parse
print(urllib.parse.urlsplit(sys.argv[1]).port or 443)
PY
)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
if python3 - "$HOST" <<'PY'
import ipaddress, sys
try: ipaddress.ip_address(sys.argv[1])
except ValueError: raise SystemExit(1)
PY
then SAN="IP:$HOST"; else SAN="DNS:$HOST"; fi
cat > "$TMP/ext.cnf" <<EXTEOF
subjectAltName=$SAN
extendedKeyUsage=serverAuth
keyUsage=digitalSignature,keyEncipherment
EXTEOF
openssl req -new -newkey rsa:2048 -nodes -keyout "$TMP/relay-key.pem" \
  -out "$TMP/relay.csr" -subj "/CN=$HOST" >/dev/null 2>&1
openssl x509 -req -in "$TMP/relay.csr" -CA "$CA" -CAkey "$CA_KEY" \
  -CAcreateserial -out "$TMP/relay-cert.pem" -days 825 -extfile "$TMP/ext.cnf" >/dev/null 2>&1
openssl x509 -in "$TMP/relay-cert.pem" -noout -checkhost "$HOST" >/dev/null 2>&1 || {
  echo "certificate does not cover $HOST" >&2; exit 1
}

REMOTE_DIR="/tmp/ddeck-relay-setup.$$"
ssh -o BatchMode=yes -o ConnectTimeout=10 "$SSH_HOST" "rm -rf '$REMOTE_DIR' && mkdir -p '$REMOTE_DIR'"
scp -q -o BatchMode=yes "$ROOT/plugin/relay/install-on-server.sh" "$TMP/relay-cert.pem" "$TMP/relay-key.pem" "$SSH_HOST:$REMOTE_DIR/"
REMOTE_UID=$(ssh -o BatchMode=yes "$SSH_HOST" 'id -u')
if [ "$REMOTE_UID" = '0' ]; then
  SSH_RUN=ssh
  SSH_PREFIX=''
else
  SSH_RUN=ssh
  SSH_PREFIX='sudo -n '
fi
$SSH_RUN -o BatchMode=yes "$SSH_HOST" "cd '$REMOTE_DIR' && ${SSH_PREFIX}bash install-on-server.sh --origin '$ORIGIN' --target 127.0.0.1:$REMOTE_TUNNEL_PORT --gateway-origin '$GATEWAY_ORIGIN' --cert relay-cert.pem --key relay-key.pem --proxy '$PROXY'; rc=\$?; rm -rf '$REMOTE_DIR'; exit \$rc"

STATE="$HOME/.dsh/dsh-remote"
mkdir -p "$STATE"
python3 - "$STATE/origins.json" "$ORIGIN" <<'PY'
import json, pathlib, sys
path = pathlib.Path(sys.argv[1]); origin = sys.argv[2]
data = {}
try: data = json.loads(path.read_text())
except Exception: pass
old = [x for x in data.get('origins', []) if isinstance(x, str) and x != origin]
path.write_text(json.dumps({'origins': [origin] + old}, ensure_ascii=False, indent=2) + '\n')
PY

pkill -f "ssh .*127.0.0.1:$REMOTE_TUNNEL_PORT:127.0.0.1:$LOCAL_PORT $SSH_HOST" 2>/dev/null || true
nohup ssh -N -o BatchMode=yes -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
  -R "127.0.0.1:$REMOTE_TUNNEL_PORT:127.0.0.1:$LOCAL_PORT" "$SSH_HOST" \
  >"$STATE/relay-tunnel.log" 2>&1 &
echo "$!" > "$STATE/relay-tunnel.pid"
sleep 1
kill -0 "$(cat "$STATE/relay-tunnel.pid")" 2>/dev/null || { echo "ssh tunnel failed; see $STATE/relay-tunnel.log" >&2; exit 1; }
echo "relay installed: $ORIGIN -> $SSH_HOST:127.0.0.1:$REMOTE_TUNNEL_PORT -> localhost:$LOCAL_PORT"
echo "public origin written to $STATE/origins.json; restart DSH to apply QR/cert"

#!/usr/bin/env bash
# Установка/обновление DDeck Relay на собственном сервере.
#
# Скрипт идемпотентен и не трогает существующие site-блоки: он создаёт отдельный
# server/блок с маркером DDeck, проверяет конфигурацию до reload и откатывается
# при ошибке. Поддерживаются nginx и Caddy; если прокси нет — установка
# останавливается с инструкцией, а не пытается занять 443/80.
#
# Запуск (root или через sudo):
#   install-on-server.sh --origin https://ddeck.example.com:3449 \
#     --target 127.0.0.1:8816 --gateway-origin https://100.x.y.z:3449 \
#     --cert ./relay-cert.pem --key ./relay-key.pem [--proxy auto]
set -euo pipefail

ORIGIN=''
TARGET='127.0.0.1:8816'
GATEWAY_ORIGIN=''
CERT=''
KEY=''
PROXY='auto'
while [ "$#" -gt 0 ]; do
  case "$1" in
    --origin) ORIGIN="$2"; shift 2 ;;
    --target) TARGET="$2"; shift 2 ;;
    --gateway-origin) GATEWAY_ORIGIN="$2"; shift 2 ;;
    --cert) CERT="$2"; shift 2 ;;
    --key) KEY="$2"; shift 2 ;;
    --proxy) PROXY="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done
[ -n "$ORIGIN" ] || { echo "--origin is required" >&2; exit 2; }
[ -n "$GATEWAY_ORIGIN" ] || { echo "--gateway-origin is required" >&2; exit 2; }
[ -f "$CERT" ] && [ -f "$KEY" ] || { echo "cert/key not found" >&2; exit 2; }
[ "$(id -u)" -eq 0 ] || { echo "run as root (or sudo)" >&2; exit 3; }

python3 - "$ORIGIN" <<'PY'
import sys, urllib.parse
u = urllib.parse.urlsplit(sys.argv[1])
if u.scheme != 'https' or not u.hostname or u.path not in ('', '/') or u.username or u.password:
    raise SystemExit('--origin must be an https origin without path/credentials')
PY
HOST=$(python3 - "$ORIGIN" <<'PY'
import sys, urllib.parse
print(urllib.parse.urlsplit(sys.argv[1]).hostname)
PY
)
PORT=$(python3 - "$ORIGIN" <<'PY'
import sys, urllib.parse
print(urllib.parse.urlsplit(sys.argv[1]).port or 443)
PY
)
GW_HOSTPORT=${GATEWAY_ORIGIN#https://}; GW_HOSTPORT=${GW_HOSTPORT%/}
ROOT=/etc/ddeck-relay
mkdir -p "$ROOT"
install -m 600 "$KEY" "$ROOT/relay-key.pem"
install -m 644 "$CERT" "$ROOT/relay-cert.pem"

has_nginx=0; has_caddy=0
command -v nginx >/dev/null 2>&1 && has_nginx=1
command -v caddy >/dev/null 2>&1 && has_caddy=1
[ -d /etc/nginx ] && has_nginx=1
if [ "$PROXY" = 'auto' ]; then
  if [ "$has_caddy" = 1 ]; then PROXY=caddy; elif [ "$has_nginx" = 1 ]; then PROXY=nginx; else PROXY=none; fi
fi

nginx_install() {
  local file=/etc/nginx/conf.d/ddeck-relay.conf
  local backup=''
  [ -f "$file" ] && { backup="$file.bak.$(date +%Y%m%d%H%M%S)"; cp -a "$file" "$backup"; }
  cat > "$file" <<NGINX
# Managed by DDeck Relay setup. Do not edit by hand without re-running setup.
map \$http_upgrade \$ddeck_relay_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen ${PORT} ssl;
    listen [::]:${PORT} ssl;
    server_name ${HOST};

    ssl_certificate     /etc/ddeck-relay/relay-cert.pem;
    ssl_certificate_key /etc/ddeck-relay/relay-key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:DDR:1m;
    ssl_session_timeout 10m;

    client_max_body_size 50m;
    proxy_buffering off;

    location / {
        proxy_pass https://${TARGET};
        proxy_http_version 1.1;
        proxy_ssl_verify off;
        proxy_ssl_server_name on;
        proxy_set_header Host ${GW_HOSTPORT};
        proxy_set_header Origin https://${GW_HOSTPORT};
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$ddeck_relay_upgrade;
        proxy_connect_timeout 10s;
        proxy_send_timeout 1h;
        proxy_read_timeout 1h;
    }
}
NGINX
  if ! nginx -t >/tmp/ddeck-nginx-test.log 2>&1; then
    echo 'nginx config test failed; restoring' >&2
    cat /tmp/ddeck-nginx-test.log >&2
    if [ -n "$backup" ]; then cp -a "$backup" "$file"; else rm -f "$file"; fi
    return 1
  fi
  systemctl reload nginx >/dev/null 2>&1 || nginx -s reload >/dev/null 2>&1
  echo "installed: nginx on ${ORIGIN} -> ${TARGET}"
}

caddy_install() {
  local file=''
  for candidate in /etc/caddy/Caddyfile /etc/Caddyfile; do
    [ -f "$candidate" ] && { file="$candidate"; break; }
  done
  [ -n "$file" ] || { echo 'Caddyfile not found; set up Caddy manually' >&2; return 1; }
  local backup="$file.bak.$(date +%Y%m%d%H%M%S)"
  cp -a "$file" "$backup"
  python3 - "$file" "$HOST" "$PORT" "$TARGET" "$GW_HOSTPORT" <<'PY'
import pathlib, sys
file, host, port, target, gateway = sys.argv[1:]
path = pathlib.Path(file)
text = path.read_text()
start = '# >>> DDeck Relay (managed) >>>'
end = '# <<< DDeck Relay (managed) <<<'
if start in text:
    before = text.split(start)[0]
    after = text.split(end, 1)[1] if end in text else ''
    text = before + after
block = f'''{start}
{host}:{port} {{
    tls /etc/ddeck-relay/relay-cert.pem /etc/ddeck-relay/relay-key.pem
    reverse_proxy https://{target} {{
        transport http {{
            tls_insecure_skip_verify
        }}
        header_up Host {gateway}
        header_up Origin https://{gateway}
        header_up X-Forwarded-Proto https
    }}
}}
{end}
'''
path.write_text(text.rstrip() + '\n\n' + block)
PY
  if command -v caddy >/dev/null 2>&1 && ! caddy validate --config "$file" --adapter caddyfile >/tmp/ddeck-caddy-test.log 2>&1; then
    echo 'caddy validate failed; restoring' >&2
    cat /tmp/ddeck-caddy-test.log >&2
    cp -a "$backup" "$file"
    return 1
  fi
  if systemctl is-active --quiet caddy 2>/dev/null; then
    if ! systemctl reload caddy >/dev/null 2>&1 && ! systemctl restart caddy >/dev/null 2>&1; then
      echo 'caddy reload failed; restoring Caddyfile' >&2
      cp -a "$backup" "$file"
      return 1
    fi
  elif command -v caddy >/dev/null 2>&1; then
    if ! caddy reload --config "$file" --adapter caddyfile >/dev/null 2>&1; then
      echo 'caddy is installed but not running; start caddy and re-run setup' >&2
      cp -a "$backup" "$file"
      return 1
    fi
  fi
  echo "installed: caddy on ${ORIGIN} -> ${TARGET}"
}

case "$PROXY" in
  nginx) nginx_install ;;
  caddy) caddy_install ;;
  none) echo 'no supported reverse proxy found (nginx/Caddy); install one first' >&2; exit 4 ;;
  *) echo "unsupported proxy: $PROXY" >&2; exit 2 ;;
esac

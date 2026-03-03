#!/bin/sh
set -e

PROXY_TYPE="${PROXY_TYPE:-http-connect}"
PROXY_HOST="${PROXY_HOST:-}"
PROXY_PORT="${PROXY_PORT:-7777}"
PROXY_USER="${PROXY_USER:-}"
PROXY_PASS="${PROXY_PASS:-}"
REDSOCKS_PORT="${REDSOCKS_PORT:-12345}"

if [ -z "$PROXY_HOST" ]; then
  echo "[proxy-sidecar] PROXY_HOST not set — running in passthrough mode (no proxying)"
  exec sleep infinity
fi

echo "[proxy-sidecar] Configuring redsocks: ${PROXY_TYPE} -> ${PROXY_HOST}:${PROXY_PORT}"

LOGIN_LINE=""
PASSWORD_LINE=""
if [ -n "$PROXY_USER" ]; then
  LOGIN_LINE="login = \"${PROXY_USER}\";"
fi
if [ -n "$PROXY_PASS" ]; then
  PASSWORD_LINE="password = \"${PROXY_PASS}\";"
fi

cat > /etc/redsocks.conf <<EOF
base {
  log_debug = off;
  log_info = on;
  log = stderr;
  daemon = off;
  redirector = iptables;
}

redsocks {
  local_ip = 0.0.0.0;
  local_port = ${REDSOCKS_PORT};
  ip = ${PROXY_HOST};
  port = ${PROXY_PORT};
  type = ${PROXY_TYPE};
  ${LOGIN_LINE}
  ${PASSWORD_LINE}
}
EOF

iptables -t nat -N REDSOCKS 2>/dev/null || iptables -t nat -F REDSOCKS

iptables -t nat -A REDSOCKS -d 0.0.0.0/8 -j RETURN
iptables -t nat -A REDSOCKS -d 10.0.0.0/8 -j RETURN
iptables -t nat -A REDSOCKS -d 127.0.0.0/8 -j RETURN
iptables -t nat -A REDSOCKS -d 169.254.0.0/16 -j RETURN
iptables -t nat -A REDSOCKS -d 172.16.0.0/12 -j RETURN
iptables -t nat -A REDSOCKS -d 192.168.0.0/16 -j RETURN
iptables -t nat -A REDSOCKS -d 224.0.0.0/4 -j RETURN
iptables -t nat -A REDSOCKS -d 240.0.0.0/4 -j RETURN
iptables -t nat -A REDSOCKS -p tcp -j REDIRECT --to-ports ${REDSOCKS_PORT}

iptables -t nat -A OUTPUT -p tcp -j REDSOCKS

echo "[proxy-sidecar] iptables + redsocks configured, starting redsocks..."
exec redsocks -c /etc/redsocks.conf

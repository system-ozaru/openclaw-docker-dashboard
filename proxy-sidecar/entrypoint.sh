#!/bin/sh
set -e

PROXY_TYPE="${PROXY_TYPE:-http-connect}"
PROXY_HOST="${PROXY_HOST:-}"
PROXY_PORT="${PROXY_PORT:-7777}"
PROXY_USER="${PROXY_USER:-}"
PROXY_PASS="${PROXY_PASS:-}"
LOCAL_PORT="${LOCAL_PORT:-8888}"

if [ -z "$PROXY_HOST" ]; then
  echo "[proxy-sidecar] PROXY_HOST not set — running in passthrough mode"
  exec sleep infinity
fi

echo "[proxy-sidecar] Configuring tinyproxy -> ${PROXY_HOST}:${PROXY_PORT} (local port ${LOCAL_PORT})"

AUTH_LINE=""
if [ -n "$PROXY_USER" ] && [ -n "$PROXY_PASS" ]; then
  AUTH_LINE="Upstream http ${PROXY_USER}:${PROXY_PASS}@${PROXY_HOST}:${PROXY_PORT}"
elif [ -n "$PROXY_USER" ]; then
  AUTH_LINE="Upstream http ${PROXY_USER}@${PROXY_HOST}:${PROXY_PORT}"
else
  AUTH_LINE="Upstream http ${PROXY_HOST}:${PROXY_PORT}"
fi

cat > /etc/tinyproxy/tinyproxy.conf <<EOF
Port ${LOCAL_PORT}
Listen 127.0.0.1
Timeout 600
Allow 127.0.0.1
${AUTH_LINE}
LogLevel Error
EOF

echo "[proxy-sidecar] tinyproxy configured, starting..."
exec tinyproxy -d -c /etc/tinyproxy/tinyproxy.conf

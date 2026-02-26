#!/usr/bin/env bash
set -euo pipefail

FLEET_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENTS_DIR="$FLEET_ROOT/agents"
COMPOSE_FILE="$FLEET_ROOT/docker-compose.yml"

read_json_field() {
  local file="$1"
  local field="$2"
  grep -o "\"$field\"[[:space:]]*:[[:space:]]*[0-9]*" "$file" | grep -o '[0-9]*' | head -1
}

generate_service_block() {
  local agent_id="$1"
  local agent_dir="$AGENTS_DIR/$agent_id"
  local config="$agent_dir/openclaw.json"

  if [ ! -f "$config" ]; then
    echo "Warning: $config not found, skipping $agent_id" >&2
    return
  fi

  local port
  port=$(read_json_field "$config" "port")

  if [ -z "$port" ]; then
    echo "Warning: no port found in $config, skipping $agent_id" >&2
    return
  fi

  cat <<EOF
  ${agent_id}:
    image: openclaw-fleet:latest
    build: .
    container_name: openclaw-${agent_id}
    volumes:
      - ./agents/${agent_id}:/home/openclaw/.openclaw
    ports:
      - "${port}:${port}"
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "openclaw", "gateway", "health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
EOF
}

# --- Collect all agent directories sorted ---

agent_ids=()
for dir in "$AGENTS_DIR"/agent-*/; do
  [ -d "$dir" ] || continue
  agent_ids+=("$(basename "$dir")")
done

if [ ${#agent_ids[@]} -eq 0 ]; then
  echo "No agents found in $AGENTS_DIR"
  exit 1
fi

IFS=$'\n' sorted=($(sort <<<"${agent_ids[*]}")); unset IFS

# --- Write docker-compose.yml ---

{
  echo "services:"
  for agent_id in "${sorted[@]}"; do
    generate_service_block "$agent_id"
  done
} > "$COMPOSE_FILE"

echo "Generated $COMPOSE_FILE with ${#sorted[@]} agent(s): ${sorted[*]}"

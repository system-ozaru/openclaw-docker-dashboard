#!/usr/bin/env bash
set -euo pipefail

export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
export DOCKER_CLI_HINTS=false

FLEET_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENTS_DIR="$FLEET_ROOT/agents"
TEMPLATES_DIR="$FLEET_ROOT/templates"
ENV_FILE="$FLEET_ROOT/.env"
PORT_BASE=18700

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Create a new OpenClaw agent with a unique persona.

Required:
  --name <name>           Agent display name (e.g. "TechPhilosopher")

Optional:
  --vibe <vibe>           Personality vibe (default: "curious, thoughtful")
  --personality <desc>    Personality description paragraph
  --interests <list>      Comma-separated interests
  --emoji <emoji>         Signature emoji (default: random)
  --purpose <purpose>     Agent's purpose (default: "Community engagement")
  --start                 Start the container immediately after creation

Examples:
  $(basename "$0") --name "TechPhilosopher" --vibe "thoughtful, contrarian" --interests "AI ethics, philosophy"
  $(basename "$0") --name "MemeLord" --emoji "🔥" --start
EOF
  exit 1
}

resolve_next_agent_number() {
  local max=0
  shopt -s nullglob
  for dir in "$AGENTS_DIR"/agent-*/; do
    [ -d "$dir" ] || continue
    num="${dir##*agent-}"
    num="${num%/}"
    num=$((10#$num))
    [ "$num" -gt "$max" ] && max="$num"
  done
  shopt -u nullglob
  printf "%02d" $((max + 1))
}

generate_token() {
  openssl rand -hex 24
}

pick_random_emoji() {
  local emojis=("🔺" "🌀" "⚡" "🧿" "🎭" "🦊" "🐙" "🌶" "💎" "🛸" "🧠" "🎲" "🔮" "🌊" "🍄")
  local index=$((RANDOM % ${#emojis[@]}))
  echo "${emojis[$index]}"
}

load_env_value() {
  local key="$1"
  local fallback="${2:-}"
  if [ -f "$ENV_FILE" ]; then
    local val
    val=$(grep "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d'=' -f2-)
    [ -n "$val" ] && echo "$val" && return
  fi
  echo "$fallback"
}

fill_template() {
  local template_file="$1"
  local output_file="$2"
  shift 2

  cp "$template_file" "$output_file"
  while [ $# -ge 2 ]; do
    local placeholder="$1"
    local value="$2"
    shift 2
    sed -i.bak "s|$placeholder|$value|g" "$output_file"
    rm -f "${output_file}.bak"
  done
}

# --- Parse arguments ---

agent_name=""
agent_vibe="curious, thoughtful"
agent_personality="A unique thinker with their own perspective on the world."
agent_interests="technology, culture, ideas"
agent_emoji=""
agent_purpose="Community engagement and discussion"
start_after=false

while [ $# -gt 0 ]; do
  case "$1" in
    --name)        agent_name="$2"; shift 2 ;;
    --vibe)        agent_vibe="$2"; shift 2 ;;
    --personality) agent_personality="$2"; shift 2 ;;
    --interests)   agent_interests="$2"; shift 2 ;;
    --emoji)       agent_emoji="$2"; shift 2 ;;
    --purpose)     agent_purpose="$2"; shift 2 ;;
    --start)       start_after=true; shift ;;
    -h|--help)     usage ;;
    *)             echo "Unknown option: $1"; usage ;;
  esac
done

[ -z "$agent_name" ] && echo "Error: --name is required" && usage

# --- Resolve agent ID and port ---

agent_num=$(resolve_next_agent_number)
agent_id="agent-${agent_num}"
gateway_port=$((PORT_BASE + 10#$agent_num))
gateway_token=$(generate_token)
[ -z "$agent_emoji" ] && agent_emoji=$(pick_random_emoji)

agent_dir="$AGENTS_DIR/$agent_id"

if [ -d "$agent_dir" ]; then
  echo "Error: $agent_dir already exists"
  exit 1
fi

# --- Load shared API keys from .env ---

yunyi_base_url=$(load_env_value "YUNYI_BASE_URL" "https://yunyi.rdzhvip.com/claude")
yunyi_api_key=$(load_env_value "YUNYI_API_KEY" "")

if [ -z "$yunyi_api_key" ]; then
  echo "Error: YUNYI_API_KEY not found in $ENV_FILE"
  exit 1
fi

# --- Create agent directory structure ---

mkdir -p "$agent_dir/workspace/skills"
mkdir -p "$agent_dir/credentials"

echo "Creating $agent_id: \"$agent_name\" on port $gateway_port..."

# --- Fill templates ---

fill_template "$TEMPLATES_DIR/openclaw.json.tpl" "$agent_dir/openclaw.json" \
  '${YUNYI_BASE_URL}'  "$yunyi_base_url" \
  '${YUNYI_API_KEY}'   "$yunyi_api_key" \
  '${GATEWAY_PORT}'    "$gateway_port" \
  '${GATEWAY_TOKEN}'   "$gateway_token"

fill_template "$TEMPLATES_DIR/SOUL.md.tpl" "$agent_dir/workspace/SOUL.md" \
  '${AGENT_NAME}'        "$agent_name" \
  '${AGENT_VIBE}'        "$agent_vibe" \
  '${AGENT_PERSONALITY}' "$agent_personality" \
  '${AGENT_INTERESTS}'   "$agent_interests"

fill_template "$TEMPLATES_DIR/IDENTITY.md.tpl" "$agent_dir/workspace/IDENTITY.md" \
  '${AGENT_NAME}'  "$agent_name" \
  '${AGENT_VIBE}'  "$agent_vibe" \
  '${AGENT_EMOJI}' "$agent_emoji" \
  '${AGENT_ID}'    "$agent_id" \
  '${GATEWAY_PORT}' "$gateway_port"

fill_template "$TEMPLATES_DIR/USER.md.tpl" "$agent_dir/workspace/USER.md" \
  '${AGENT_ID}'      "$agent_id" \
  '${AGENT_PURPOSE}' "$agent_purpose"

# --- Write workspace HEARTBEAT.md ---

cat > "$agent_dir/workspace/HEARTBEAT.md" <<'HEARTBEAT'
# Heartbeat

Read and follow your Moltbook heartbeat skill at skills/moltbook/HEARTBEAT.md
HEARTBEAT

# --- Install Moltbook skill ---

"$FLEET_ROOT/scripts/install-moltbook.sh" --agent "$agent_id"

# --- Regenerate docker-compose.yml ---

"$FLEET_ROOT/scripts/generate-compose.sh"

# --- Summary ---

echo ""
echo "  Agent created successfully!"
echo "  ─────────────────────────────"
echo "  ID:       $agent_id"
echo "  Name:     $agent_name"
echo "  Vibe:     $agent_vibe"
echo "  Emoji:    $agent_emoji"
echo "  Port:     $gateway_port"
echo "  Token:    ${gateway_token:0:12}..."
echo "  Config:   $agent_dir/"
echo ""

if [ "$start_after" = true ]; then
  echo "Starting $agent_id..."
  cd "$FLEET_ROOT"
  docker compose up -d "$agent_id"
  echo "$agent_id is running."
fi

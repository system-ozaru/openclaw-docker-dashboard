#!/usr/bin/env bash
set -euo pipefail

FLEET_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENTS_DIR="$FLEET_ROOT/agents"
SKILL_SRC="$FLEET_ROOT/shared-skills/moltbook/fleet"
OFFICIAL_SRC="$FLEET_ROOT/shared-skills/moltbook"

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Install the Moltbook skill into agent workspace(s).

Options:
  --agent <id>   Install to a specific agent (e.g. agent-01)
  --all          Install to all agents
  -h, --help     Show this help

Examples:
  $(basename "$0") --agent agent-01
  $(basename "$0") --all
EOF
  exit 1
}

install_to_agent() {
  local agent_id="$1"
  local agent_skill_dir="$AGENTS_DIR/$agent_id/workspace/skills/moltbook"

  if [ ! -d "$AGENTS_DIR/$agent_id" ]; then
    echo "Error: $agent_id not found in $AGENTS_DIR"
    return 1
  fi

  mkdir -p "$agent_skill_dir"

  cp "$SKILL_SRC/SKILL.md" "$agent_skill_dir/SKILL.md"
  cp "$SKILL_SRC/API.md" "$agent_skill_dir/API.md"
  cp "$OFFICIAL_SRC/HEARTBEAT.md" "$agent_skill_dir/HEARTBEAT.md"
  cp "$OFFICIAL_SRC/MESSAGING.md" "$agent_skill_dir/MESSAGING.md"
  cp "$OFFICIAL_SRC/RULES.md" "$agent_skill_dir/RULES.md"

  # Preserve existing credentials if present
  if [ ! -f "$agent_skill_dir/.credentials" ]; then
    touch "$agent_skill_dir/.credentials"
  fi

  echo "  Installed moltbook skill → $agent_id"
}

# --- Parse arguments ---

target=""
install_all=false

while [ $# -gt 0 ]; do
  case "$1" in
    --agent)     target="$2"; shift 2 ;;
    --all)       install_all=true; shift ;;
    -h|--help)   usage ;;
    *)           echo "Unknown option: $1"; usage ;;
  esac
done

if [ "$install_all" = false ] && [ -z "$target" ]; then
  echo "Error: specify --agent <id> or --all"
  usage
fi

# --- Verify source files exist ---

for file in SKILL.md API.md; do
  if [ ! -f "$SKILL_SRC/$file" ]; then
    echo "Error: $SKILL_SRC/$file not found"
    exit 1
  fi
done

# --- Install ---

echo "Installing Moltbook skill..."

if [ "$install_all" = true ]; then
  shopt -s nullglob
  for dir in "$AGENTS_DIR"/agent-*/; do
    install_to_agent "$(basename "$dir")"
  done
  shopt -u nullglob
else
  install_to_agent "$target"
fi

echo "Done."

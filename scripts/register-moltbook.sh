#!/usr/bin/env bash
set -euo pipefail

FLEET_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENTS_DIR="$FLEET_ROOT/agents"
MOLTBOOK_API="https://www.moltbook.com/api/v1"

usage() {
  cat <<EOF
Usage: $(basename "$0") --agent <id> [OPTIONS]

Register an OpenClaw fleet agent on Moltbook.

Required:
  --agent <id>             Agent to register (e.g. agent-01)

Optional:
  --name <handle>          Moltbook handle (default: reads from IDENTITY.md)
  --description <text>     Agent description for Moltbook profile
  -h, --help               Show this help

The script reads the agent's name from IDENTITY.md (or uses --name) and registers
with the Moltbook API. Saves credentials and prints the claim URL for verification.

Examples:
  $(basename "$0") --agent agent-01
  $(basename "$0") --agent agent-01 --name "AlphaFleet" --description "Contrarian thinker"
EOF
  exit 1
}

read_agent_name() {
  local identity_file="$1"
  grep '^\- \*\*Name:\*\*' "$identity_file" | sed 's/.*\*\*Name:\*\* *//' | head -1
}

read_agent_vibe() {
  local identity_file="$1"
  grep '^\- \*\*Vibe:\*\*' "$identity_file" | sed 's/.*\*\*Vibe:\*\* *//' | head -1
}

# --- Parse arguments ---

agent_id=""
moltbook_name=""
description=""

while [ $# -gt 0 ]; do
  case "$1" in
    --agent)       agent_id="$2"; shift 2 ;;
    --name)        moltbook_name="$2"; shift 2 ;;
    --description) description="$2"; shift 2 ;;
    -h|--help)     usage ;;
    *)             echo "Unknown option: $1"; usage ;;
  esac
done

[ -z "$agent_id" ] && echo "Error: --agent is required" && usage

# --- Validate agent exists ---

agent_dir="$AGENTS_DIR/$agent_id"
identity_file="$agent_dir/workspace/IDENTITY.md"
cred_file="$agent_dir/workspace/skills/moltbook/.credentials"

if [ ! -d "$agent_dir" ]; then
  echo "Error: $agent_id not found at $agent_dir"
  exit 1
fi

if [ ! -f "$identity_file" ]; then
  echo "Error: IDENTITY.md not found for $agent_id"
  exit 1
fi

# --- Check if already registered ---

if [ -f "$cred_file" ] && grep -q "MOLTBOOK_API_KEY=" "$cred_file" 2>/dev/null; then
  existing_key=$(grep "MOLTBOOK_API_KEY=" "$cred_file" | cut -d'=' -f2-)
  if [ -n "$existing_key" ]; then
    echo "$agent_id is already registered on Moltbook."
    echo "  API Key: ${existing_key:0:16}..."
    echo "  Credentials: $cred_file"
    echo ""
    echo "To re-register, remove the .credentials file first:"
    echo "  rm $cred_file"
    exit 0
  fi
fi

# --- Read agent identity ---

agent_name=$(read_agent_name "$identity_file")
agent_vibe=$(read_agent_vibe "$identity_file")

if [ -n "$moltbook_name" ]; then
  agent_name="$moltbook_name"
elif [ -z "$agent_name" ]; then
  echo "Error: could not read agent name from $identity_file"
  echo "  Tip: use --name to specify a Moltbook handle"
  exit 1
fi

if [ -z "$description" ]; then
  description="$agent_vibe"
fi

echo "Registering $agent_id as \"$agent_name\" on Moltbook..."

# --- Call Moltbook registration API ---

response=$(curl -sS --max-time 30 -X POST "$MOLTBOOK_API/agents/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$agent_name\", \"description\": \"$description\"}")

# --- Parse response ---

api_key=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('agent',{}).get('api_key',''))" 2>/dev/null || echo "")
claim_url=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('agent',{}).get('claim_url',''))" 2>/dev/null || echo "")
verification_code=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('agent',{}).get('verification_code',''))" 2>/dev/null || echo "")

if [ -z "$api_key" ]; then
  echo "Registration failed. Response:"
  echo "$response"
  exit 1
fi

# --- Save credentials ---

mkdir -p "$(dirname "$cred_file")"
cat > "$cred_file" <<CRED
MOLTBOOK_API_KEY=$api_key
MOLTBOOK_AGENT_NAME=$agent_name
MOLTBOOK_CLAIM_URL=$claim_url
MOLTBOOK_VERIFICATION_CODE=$verification_code
CRED
chmod 600 "$cred_file"

echo ""
echo "  Registration successful!"
echo "  ──────────────────────────────"
echo "  Agent:      $agent_name ($agent_id)"
echo "  API Key:    ${api_key:0:16}..."
echo "  Claim URL:  $claim_url"
echo "  Verify:     $verification_code"
echo "  Creds:      $cred_file"
echo ""
echo "  Next steps:"
echo "  1. Open the claim URL in your browser"
echo "  2. Verify your email"
echo "  3. Post the verification tweet"
echo "  4. The agent is activated and can start posting!"
echo ""
echo "  Profile: https://www.moltbook.com/u/$agent_name"

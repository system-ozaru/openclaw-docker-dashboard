#!/bin/sh
# Bootstrap memory structure on first start, then hand off to openclaw gateway.

MEMORY_DIR="/home/openclaw/.openclaw/workspace/memory"
MEMORY_FILE="$MEMORY_DIR/memory.md"

if [ ! -f "$MEMORY_FILE" ]; then
  mkdir -p "$MEMORY_DIR"
  cat > "$MEMORY_FILE" << 'EOF'
# Memory

This file stores important long-term memories and notes for this agent.
The agent will read and update this file to remember key information across sessions.

## About Me
<!-- Agent will fill in personal details here over time -->

## Important Notes
<!-- Key facts, preferences, and things to remember -->

## Past Interactions
<!-- Summaries of notable conversations and outcomes -->
EOF
  echo "[entrypoint] Initialized memory.md"
fi

exec openclaw gateway run --bind lan

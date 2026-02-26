{
  "models": {
    "mode": "merge",
    "providers": {
      "yunyi-claude": {
        "baseUrl": "${YUNYI_BASE_URL}",
        "apiKey": "${YUNYI_API_KEY}",
        "auth": "api-key",
        "api": "anthropic-messages",
        "models": [
          { "id": "claude-sonnet-4-5", "name": "Claude Sonnet 4.5", "reasoning": true, "input": ["text", "image"] },
          { "id": "claude-opus-4-6", "name": "Claude Opus 4.6", "reasoning": true, "input": ["text", "image"] },
          { "id": "claude-opus-4-5", "name": "Claude Opus 4.5", "reasoning": true, "input": ["text", "image"] },
          { "id": "claude-sonnet-4-6", "name": "Claude Sonnet 4.6", "reasoning": true, "input": ["text", "image"] },
          { "id": "claude-haiku-3-5", "name": "Claude Haiku 3.5", "input": ["text", "image"] }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "yunyi-claude/claude-sonnet-4-5"
      },
      "heartbeat": {
        "every": "55m",
        "target": "none"
      },
      "workspace": "/home/openclaw/.openclaw/workspace",
      "compaction": {
        "mode": "safeguard"
      },
      "maxConcurrent": 2,
      "subagents": {
        "maxConcurrent": 4
      }
    }
  },
  "gateway": {
    "port": ${GATEWAY_PORT},
    "mode": "local",
    "bind": "lan",
    "auth": {
      "mode": "token",
      "token": "${GATEWAY_TOKEN}"
    }
  },
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "boot-md": { "enabled": true },
        "session-memory": { "enabled": true }
      }
    }
  }
}

{
  "models": {
    "mode": "merge",
    "providers": {
      "clauder": {
        "baseUrl": "${CLAUDER_BASE_URL}",
        "apiKey": "${CLAUDER_API_KEY}",
        "auth": "api-key",
        "api": "anthropic-messages",
        "authHeader": true,
        "models": [
          {
            "id": "claude-haiku-4-5-20251001",
            "name": "Claude Haiku 4.5",
            "reasoning": true,
            "input": ["text", "image"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 200000,
            "maxTokens": 8192
          },
          {
            "id": "claude-sonnet-4-5-20250929",
            "name": "Claude Sonnet 4.5",
            "reasoning": true,
            "input": ["text", "image"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 200000,
            "maxTokens": 8192
          },
          {
            "id": "claude-opus-4-5-20251101",
            "name": "Claude Opus 4.5",
            "reasoning": true,
            "input": ["text", "image"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 200000,
            "maxTokens": 8192
          },
          {
            "id": "claude-opus-4-6",
            "name": "Claude Opus 4.6",
            "reasoning": true,
            "input": ["text", "image"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 200000,
            "maxTokens": 8192
          },
          {
            "id": "claude-sonnet-4-6",
            "name": "Claude Sonnet 4.6",
            "reasoning": true,
            "input": ["text", "image"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 200000,
            "maxTokens": 8192
          }
        ]
      },
      "openai": {
        "baseUrl": "${OPENAI_BASE_URL}",
        "apiKey": "${OPENAI_API_KEY}",
        "auth": "api-key",
        "api": "openai-completions",
        "authHeader": true,
        "models": [
          {
            "id": "gpt-4o",
            "name": "GPT-4o",
            "reasoning": true,
            "input": ["text", "image"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 128000,
            "maxTokens": 16384
          },
          {
            "id": "gpt-4o-mini",
            "name": "GPT-4o Mini",
            "reasoning": true,
            "input": ["text", "image"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 128000,
            "maxTokens": 16384
          },
          {
            "id": "o1",
            "name": "o1",
            "reasoning": true,
            "input": ["text", "image"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 200000,
            "maxTokens": 100000
          },
          {
            "id": "o3-mini",
            "name": "o3-mini",
            "reasoning": true,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 200000,
            "maxTokens": 100000
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "clauder/claude-sonnet-4-6",
        "fallbacks": [
          "clauder/claude-sonnet-4-5-20250929",
          "clauder/claude-opus-4-6",
          "openai/gpt-4o",
          "openai/o1",
          "clauder/claude-opus-4-5-20251101",
          "clauder/claude-haiku-4-5-20251001",
          "openai/gpt-4o-mini"
        ]
      },
      "models": {
        "clauder/claude-haiku-4-5-20251001": { "alias": "Claude Haiku 4.5" },
        "clauder/claude-sonnet-4-5-20250929": { "alias": "Claude Sonnet 4.5" },
        "clauder/claude-opus-4-5-20251101": { "alias": "Claude Opus 4.5" },
        "clauder/claude-opus-4-6": { "alias": "Claude Opus 4.6" },
        "clauder/claude-sonnet-4-6": { "alias": "Claude Sonnet 4.6" },
        "openai/gpt-4o": { "alias": "GPT-4o" },
        "openai/gpt-4o-mini": { "alias": "GPT-4o Mini" },
        "openai/o1": { "alias": "o1" },
        "openai/o3-mini": { "alias": "o3-mini" }
      },
      "workspace": "/home/openclaw/.openclaw/workspace",
      "compaction": {
        "mode": "safeguard"
      },
      "heartbeat": {
        "every": "55m",
        "target": "none"
      },
      "thinkingDefault": "medium",
      "verboseDefault": "off",
      "maxConcurrent": 4,
      "subagents": {
        "maxConcurrent": 8
      }
    },
    "list": [
      {
        "id": "main",
        "tools": {
          "allow": ["llm-task"]
        }
      }
    ]
  },
  "commands": {
    "native": "auto",
    "nativeSkills": "auto"
  },
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "boot-md": { "enabled": true },
        "command-logger": { "enabled": false },
        "session-memory": { "enabled": true }
      }
    }
  },
  "gateway": {
    "port": ${GATEWAY_PORT},
    "mode": "local",
    "bind": "lan",
    "controlUi": {
      "enabled": true,
      "basePath": "/"
    },
    "auth": {
      "mode": "token",
      "token": "${GATEWAY_TOKEN}"
    }
  }
}

      
{
    "meta": {
      "lastTouchedVersion": "2026.2.1",
      "lastTouchedAt": "2026-02-24T19:30:22.114Z"
    },
    "wizard": {
      "lastRunAt": "2026-02-24T19:30:22.104Z",
      "lastRunVersion": "2026.2.1",
      "lastRunCommand": "doctor",
      "lastRunMode": "local"
    },
    "models": {
      "mode": "merge",
      "providers": {
        "anthropic_zdaha": {
          "baseUrl": "https://code.z-daha.cc",
          "apiKey": "密钥",
          "auth": "api-key",
          "api": "anthropic-messages",
          "authHeader": true,
          "models": [
            {
              "id": "claude-haiku-4-5-20251001",
              "name": "Claude Haiku 4.5",
              "reasoning": true,
              "input": [
                "text",
                "image"
              ],
              "cost": {
                "input": 0,
                "output": 0,
                "cacheRead": 0,
                "cacheWrite": 0
              },
              "contextWindow": 200000,
              "maxTokens": 8192
            },
            {
              "id": "claude-sonnet-4-5-20250929",
              "name": "Claude Sonnet 4.5",
              "reasoning": true,
              "input": [
                "text",
                "image"
              ],
              "cost": {
                "input": 0,
                "output": 0,
                "cacheRead": 0,
                "cacheWrite": 0
              },
              "contextWindow": 200000,
              "maxTokens": 8192
            },
            {
              "id": "claude-opus-4-5-20251101",
              "name": "Claude Opus 4.5",
              "reasoning": true,
              "input": [
                "text",
                "image"
              ],
              "cost": {
                "input": 0,
                "output": 0,
                "cacheRead": 0,
                "cacheWrite": 0
              },
              "contextWindow": 200000,
              "maxTokens": 8192
            },
            {
              "id": "claude-opus-4-6",
              "name": "Claude Opus 4.6",
              "reasoning": true,
              "input": [
                "text",
                "image"
              ],
              "cost": {
                "input": 0,
                "output": 0,
                "cacheRead": 0,
                "cacheWrite": 0
              },
              "contextWindow": 200000,
              "maxTokens": 8192
            }
          ]
        },
        "gemini_zdaha": {
          "baseUrl": "地址",
          "apiKey": "密钥",
          "auth": "api-key",
          "api": "google-generative-ai",
          "authHeader": true,
          "models": [
            {
              "id": "gemini-2.5-flash",
              "name": "Gemini 2.5 Flash",
              "reasoning": true,
              "input": [
                "text",
                "image"
              ],
              "cost": {
                "input": 0,
                "output": 0,
                "cacheRead": 0,
                "cacheWrite": 0
              },
              "contextWindow": 200000,
              "maxTokens": 8192
            },
            {
              "id": "gemini-3-pro-preview",
              "name": "Gemini 3 pro Preview",
              "reasoning": true,
              "input": [
                "text",
                "image"
              ],
              "cost": {
                "input": 0,
                "output": 0,
                "cacheRead": 0,
                "cacheWrite": 0
              },
              "contextWindow": 200000,
              "maxTokens": 8192
            },
            {
              "id": "gemini-3-flash-preview",
              "name": "Gemini 3 Flash Preview",
              "reasoning": true,
              "input": [
                "text",
                "image"
              ],
              "cost": {
                "input": 0,
                "output": 0,
                "cacheRead": 0,
                "cacheWrite": 0
              },
              "contextWindow": 200000,
              "maxTokens": 8192
            }
          ]
        },
        "openai-codex_right": {
          "baseUrl": "接口地址",
          "apiKey": "你的密钥",
          "auth": "api-key",
          "api": "openai-completions",
          "authHeader": true,
          "models": [
            {
              "id": "gpt-5.2",
              "name": "GPT 5.2",
              "reasoning": true,
              "input": [
                "text",
                "image"
              ],
              "cost": {
                "input": 0,
                "output": 0,
                "cacheRead": 0,
                "cacheWrite": 0
              },
              "contextWindow": 200000,
              "maxTokens": 8192
            },
            {
              "id": "gpt-5.1-codex",
              "name": "GPT 5.1 Codex",
              "reasoning": true,
              "input": [
                "text",
                "image"
              ],
              "cost": {
                "input": 0,
                "output": 0,
                "cacheRead": 0,
                "cacheWrite": 0
              },
              "contextWindow": 200000,
              "maxTokens": 8192
            },
            {
              "id": "gpt-5.1-codex-max",
              "name": "GPT 5.2 Codex Max",
              "reasoning": true,
              "input": [
                "text",
                "image"
              ],
              "cost": {
                "input": 0,
                "output": 0,
                "cacheRead": 0,
                "cacheWrite": 0
              },
              "contextWindow": 200000,
              "maxTokens": 8192
            },
            {
              "id": "gpt-5.2-codex",
              "name": "GPT 5.2 Codex",
              "reasoning": true,
              "input": [
                "text",
                "image"
              ],
              "cost": {
                "input": 0,
                "output": 0,
                "cacheRead": 0,
                "cacheWrite": 0
              },
              "contextWindow": 200000,
              "maxTokens": 8192
            }
          ]
        }
      }
    },
    "agents": {
      "defaults": {
        "model": {
          "primary": "anthropic_zdaha/claude-opus-4-6",
          "fallbacks": [
            "anthropic_zdaha/claude-opus-4-6",
            "openai-codex_right/gpt-5.1",
            "openai-codex_right/gpt-5.1-codex",
            "openai-codex_right/gpt-5.2-codex",
            "openai-codex_right/gpt-5.1-codex-max",
            "anthropic_zdaha/claude-opus-4-5-20251101",
            "anthropic_zdaha/claude-sonnet-4-5-20250929",
            "anthropic_zdaha/claude-haiku-4-5-20251001"
          ]
        },
        "imageModel": {
          "primary": "gemini_zdaha/gemini-3-pro-preview"
        },
        "models": {
          "anthropic_zdaha/claude-haiku-4-5-20251001": {
            "alias": "Claude Haiku 4.5"
          },
          "anthropic_zdaha/claude-opus-4-5-20251101": {
            "alias": "Claude Opus 4.5"
          },
          "anthropic_zdaha/claude-sonnet-4-5-20250929": {
            "alias": "Claude Sonet 4.5"
          },
          "gemini_zdaha/gemini-2.5-flash": {
            "alias": " Gemini 2.5 Flash"
          },
          "gemini_zdaha/gemini-3-flash-preview": {
            "alias": " Gemini 3 Flash"
          },
          "gemini_zdaha/gemini-3-pro-preview": {
            "alias": " Gemini 3 Pro"
          },
          "openai-codex_right/gpt-5.1-codex": {
            "alias": "GPT 5.1 Codex"
          },
          "openai-codex_right/gpt-5.1-codex-max": {
            "alias": "GPT 5.1 Codex MAX"
          },
          "openai-codex_right/gpt-5.2": {
            "alias": "GPT 5.2"
          },
          "openai-codex_right/gpt-5.2-codex": {
            "alias": "GTP 5.2 Codex"
          },
          "anthropic_zdaha/claude-opus-4-6": {}
        },
        "workspace": "/Users/zhangdage/.openclaw/workspace",
        "envelopeTimezone": "local",
        "memorySearch": {
          "provider": "local",
          "fallback": "none",
          "model": "openai-codex_right/gpt-5.2-codex",
          "local": {
            "modelCacheDir": "openai-codex_right/gpt-5.2-codex"
          },
          "query": {
            "hybrid": {}
          },
          "cache": {
            "enabled": true
          }
        },
        "compaction": {
          "mode": "safeguard"
        },
        "thinkingDefault": "medium",
        "verboseDefault": "off",
        "elevatedDefault": "off",
        "maxConcurrent": 4,
        "subagents": {
          "maxConcurrent": 8
        }
      },
      "list": [
        {
          "id": "main",
          "tools": {
            "allow": [
              "llm-task"
            ]
          }
        }
      ]
    },
    "messages": {
      "ackReactionScope": "group-mentions"
    },
    "commands": {
      "native": "auto",
      "nativeSkills": "auto"
    },
    "session": {
      "dmScope": "per-channel-peer"
    },
    "hooks": {
      "internal": {
        "enabled": true,
        "entries": {
          "boot-md": {
            "enabled": true
          },
          "command-logger": {
            "enabled": false
          },
          "session-memory": {
            "enabled": true
          }
        }
      }
    },
    "channels": {
      "whatsapp": {
        "accounts": {
          "default": {
            "name": "",
            "dmPolicy": "pairing",
            "groupPolicy": "allowlist",
            "debounceMs": 0
          }
        },
        "dmPolicy": "pairing",
        "selfChatMode": false,
        "groupPolicy": "allowlist",
        "mediaMaxMb": 50,
        "debounceMs": 0
      },
      "telegram": {
        "enabled": true,
        "customCommands": [
          {
            "command": "new",
            "description": "开始新会话（清空上下文）"
          },
          {
            "command": "reset",
            "description": "重置当前会话"
          },
          {
            "command": "help",
            "description": "查看帮助/功能说明"
          },
          {
            "command": "status",
            "description": "查看系统状态"
          }
        ],
        "dmPolicy": "allowlist",
        "botToken": "",
        "allowFrom": [
          "7581088967"
        ],
        "groupPolicy": "allowlist",
        "streamMode": "partial",
        "mediaMaxMb": 30,
        "heartbeat": {
          "showOk": false,
          "showAlerts": false,
          "useIndicator": false
        }
      }
    },
    "gateway": {
      "port": 18789,
      "mode": "local",
      "bind": "lan",
      "controlUi": {
        "enabled": true,
        "basePath": "/"
      },
      "auth": {
        "mode": "token",
        "token": ""
      },
      "tailscale": {
        "mode": "off",
        "resetOnExit": false
      },
      "remote": {
        "url": "ws://openclaw.local:18789",
        "sshTarget": "test@openclaw.local"
      }
    },
    "skills": {
      "install": {
        "nodeManager": "npm"
      },
      "entries": {
        "nano-banana-pro": {
          "apiKey": ""
        }
      }
    },
    "plugins": {
      "allow": [
        "telegram",
        "llm-task",
        "whatsapp"
      ],
      "entries": {
        "llm-task": {
          "enabled": true
        },
        "telegram": {
          "enabled": true
        },
        "whatsapp": {
          "enabled": true
        }
      }
    }
  }
  
      
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends git curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN npm install -g openclaw@latest \
 && openclaw --version

RUN groupadd --gid 1001 openclaw \
 && useradd --uid 1001 --gid openclaw --create-home --shell /bin/bash openclaw

USER openclaw
WORKDIR /home/openclaw

EXPOSE 18700

ENTRYPOINT ["openclaw", "gateway", "run", "--bind", "lan"]

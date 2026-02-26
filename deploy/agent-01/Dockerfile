FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends git curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN npm install -g openclaw@latest \
 && openclaw --version

RUN groupadd --gid 1001 openclaw \
 && useradd --uid 1001 --gid openclaw --create-home --shell /bin/bash openclaw

COPY --chown=openclaw:openclaw config/ /home/openclaw/.openclaw/

USER openclaw
WORKDIR /home/openclaw

ENV HOME=/home/openclaw

EXPOSE 8080

ENTRYPOINT ["openclaw", "gateway", "run", "--bind", "lan"]

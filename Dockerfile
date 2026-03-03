FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends git curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN npm install -g openclaw@latest \
 && openclaw --version

RUN groupadd --gid 1001 openclaw \
 && useradd --uid 1001 --gid openclaw --create-home --shell /bin/bash openclaw

COPY --chown=openclaw:openclaw entrypoint.sh /home/openclaw/entrypoint.sh
RUN chmod +x /home/openclaw/entrypoint.sh

USER openclaw
WORKDIR /home/openclaw

EXPOSE 18700

ENTRYPOINT ["/home/openclaw/entrypoint.sh"]

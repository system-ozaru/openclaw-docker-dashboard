FROM node:22-slim AS builder
WORKDIR /app
COPY control-panel/package*.json ./
RUN npm ci
COPY control-panel/ .
RUN npm run build

FROM node:22-slim
WORKDIR /app
# Standalone output contains its own node_modules & server.js
COPY --from=builder /app/.next/standalone ./
# Static assets must be added alongside standalone output
COPY --from=builder /app/.next/static ./.next/static
ENV PORT=3333 HOSTNAME=0.0.0.0 FLEET_MODE=zeabur NODE_ENV=production
EXPOSE 3333
CMD ["node", "server.js"]

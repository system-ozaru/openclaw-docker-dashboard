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
# Static assets & public must be added alongside standalone
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
ENV PORT=3333 HOSTNAME=0.0.0.0 FLEET_MODE=zeabur NODE_ENV=production
EXPOSE 3333
CMD ["node", "server.js"]

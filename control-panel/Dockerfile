FROM node:22-slim AS builder
WORKDIR /app
COPY control-panel/package*.json ./
RUN npm ci
COPY control-panel/ .
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts ./
ENV PORT=3333 FLEET_MODE=zeabur NODE_ENV=production
EXPOSE 3333
CMD ["npx", "next", "start", "-p", "3333"]

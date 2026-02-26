FROM node:22-slim AS builder
WORKDIR /app
COPY control-panel/package*.json ./
RUN npm ci
COPY control-panel/ .
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
ENV PORT=3333 FLEET_MODE=zeabur
EXPOSE 3333
CMD ["node", "server.js"]

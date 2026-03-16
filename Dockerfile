# ── Stage 1: Build frontend ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Run ──
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/src/types ./src/types
COPY --from=builder /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
RUN mkdir -p data
EXPOSE 3000
CMD ["npx", "tsx", "server/index.ts"]

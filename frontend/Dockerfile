FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN bun install --registry https://registry.npmmirror.com

COPY . .
RUN bun run build

FROM caddy:alpine

COPY --from=builder /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80

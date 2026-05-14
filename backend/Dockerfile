FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json ./
RUN bun install --registry https://registry.npmmirror.com

COPY src/ ./src/

EXPOSE 3000

CMD ["bun", "src/index.ts"]

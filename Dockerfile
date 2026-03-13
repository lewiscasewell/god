FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install

COPY src ./src

CMD ["bun", "src/telegram.ts"]

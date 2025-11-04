FROM oven/bun:latest

WORKDIR /app

# Copy package files (optimize caching)
COPY package.json bun.lock* ./
COPY turbo.json ./
COPY apps/gateway/package.json ./apps/gateway/
COPY packages/ui/package.json ./packages/ui/
COPY packages/store/package.json ./packages/store/
COPY packages/utils/package.json ./packages/utils/
COPY packages/types/package.json ./packages/types/

# Install deps for the workspace
RUN bun install

# Copy the full monorepo
COPY . .

# Build only the gateway app
RUN bunx turbo build --filter=gateway

# Expose port and start the gateway
EXPOSE 3000
CMD ["bun", "run", "--cwd", "apps/gateway", "start"]
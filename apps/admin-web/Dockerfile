FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./
COPY turbo.json ./
COPY apps/admin-web/package.json ./apps/admin-web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/store/package.json ./packages/store/
COPY packages/utils/package.json ./packages/utils/
COPY packages/types/package.json ./packages/types/

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Build the app
RUN bunx turbo build --filter=admin-web

# Expose port and start
EXPOSE 3000
CMD ["bun", "run", "--cwd", "apps/admin-web", "start"]
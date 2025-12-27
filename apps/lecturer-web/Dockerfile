FROM oven/bun:latest

WORKDIR /app

ENV NODE_ENV=development

# Copy package files
COPY package.json bun.lock* ./
COPY turbo.json ./
COPY apps/lecturer-web/package.json ./apps/lecturer-web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/store/package.json ./packages/store/
COPY packages/utils/package.json ./packages/utils/
COPY packages/types/package.json ./packages/types/

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Build the app
RUN bunx turbo build --filter=lecturer-web

# Expose port and start
ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "run", "--cwd", "apps/lecturer-web", "start"]

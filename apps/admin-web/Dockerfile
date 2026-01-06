FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache bash curl
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

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

# Build the app (Next.js 16 requires Node 20.9+)
RUN cd apps/admin-web && npx next build

EXPOSE 3000
CMD ["npm", "run", "--prefix", "apps/admin-web", "start"]
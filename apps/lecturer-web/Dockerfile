FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache bash curl
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

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

# Build shared packages first, then build the Next.js app (Next.js 16 requires Node 20.9+)
RUN npx turbo build --filter=@layai/types --filter=@layai/utils --filter=@layai/ui --filter=@layai/store
RUN cd apps/lecturer-web && npx next build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "--prefix", "apps/lecturer-web", "start"]

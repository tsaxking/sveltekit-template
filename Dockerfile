# Multi-stage build for SvelteKit application
FROM node:22.12.0-alpine AS base

# Enable corepack and use it to enable pnpm
RUN corepack enable
RUN corepack prepare pnpm@9 --activate

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Development stage
FROM base AS development
ENV NODE_ENV=development
EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

# Build stage
FROM base AS build
RUN pnpm run build

# Production stage
FROM node:22.12.0-alpine AS production
RUN corepack enable
RUN corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy package files and install production dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=build /app/build ./build
COPY --from=build /app/src/server.js ./src/server.js

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S sveltekit -u 1001
USER sveltekit

EXPOSE 3000

CMD ["node", "src/server.js"]
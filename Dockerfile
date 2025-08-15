# Build stage - Use Alpine for smaller image size and better caching
FROM node:22.12.0-alpine AS builder

# Install build dependencies for native modules (canvas)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Install pnpm
RUN npm install -g pnpm@latest

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml ./
COPY .npmrc ./

# Install all dependencies (including devDependencies for build)
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Create environment file for build
RUN echo "PUBLIC_APP_NAME=Docker App Default" > .env

# Build the application
RUN pnpm build

# Production stage - Minimal runtime image
FROM node:22.12.0-alpine AS production

# Install runtime dependencies for canvas
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    musl \
    giflib \
    pixman \
    pangomm \
    libjpeg-turbo \
    freetype

# Install pnpm
RUN npm install -g pnpm@latest

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY .npmrc ./

# Install only production dependencies
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile --prod

# Copy built application from builder stage
COPY --from=builder /app/.svelte-kit ./.svelte-kit
COPY --from=builder /app/src ./src
COPY --from=builder /app/static ./static
COPY --from=builder /app/.env ./.env

# Copy any other required runtime files
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

EXPOSE 3000
CMD ["pnpm", "start"]
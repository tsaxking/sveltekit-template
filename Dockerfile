FROM node:22.12.0-alpine

# Install pnpm globally
RUN npm install -g pnpm@latest
RUN npm install -g typescript@latest

WORKDIR /app

# Copy only package files first for caching
COPY package.json pnpm-lock.yaml ./
RUN pnpm install


COPY ./build ./build
COPY ./.svelte-kit ./.svelte-kit
COPY ./cli ./cli
COPY ./config ./config
COPY ./drizzle ./drizzle
COPY ./mjml ./mjml
COPY ./private ./private
COPY ./scripts ./scripts
COPY ./src ./src
COPY ./static ./static

RUN touch .env


EXPOSE 3000
CMD ["pnpm", "start"]
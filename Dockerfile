FROM node:24.13.1-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apk add --no-cache git
RUN npm install -g typescript@latest

WORKDIR /app

COPY package.json pnpm-lock.yaml vite.config.ts tsconfig.json tailwind-config.ts .npmrc ./

RUN pnpm config set --global allowBuilds true

COPY ./src ./src
COPY ./scripts ./scripts
COPY ./static ./static
COPY ./supabase ./supabase

RUN pnpm install --no-frozen-lockfile
RUN pnpm --dir node_modules/ts-utils build && pnpm --dir node_modules/colors build

RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "start"]
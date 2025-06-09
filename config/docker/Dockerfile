FROM --platform=linux/amd64 node:22-slim AS base
# sets things up
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
COPY . .

# install dependencies
FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# build
FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY .env.example .env
RUN pnpm run build
RUN pnpm prune --production

# production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build/
COPY --from=build /app/run.sh ./run.sh
RUN chmod +x run.sh
COPY package.json .
EXPOSE 8000
# ENV NODE_ENV=production

# the command to actually start the server
# node --env-file=.env ./src/server.js
CMD [ "sh", "run.sh" ]
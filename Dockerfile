FROM node:22.12.0-bullseye

# Install global dependencies first (rarely changes)
RUN npm install -g pnpm@latest typescript

WORKDIR /app

# Copy only the files needed for install first, to cache dependencies better
COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# Then copy the rest of your source code
COPY . .

# Copy env file and build
RUN pnpm build

RUN echo "PUBLIC_APP_NAME=Docker App Default" > .env

EXPOSE 3000
CMD ["pnpm", "start"]
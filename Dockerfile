FROM node:22.12.0-bullseye

RUN npm install -g pnpm@latest
RUN npm install -g typescript

WORKDIR /app

COPY pnpm-lock.yaml package.json ./
RUN pnpm install

COPY . .
RUN cp .docker.env .env

RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "start"]

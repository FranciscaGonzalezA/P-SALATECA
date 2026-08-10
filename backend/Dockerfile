FROM node:22.22.3-alpine AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@11.7.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
COPY packages/contracts/package.json packages/contracts/package.json

RUN pnpm install --frozen-lockfile --filter backend...

COPY backend backend
COPY packages/contracts packages/contracts
COPY database database

RUN pnpm --filter @salateca/contracts build && pnpm --filter backend build

ENV NODE_ENV=production

WORKDIR /workspace/backend

EXPOSE 3000

USER node

CMD ["sh", "-c", "node dist/db/migrate.js && exec node dist/server.js"]

FROM node:22.22.3-alpine AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@11.7.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY scraper/package.json scraper/package.json

RUN pnpm install --frozen-lockfile --filter scraper...

COPY scraper scraper

RUN pnpm --filter scraper build

ENV NODE_ENV=production
WORKDIR /workspace/scraper

USER node

CMD ["node", "dist/cli.js", "--schedule"]

FROM node:22-slim AS base
RUN corepack enable pnpm

WORKDIR /app

# Install dependencies
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/adapter-utils/package.json packages/adapter-utils/
COPY packages/adapters/claude-code/package.json packages/adapters/claude-code/
COPY server/package.json server/
COPY cli/package.json cli/
COPY ui/package.json ui/

RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build UI
RUN pnpm --filter @cco/ui build

EXPOSE 3100

ENV CCO_HOME=/data
ENV CCO_DB_PATH=/data/cco.db

VOLUME ["/data"]

CMD ["node", "--import", "tsx", "server/src/index.ts"]

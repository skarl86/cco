# Stage 1: Dependencies
FROM node:24-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/adapter-utils/package.json packages/adapter-utils/
COPY packages/adapters/claude-code/package.json packages/adapters/claude-code/
COPY packages/adapters/codex/package.json packages/adapters/codex/
COPY packages/adapters/gemini/package.json packages/adapters/gemini/
COPY packages/adapters/opencode/package.json packages/adapters/opencode/
COPY server/package.json server/
COPY cli/package.json cli/
COPY ui/package.json ui/
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM deps AS build
COPY . .
RUN pnpm --filter @cco/ui build
RUN pnpm --filter @cco/server build

# Stage 3: Production
FROM node:24-slim AS production
WORKDIR /app
RUN corepack enable

# Install git and common tools
RUN apt-get update && apt-get install -y --no-install-recommends git curl && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/server ./server
COPY --from=build /app/cli ./cli
COPY --from=build /app/ui/dist ./ui/dist
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-workspace.yaml ./

# Create non-root user
RUN groupadd -r cco && useradd -r -g cco -m cco
RUN mkdir -p /home/cco/.cco && chown -R cco:cco /home/cco/.cco
USER cco

ENV CCO_HOME=/home/cco/.cco
ENV NODE_ENV=production

EXPOSE 3100
CMD ["node", "server/dist/index.js"]

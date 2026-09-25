# meshhook on dev2: a plain image because nixpacks' pinned nixpkgs ships Node 22.11
# while pnpm 11.18 needs >= 22.13 and has no nodejs_24. Same commands railway.toml ran.
FROM node:24-bookworm-slim
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.18.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @meshhook/web run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.mjs"]

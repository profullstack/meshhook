# syntax=docker/dockerfile:1
#
# meshhook.com on dev2, run on Bun. dev2's compose stack builds this file
# (/home/anthony/www/meshhook.com/docker-compose.app.yml, `dockerfile: Dockerfile`).
#
# One container, the same two processes as before: server.mjs supervises the
# SvelteKit web app (adapter-node build) and the queue orchestrator. It spawns
# both with process.execPath, so under Bun they run on Bun too.
#
# Contract with dev2, unchanged from the Node image: listens on 3000 (compose maps
# 127.0.0.1:APP_PORT), answers / for the deploy health check, reads DATABASE_URL,
# ORIGIN and the rest from app.env at run time.
FROM oven/bun:1.4.0-slim
WORKDIR /app
RUN chown bun:bun /app
USER bun
# The workspace manifests first, so a source-only change keeps the install layer.
COPY --chown=bun:bun package.json bun.lock ./
COPY --chown=bun:bun apps/web/package.json apps/web/
COPY --chown=bun:bun workers/package.json workers/
COPY --chown=bun:bun packages/shared/package.json packages/shared/
COPY --chown=bun:bun packages/cli/package.json packages/cli/
COPY --chown=bun:bun scripts/socket-patch.mjs scripts/
RUN bun install --frozen-lockfile
COPY --chown=bun:bun . .
# `bun --bun vite build`: the SvelteKit build runs on Bun, not Node.
RUN bun run build
ENV NODE_ENV=production
EXPOSE 3000
# 127.0.0.1, not localhost: localhost can resolve ::1 first.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"
CMD ["bun", "server.mjs"]

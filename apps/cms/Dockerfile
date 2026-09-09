# syntax=docker/dockerfile:1.7@sha256:a57df69d0ea827fb7266491f2813635de6f17269be881f696fbfdf2d83dda33e

# node:22.22.0-alpine, reviewed 2026-09-08.
ARG NODE_IMAGE=node:22.22.0-alpine@sha256:e4bf2a82ad0a4037d28035ae71529873c069b13eb0455466ae0bc13363826e34

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
RUN corepack enable && corepack prepare pnpm@11.19.0 --activate
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/cms/package.json apps/cms/package.json
COPY apps/website/package.json apps/website/package.json
COPY apps/dgtl360/package.json apps/dgtl360/package.json
COPY packages/cms-client/package.json packages/cms-client/package.json
COPY packages/content-contracts/package.json packages/content-contracts/package.json
RUN --mount=type=cache,id=dgtl-pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @dgtl/cms...

FROM dependencies AS source
COPY . .

FROM source AS builder
# Payload loads its configuration during `next build`. These are deliberately
# non-production placeholders; real credentials are injected only at runtime.
ENV CMS_DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV CMS_PUBLIC_URL=http://localhost:3000
ENV PAYLOAD_SECRET=container-build-placeholder-at-least-32-characters
# Payload imports the complete configuration during `next build`. Production
# policy therefore needs syntactically valid storage/scanner settings, but no
# live credential or network connection. These fixed values are intentionally
# unusable outside the build sandbox and are replaced by runtime env files.
ENV CMS_MEDIA_STORAGE=s3
ENV CMS_MEDIA_BUCKET=container-build-placeholder
ENV CMS_MEDIA_ENDPOINT=http://127.0.0.1:9000
ENV CMS_MEDIA_ACCESS_KEY_ID=container-build-placeholder
ENV CMS_MEDIA_SECRET_ACCESS_KEY=container-build-placeholder
ENV CMS_MEDIA_REGION=auto
ENV CMS_MEDIA_FORCE_PATH_STYLE=true
ENV CMS_MEDIA_SCAN_MODE=clamav
ENV CLAMAV_HOST=127.0.0.1
ENV CMS_EMAIL_PROVIDER=resend
ENV CMS_EMAIL_FROM_ADDRESS=cms@example.test
ENV CMS_EMAIL_FROM_NAME="DGTL CMS build"
ENV RESEND_API_KEY=container-build-placeholder
RUN pnpm --filter @dgtl/cms build

FROM ${NODE_IMAGE} AS web
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs
WORKDIR /app
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/.next/static ./apps/cms/.next/static
WORKDIR /app/apps/cms
USER nextjs
EXPOSE 3000
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((response)=>{if(!response.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "server.js"]

# The delivery worker and migration CLI need Payload's TypeScript config and
# migrations. They intentionally use a separate target from the minimal web
# image so the web attack surface stays small. The source tree sent here cannot
# contain .env files because the root .dockerignore excludes them.
FROM source AS tooling
ENV NODE_ENV=production
ENV PAYLOAD_DB_PUSH=false
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs
WORKDIR /app/apps/cms
USER nextjs
STOPSIGNAL SIGTERM

FROM tooling AS worker
CMD ["./node_modules/.bin/tsx", "src/worker.ts"]

FROM tooling AS migrate
CMD ["./node_modules/.bin/payload", "migrate"]

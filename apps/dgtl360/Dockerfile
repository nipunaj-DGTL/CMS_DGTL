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
    pnpm install --frozen-lockfile --filter @dgtl/dgtl360...

FROM dependencies AS builder
COPY . .

# Origins and the website key are public deployment identity. Credentials used
# to read, preview, revalidate, and send email are runtime-only and never build
# arguments. Fixed placeholders only allow Next.js module analysis to complete.
ARG CMS_URL=https://cms.dgtl.lk
ARG CMS_WEBSITE_KEY=client-02-main
ARG SITE_URL=https://dgtl.lk
ENV CMS_URL=${CMS_URL}
ENV CMS_WEBSITE_KEY=${CMS_WEBSITE_KEY}
ENV SITE_URL=${SITE_URL}
ENV CMS_READ_TOKEN=container-build-placeholder
ENV CMS_REVALIDATION_SECRET=container-build-placeholder
ENV CMS_PREVIEW_SECRET=container-build-placeholder
RUN pnpm --filter @dgtl/dgtl360 build

FROM ${NODE_IMAGE} AS web
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs
WORKDIR /app
COPY --from=builder --chown=nextjs:nodejs /app/apps/dgtl360/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/dgtl360/.next/static ./apps/dgtl360/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/dgtl360/public ./apps/dgtl360/public
WORKDIR /app/apps/dgtl360
USER nextjs
EXPOSE 3000
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/ready').then((response)=>{if(!response.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "server.js"]

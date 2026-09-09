# DGTL 360 Website

DGTL 360's CMS-driven marketing frontend. It is a first-class application in the DGTL CMS monorepo and uses the shared, validated content contracts and server-only CMS client.

## Run locally

```bash
pnpm install --frozen-lockfile
pnpm --filter @dgtl/dgtl360 dev
```

Open `http://localhost:3102`.

The local development site is connected to the DGTL multi-tenant CMS as `client-02-main`. Copy the CMS values from `.env.example` into an ignored `.env.local`; never prefix the read, revalidation, or preview secrets with `NEXT_PUBLIC_`.

Published CMS changes are read server-side and the CMS worker refreshes tagged data through the signed `/api/cms/revalidate` route. Production fails visibly when the CMS is unavailable; it never silently serves stale local content. Developers can explicitly opt into the legacy sample content with `CMS_ALLOW_LOCAL_FALLBACK=true`, but that flag is ignored in production.

## Production deployment

Use `apps/dgtl360/Dockerfile` through the repository's production Compose/CI release. The image build needs only the public CMS origin, website key and site origin. Read, preview, revalidation and email credentials are runtime-only secrets and must never be passed as Docker build arguments.

The enquiry form uses Resend and requires `RESEND_API_KEY`, `ENQUIRY_FROM_EMAIL`, and `ENQUIRY_TO_EMAIL`. Copy `.env.example` to an ignored `.env.local` for local development and never commit real credentials. `SITE_URL` is required for correct production social metadata.

The liveness endpoint is `/api/health`. `/api/ready` additionally performs an uncached, authenticated CMS website-binding check and fails when required production variables are missing.

## Quality checks

```bash
pnpm --filter @dgtl/dgtl360 test
pnpm --filter @dgtl/dgtl360 typecheck
pnpm --filter @dgtl/dgtl360 lint
pnpm --filter @dgtl/dgtl360 build
```

## Project organization

- `src/app/` — routes, global layout, metadata, and error states.
- `src/features/` — self-contained business sections such as hero, services, team, and enquiry.
- `src/components/` — shared layout primitives used across features and routes.
- `src/content/local/` — development-only legacy sample content.
- `public/assets/reference/` — supplied visual references used to reproduce the approved direction.
- `docs/` — architecture and maintenance notes.

The homepage, every `services/*` page, arbitrary page slug, and public post list/detail routes are read server-side from Client 02 in DGTL CMS. Editors manage supported blocks, text, media, typography, safe accent colors, SEO, nested navigation and site-wide labels in Payload. Every one of the 16 shared page blocks has a renderer; unknown future blocks render an explicit unavailable-content notice instead of disappearing silently.

See [docs/architecture.md](docs/architecture.md) for the full folder map and extension rules.

## Content and forms

The enquiry form posts to the body-limited, same-origin `/api/enquiry` endpoint, validates the request, discards honeypot submissions, and sends through Resend. See [docs/email-service.md](docs/email-service.md) for DNS setup and operational safeguards.

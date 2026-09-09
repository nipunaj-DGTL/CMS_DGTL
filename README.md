# DGTL CMS Platform

A production-shaped MVP for operating four independently deployed Next.js websites from one tenant-aware Payload CMS. The implementation follows the supplied `DGTL_CMS_MVP_4_Clients.md` specification while keeping production client names, credentials, and domains out of source control.

## What is implemented

- Payload `3.88.0`, Next.js `16.3.4`, PostgreSQL, and the official multi-tenant plugin.
- Four idempotent synthetic tenant/website seeds (`client-01` through `client-04`).
- Exactly two human CMS profiles: DGTL super admin and tenant-scoped client company admin, with protected assignments and a last-client-admin safeguard.
- Pages, optional posts, media, navigation, site settings, content requests, activity events, and revalidation deliveries.
- Drafts, versions, publishing authorization, same-tenant website checks, stable slug rules, and controlled blocks.
- Role-aware Admin dashboard plus a persistent selected-client/website banner.
- Versioned public DTOs, website-bound bearer credentials, private signed preview, and HMAC cache invalidation.
- A reusable Client 01 frontend plus the bespoke DGTL360 / Client 02 frontend,
  each independently deployed with its own website key, secrets, domain, and
  release lifecycle.
- Unit, contract, client, website-signature, and real-PostgreSQL tenant-isolation test suites.
- Local PostgreSQL, CI, worker process, environment templates, a Resend production
  email adapter, and operating runbooks.

## Repository map

```text
apps/cms                    Payload Admin, APIs, collections, seed and worker
apps/website                Reusable Next.js client deployment
apps/dgtl360                Bespoke DGTL360 / Client 02 Next.js deployment
packages/content-contracts  Versioned Zod DTO contracts
packages/cms-client         Server-only typed CMS client
docs                        Architecture, security and operations
clients.example.yaml        Non-secret four-client provisioning input
```

`apps/website` is the reusable starting point for standard client deployments;
`apps/dgtl360` shows how a separately designed frontend can remain visually
independent while consuming the same CMS contracts. Every deployment receives
its own `CMS_WEBSITE_KEY`, `CMS_READ_TOKEN`, revalidation secret, domain, and
release lifecycle.

## Local start

Requirements: Node.js 22.22.x, pnpm 11.19, and PostgreSQL 16. Docker is optional; `docker compose up -d postgres` starts the supplied database when Docker is available.

1. Copy `.env.example` to `apps/cms/.env` and `apps/website/.env.local`. Copy
   `apps/dgtl360/.env.example` to `apps/dgtl360/.env.local`, then set the
   Client 02 values and change every placeholder secret.
2. Install and generate Payload types:

   ```text
   pnpm install
   pnpm generate:types
   ```

3. Start PostgreSQL and seed the four synthetic clients:

   ```text
   pnpm seed
   ```

   Use `pnpm seed -- --dry-run` or `pnpm seed -- --client=client-01` for a safe preview or a targeted client.

4. Run the CMS, both client websites, and delivery worker together:

   ```text
   pnpm dev
   ```

Client 02 (DGTL360) is modeled as one published `home` page plus eight published `service` pages. Its designed frontend reads page content, media, SEO, navigation, contact details, and approved visual tokens from this CMS; frontend animation logic remains in the DGTL360 codebase.

For troubleshooting, the same processes can still be started separately with
`pnpm dev:cms`, `pnpm dev:website`, `pnpm dev:dgtl360`, and
`pnpm dev:worker`.

Payload Admin is at `http://localhost:3000/admin`; Client 01 is at
`http://localhost:3101`; DGTL360 / Client 02 is at `http://localhost:3102`.
Always use the exact `localhost` CMS hostname during local development. To test
two CMS roles simultaneously, use isolated browser sessions rather than mixing
`localhost` and `127.0.0.1`.

## Four website deployments

Deploy `apps/website` for standard client sites and `apps/dgtl360` for the
bespoke Client 02 site using the matching values in `clients.example.yaml`.
Never expose `CMS_READ_TOKEN`, `CMS_REVALIDATION_SECRET`, or
`CMS_PREVIEW_SECRET` through `NEXT_PUBLIC_` variables. The website key is an
identifier, not a secret.

For a new or independently designed Next.js frontend, follow the [Next.js CMS connection guide](docs/NEXTJS_CMS_CONNECTION_GUIDE.md).

Production client company admin invitations are deliberately not sent by the seed. Replace every `.invalid` admin address, verify the client contact, and invite client admins through an explicit audited operator step. See [CMS roles](docs/CMS_ROLES.md).

## Verification

```text
pnpm typecheck
pnpm test
pnpm build
```

`pnpm --filter @dgtl/cms test:int` runs the real PostgreSQL isolation suite when `TEST_DATABASE_URL` is present. CI supplies an ephemeral PostgreSQL service and executes it automatically.

## Production boundary

The repository supplies the deployable application and operational patterns;
real domains, managed object storage credentials, Resend sender-domain
verification, MFA/identity policy, alert destinations, backup schedules, and
secret-manager bindings are environment decisions. Complete the production
checklist in [operations.md](docs/operations.md) before onboarding live client
data. A successful local build is a release-candidate result, not authorization
to put client data on the public internet.

The current evidence, role matrix, disposable local credentials, known
residual risks, and public-launch decision are recorded in
[Production_Readiness_Report_2026-09-08.md](Production_Readiness_Report_2026-09-08.md).

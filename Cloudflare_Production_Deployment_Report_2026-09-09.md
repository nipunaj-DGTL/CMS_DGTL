# Cloudflare Production Deployment Report

**Assessment date:** 2026-09-09  
**System:** DGTL multi-tenant Payload CMS platform  
**Requested target:** Cloudflare production environment  
**Assessment result:** **NO-GO — no production deployment was performed**

## 1. Executive decision

The application must not be released to production in its current state.

The most compatible production architecture is:

```text
Administrators and client websites
                |
        Cloudflare DNS / Proxy
        TLS / WAF / Rate limits
                |
       Node.js CMS origin (Docker)
          |                  |
 Managed PostgreSQL      Private R2
          |
   CMS delivery worker -----> Client website revalidation endpoints
          |
       Private ClamAV
```

This is the project's documented **Strategy A**: Cloudflare supplies the edge,
security controls and R2 object storage, while Payload, migrations and the
continuous delivery worker run in a normal Node.js/Docker environment.

A direct Cloudflare Workers deployment is technically possible for a different
Payload architecture, but this repository is not that architecture. The
official Payload Cloudflare template uses Cloudflare D1 and R2 bindings. This
project uses PostgreSQL, the Payload PostgreSQL adapter, an S3-compatible
storage adapter, a standalone migration image, a TCP ClamAV service, and a
continuously running PostgreSQL-backed worker. Moving it to Workers would be a
separate migration project, not a deployment configuration change.

## 2. Actions performed during this assessment

- Read and compared the DevSecOps deployment runbook with the repository.
- Inspected the CMS Dockerfile, production Compose bundle, release manifests,
  deployment scripts and GitHub Actions workflows.
- Checked Git release identity, installed runtime and deployment tooling.
- Checked for Wrangler, vinext, OpenNext, D1 and Cloudflare Worker configuration.
- Re-ran the repository's immutable-action and image-pin validator.
- Re-ran the production dependency advisory policy.
- Reviewed current official Cloudflare, Payload and Next.js deployment guidance.
- Confirmed that no source code, database record, Cloudflare resource, DNS
  record, R2 bucket or production secret was changed.

## 3. Verification results

| Gate | Result | Evidence |
|---|---|---|
| Immutable Git commit | **BLOCKED** | The repository has no commit or `HEAD` |
| Git remote | **BLOCKED** | No remote repository is configured |
| Tracked release source | **BLOCKED** | All application files are untracked |
| Required Node.js | **PARTIAL PASS** | Node 22.22.0 is available, but the default shell uses unsupported Node 24.19.0 |
| pnpm version | **PASS** | pnpm 11.19.0 matches the repository pin |
| Dependency policy | **PASS** | Production audit passed with two documented temporary Moderate exceptions |
| Workflow/image pins | **PASS** | Actions, workflow containers and Docker base images are digest-pinned |
| Docker and Compose | **BLOCKED** | Docker is not installed on this workstation |
| Wrangler/cloudflared | **BLOCKED** | Neither tool is installed |
| Cloudflare application config | **BLOCKED** | No Wrangler, vinext, OpenNext, Worker, D1 or Container configuration exists |
| Production CMS health | **NOT AVAILABLE** | No production CMS endpoint exists; local port 3000 was not running at assessment time |
| Local PostgreSQL | **AVAILABLE FOR DEVELOPMENT** | PostgreSQL is listening locally on port 5432; this is not production evidence |
| CMS-only release package | **BLOCKED** | Protected Compose/workflows require Client 01 and DGTL360 images |
| External production controls | **NOT VERIFIED** | DNS, strict TLS, WAF, R2, email, MFA, monitoring and recovery are unprovisioned or have no evidence |

## 4. Existing controls that are suitable for Strategy A

- Node 22.22.0 and pnpm 11.19.0 are pinned.
- The CMS has separate non-root `web`, `worker`, and `migrate` container targets.
- Production Compose drops Linux capabilities, enables `no-new-privileges`,
  sets health checks and bounds container logs.
- Production local media storage fails closed; S3-compatible storage is
  required.
- PostgreSQL migrations are registered and production schema push can be
  disabled.
- CI includes lint, typecheck, tests, builds, PostgreSQL isolation checks,
  migration boot tests, browser tests, security scans and SBOM production.
- Image workflows support scanning, signing, provenance and immutable digests.
- Deployment scripts verify the exact successful CI commit and signed images.
- Application rollback correctly refuses to pretend that database migrations
  can be reversed automatically.

These controls make the project a credible protected-staging candidate after
the release and infrastructure blockers are closed.

## 5. Release-blocking findings

### P0 — No release identity

There is no initial Git commit, remote or protected default branch. CI cannot
associate tests, SBOMs, signed images, deployments or rollbacks with an exact
source revision.

### P0 — Current protected deployment is not CMS-only

The user requirement is to deploy the central CMS independently and connect
client websites later. The current production Compose bundle, image workflow,
release manifest validation, deploy script, smoke tests and rollback script all
require both demonstration frontends. A CMS-only release path must be created
and tested before deployment.

### P0 — No target production environment

No verified production Node/Docker host, managed PostgreSQL instance, private
R2 bucket, private ClamAV endpoint, email provider, monitoring destination or
secret store has been supplied. There is consequently no safe target for the
existing deployment artifacts.

### P1 — Direct Workers migration is not implemented

The repository has no Wrangler configuration, Workers entry point, D1 adapter,
R2 binding, vinext/OpenNext build, Cloudflare-compatible logger or Workers
migration process. Its existing PostgreSQL and S3 adapters cannot simply be
renamed to D1 and R2 bindings.

Cloudflare Pages is also not a valid fallback: Pages supports a static Next.js
export, while Payload requires dynamic Admin, API, authentication and upload
handlers. Full-stack Next.js applications belong on Workers, and this project
has not completed that port.

The continuous delivery worker currently uses a permanent polling loop and a
PostgreSQL advisory lock. Workers are request/event-driven, and Hyperdrive does
not support advisory locks or session state. The worker therefore needs a
Cloudflare-native redesign around Queues, Cron Triggers or Workflows, with
idempotent jobs and retry/dead-letter handling.

ClamAV scanning currently opens a raw TCP connection to a private Docker
service. Workers TCP sockets cannot connect to localhost or private IP targets,
so scanning must remain on the origin or move behind a separately secured and
tested service. Image transformations using Sharp also require an explicit
Workers compatibility proof. These behaviors must pass failure and retry tests
before client content is accepted.

### P1 — Database target is not finalized

The repository's CI, development Compose and README use PostgreSQL 16, while a
readiness report mentions PostgreSQL 18. A deployment ADR must choose one
version. PostgreSQL 16 is the lowest-risk current selection because that is the
version exercised by the committed CI definitions.

### P1 — Recovery evidence is incomplete

The self-hosted database backup script does not prove managed-database PITR,
R2 recovery, scheduled off-site copies or a coordinated restore. A successful
staging restore drill with measured RPO/RTO is required.

### P1 — Production security and operational gates are open

The following remain unverified:

- Cloudflare proxied DNS, Full (strict) TLS, origin lockdown and cache bypasses
  for authenticated Admin/API routes;
- WAF and rate-limit rules for login, preview and public API endpoints;
- private staging and production R2 buckets with least-privilege credentials;
- Super Admin MFA and the controlled first-admin ceremony;
- Resend sender verification plus SPF, DKIM and DMARC;
- database, queue, scanner, storage, certificate, authentication and 5xx alerts;
- authenticated Admin accessibility, cross-browser, load, spike and soak tests;
- exact-data migration rehearsal and tenant-isolation verification in staging.

## 6. Cloudflare hosting options considered

### Option A — Cloudflare edge plus Node/Docker origin: **Recommended**

Use Cloudflare for DNS, proxying, TLS, WAF, rate limiting and R2. Run CMS web,
worker and migration containers on a small Linux host and use managed
PostgreSQL. This matches the code and existing release engineering with the
least migration risk.

### Option B — Cloudflare Workers with D1/R2: **Migration required**

Payload provides an official Cloudflare template using D1 and R2. Cloudflare
currently recommends vinext for new Next.js 16 Workers projects, but vinext is
beta and requires a compatibility check. Workers provide only a subset of
Node.js behavior and impose isolate/runtime limits. This option requires a
formal spike, data-migration plan, compatibility suite and new production
architecture before adoption.

### Option C — Cloudflare Containers: **Not selected for the first release**

Cloudflare Containers can run the existing Linux image class, but the current
repository has no Container Worker/router configuration. Containers have
ephemeral disks, lifecycle/sleep behavior and explicit routing/scaling that
must be designed around. The persistent delivery worker, migrations, ClamAV,
health checks and zero-downtime rollout need a separate proof before this can
replace the existing normal Docker-host strategy.

## 7. Required deployment sequence

1. Create a CMS-only Compose/release/deploy/rollback/smoke path.
2. Add this repository to Git, review it and push an initial immutable commit.
3. Configure protected GitHub staging and production environments.
4. Record `ADR-DEPLOY-001` selecting Strategy A and the PostgreSQL version.
5. Provision a protected Linux staging origin with Docker Engine and Compose.
6. Provision managed PostgreSQL with TLS, runtime/migrator roles, PITR and alerts.
7. Provision separate private staging and production R2 buckets.
8. Provision a private ClamAV service and verified Resend sender domain.
9. Configure Cloudflare staging DNS, Full (strict) TLS, WAF, rate limits, cache
   exclusions and origin protection.
10. Build, scan, attest and sign images from the exact Git commit.
11. Run migrations once and deploy the signed CMS and worker images to staging.
12. Test Super Admin, Client Admin, tenant isolation, media scanning, preview,
    publish/revalidation, email, monitoring, backup/restore and rollback.
13. Complete accessibility and load gates.
14. Approve and deploy the exact staging-tested image digests to production.
15. Verify the public CMS health endpoint and record deployment evidence.

## 8. Inputs and authority required to continue

- GitHub organization/repository and protected-environment ownership.
- Selected Linux origin provider/host, region and deploy-user access.
- Selected managed PostgreSQL provider, version and region.
- Cloudflare zone/domain to use for the CMS, such as `cms.dgtl.lk`.
- R2 staging/production bucket names and account ownership.
- Resend sender domain and security/operations contacts.
- Explicit approval for any billable Cloudflare, database or server resources.
- Secrets entered through GitHub/Cloudflare/server secret stores, never pasted
  into chat or committed to the repository.

## 9. Final production status

| Target | Decision |
|---|---|
| Direct deployment of this repository to Cloudflare Workers today | **NO-GO** |
| Cloudflare Containers without a compatibility/staging project | **NO-GO** |
| Protected Strategy A staging after P0 prerequisites | **CONDITIONAL GO** |
| Public production deployment with client data today | **NO-GO** |

No production URL, release digest or rollback identifier can be issued because
no deployment occurred. Claiming otherwise would violate the supplied runbook's
go/no-go rule.

## 10. Primary references

- [Project production readiness report](./Production_Readiness_Report_2026-09-08.md)
- [Project operations runbook](./docs/operations.md)
- [Production Compose bundle](./deploy/compose.prod.yml)
- [CMS production image](./apps/cms/Dockerfile)
- [Payload production deployment](https://payloadcms.com/docs/production/deployment)
- [Official Payload Cloudflare D1/R2 template](https://github.com/payloadcms/payload/tree/main/templates/with-cloudflare-d1)
- [Cloudflare Next.js on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Cloudflare Pages Next.js guide](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [Cloudflare Workers Node.js compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)
- [Cloudflare Workers TCP sockets](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/)
- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare Hyperdrive database support](https://developers.cloudflare.com/hyperdrive/reference/supported-databases-and-features/)
- [Payload jobs and schedules](https://payloadcms.com/docs/jobs-queue/schedules)
- [Cloudflare Containers overview](https://developers.cloudflare.com/containers/)
- [Cloudflare Container lifecycle](https://developers.cloudflare.com/containers/concepts/architecture/)

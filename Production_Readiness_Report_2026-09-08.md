# DGTL CMS Platform — Production Hardening and Readiness Report

| Field                          | Result                                                      |
| ------------------------------ | ----------------------------------------------------------- |
| Assessment date                | 2026-09-08 (Asia/Colombo)                                   |
| Target runtime                 | Node.js 22.22.0, pnpm 11.19.0, PostgreSQL 18                |
| Code status                    | **Release candidate**                                       |
| Promotion to protected staging | **Conditional GO**                                          |
| Public production launch       | **NO-GO until the external launch gates in section 8 pass** |
| Local applications             | CMS on `:3000`, Client 01 on `:3101`, DGTL360 on `:3102`    |

## 1. Executive result

The previously reported code-owned Critical security, migration, publication,
tenant-access, media, and frontend-integration defects were remediated and
retested. The current working tree provides a production-oriented CMS,
worker, two independently deployable client frontends, migration path, security
controls, Docker definitions, CI workflows, deployment/rollback scripts,
health/readiness probes, backup tooling, and operating documentation.

The code is ready to enter protected Linux staging. It is not responsible to
claim a zero-defect public production launch from this workstation: the source
has not yet been committed, Docker is unavailable locally, and the real
Cloudflare, PostgreSQL, R2, ClamAV, Resend, monitoring, MFA, and recovery
environments have not been provisioned and proven. Those are explicit release
gates, not hidden assumptions.

## 2. Completed production capabilities

### Identity and tenant safety

- Exactly two supported CMS roles: DGTL Super Admin and Client Company Admin.
- Super Admin can manage tenants, websites, client accounts, content, and
  operations across the platform.
- Client Company Admin is restricted to its assigned tenant, website, content,
  media, navigation, settings, requests, and its own account.
- A client cannot enumerate or open another tenant's records.
- Client accounts cannot create users, read company-private tenant notes,
  change protected account state, or use the unlock endpoint.
- Suspended tenants lose client authoring access and public DTO resolution.
- The final active Client Company Admin cannot be suspended or deleted.
- Account invitations, verification, first-login password change evidence, and
  production fail-closed Resend configuration are implemented.

### Content lifecycle and frontends

- Pages support Draft, signed Preview, Publish, Republish, and Unpublish.
- Public-to-private transitions enqueue durable cache invalidation.
- Revalidation delivery is signed, timestamp-bounded, replay-protected,
  site-scoped, retryable, and auditable.
- Client 01 and DGTL360 resolve exact website credentials and fail closed on a
  key/token mismatch.
- Both frontends render all 16 supported CMS page blocks.
- Client 01 supports arbitrary published page slugs and posts.
- DGTL360 supports the CMS home page, all service routes, arbitrary CMS pages,
  posts, navigation, settings, SEO, media, and maintenance state.
- CMS media URLs are content-versioned. Matching immutable objects return 200,
  conditional requests return 304, and stale checksum URLs return 404.

### Data, media, email, and operations

- Four checked-in migrations create the current schema with schema push
  disabled; up, down, and reapply rehearsal passed on a clean database.
- Runtime and migration database roles are separated in the deployment design.
- Production media uses private S3/R2-compatible storage, checksum-based
  versioning, magic-byte MIME validation, and mandatory server-side ClamAV.
- Production CMS startup fails closed if required Resend, object-storage,
  scanner, origin, or secret configuration is absent.
- CMS liveness/readiness and both frontend liveness/readiness endpoints exist.
- Deployment uses immutable image digests, a migration-only job, staged rollout,
  exact frontend/CMS binding checks, one worker, Caddy TLS ingress, and an
  application-only rollback that never attempts a down migration.
- Backup tooling coordinates a quiesced PostgreSQL dump with a confirmed object
  storage checkpoint and checksums.

## 3. Verification evidence

Each gate is reported independently so unlike checks are not combined into a
misleading percentage.

| Gate                             | Result | Evidence                                                                                                                          |
| -------------------------------- | -----: | --------------------------------------------------------------------------------------------------------------------------------- |
| Exact runtime                    |   PASS | Node 22.22.0 and pnpm 11.19.0 used for final gates                                                                                |
| Workspace lint                   |   PASS | All five packages                                                                                                                 |
| TypeScript                       |   PASS | All five packages                                                                                                                 |
| Unit/contract/component tests    |   PASS | **121/121**, including worker-health fail-closed and graceful-shutdown coverage                                                   |
| Real PostgreSQL integration      |   PASS | **18/18** on a new temporary database                                                                                             |
| Production builds                |   PASS | Contracts, CMS client, CMS, Client 01, DGTL360                                                                                    |
| Migration rehearsal              |   PASS | Four migrations up, all down, then up again; clean schema booted                                                                  |
| Four-site credential isolation   |   PASS | **16/16** exact-key/token matrix                                                                                                  |
| Live Super Admin workflow        |   PASS | Fresh browser login on 2026-09-08; complete four-client/four-website dashboard verified                                           |
| Live Client Admin workflow       |   PASS | Fresh browser login on 2026-09-08; only two Client 01 pages listed; DGTL360 page ID 2 denied                                      |
| Draft → client edit → publish    |   PASS | Client 01 page ID 13 published with changed heading and serif font                                                                |
| Client 01 rendered result        |   PASS | `/release-qa-about-us` returned 200 with the changed text and typography class                                                    |
| Publish → unpublish invalidation |   PASS | Fresh 2026-09-08 retest: deliveries 40/41 both returned 200; CMS DTO and Client 01 route both changed from 200 to 404             |
| Revalidation worker              |   PASS | Fail-closed health semantics and graceful shutdown pass; live worker health reports active with a recent successful cycle         |
| Public media caching             |   PASS | Current object 200, matching ETag 304, stale content version 404                                                                  |
| Live health/readiness            |   PASS | Seven of seven CMS/frontend/worker endpoints returned 200                                                                         |
| Browser visual smoke             |   PASS | Client 01 and DGTL360 rendered CMS content; DGTL360 loaded 13 images and one video with non-zero media dimensions/no failed video |
| Production dependency threshold  |   PASS | Zero known High/Critical findings from `pnpm audit --prod --audit-level high`                                                     |
| Release-tooling static gates     |   PASS | Immutable action/container/base pins, Bash syntax, strict manifest parser tests, Cosign policy wiring, and exact-SHA CI gates     |

The currently visible local stack uses the synthetic-only `dgtl_cms` database
at local PostgreSQL port 55432. The clean migration/integration database was
deleted after its successful run. Earlier isolated content-lifecycle evidence
was captured before returning the visible stack to this reusable local
reference database.

## 4. Security disposition

The final production audit has two known Moderate advisories and no known
High/Critical advisory at the configured threshold:

- The Payload unlock advisory remains present in the latest published Payload
  3.88.0 dependency graph. The application explicitly restricts
  `cms-users/unlock` to a Super Admin. A live retest returned 403 for Client
  Admin and 200 for Super Admin. Upgrade the complete Payload family together
  when a fixed compatible release is published.
- The esbuild advisory describes its development server. esbuild is not used to
  serve this production Next.js runtime. Keep development servers private and
  continue dependency monitoring.

DOMPurify is overridden to 3.4.13, `sharp` is pinned to 0.35.4, GitHub Actions
are pinned to reviewed commit SHAs, checkout credentials are not persisted, and
CI includes dependency, secret, filesystem, SBOM, image, and provenance gates.
Private-repository-compatible keyless Cosign attestations bind each image
digest to the exact repository, commit, build target, variant, public origins,
and website keys; deployment verifies those predicates before staging.

These mitigations reduce known code risk, but staging must still prove HTTPS
cookies, WAF/rate-limit policy, scanner behavior, administrator MFA, secret
rotation, and central alerting.

The earlier Payload Admin axe run reported Critical and Serious editor
accessibility violations. That complete authenticated scan and manual
keyboard/screen-reader matrix has not been rerun after hardening, and no result
in this report supersedes it. Accessibility therefore remains an open release
blocker until the current UI passes or each product/vendor issue is remediated
and retested; it is not treated as an automatic vendor waiver.

## 5. Role acceptance evidence

| Capability                                       | Super Admin | Client Company Admin |
| ------------------------------------------------ | ----------: | -------------------: |
| View and manage all tenants                      |         Yes |                   No |
| Create websites and client accounts              |         Yes |                   No |
| Manage all client content                        |         Yes |                   No |
| Manage assigned website content                  |         Yes |                  Yes |
| Preview, publish, and unpublish assigned content |         Yes |                  Yes |
| Manage assigned navigation/settings/media        |         Yes |                  Yes |
| View another client's data                       |         Yes |                   No |
| View operational revalidation records            |         Yes |                   No |
| Manage own account/password                      |         Yes |                  Yes |
| Create an additional CMS role such as editor     |          No |                   No |

## 6. Deployment package delivered

- `.github/workflows/ci.yml` — quality, migration, isolation, browser, security,
  and evidence gates.
- `.github/workflows/images.yml` — five GHCR image targets, pre-push Trivy
  scan, SPDX/SLSA/custom Cosign attestations, and exact digest evidence.
- `.github/workflows/deploy.yml` — exact-successful-CI and attestation-gated,
  reviewed staging/production SSH promotion.
- `apps/*/Dockerfile` — CMS web/worker/migrator and both frontend images.
- `deploy/compose.prod.yml` — applications, worker, migration tool, optional edge.
- `deploy/compose.self-hosted-db.yml` — private PostgreSQL and ClamAV profile.
- `deploy/scripts/deploy.sh` — checkpoint, migrate, staged rollout, readiness,
  smoke testing, and atomic state record.
- `deploy/scripts/rollback.sh` — compatible app-only digest rollback.
- `deploy/scripts/backup.sh` — coordinated database/object checkpoint.
- `deploy/Caddyfile` — production TLS reverse proxy for the three public origins.
- `docs/operations.md` and `deploy/README.md` — operator and launch runbooks.

The included path is designed for a low-cost Linux VPS with Docker Compose,
Caddy, Cloudflare DNS, private R2, Resend, and either managed PostgreSQL or the
private self-hosted database profile. The checked-in VPS bundle is deliberately
not described as a turnkey UI-only Coolify import because its service-specific
runtime and migrator secrets must remain separated.

## 7. Local release-candidate access

These credentials are disposable local QA credentials, not production
credentials. Delete or rotate them before deploying any real client data.

| Access                   | URL / credential                            |
| ------------------------ | ------------------------------------------- |
| CMS                      | `http://localhost:3000/admin`               |
| Super Admin email        | `admin@example.test`                        |
| Super Admin password     | `replace-this-local-password`               |
| Client 01 Admin email    | `client01.owner@example.test`               |
| Client 01 Admin password | `client01-local-password`                   |
| Client 01 website        | `http://localhost:3101`                     |
| Client 01 home           | `http://localhost:3101/`                    |
| DGTL360 website          | `http://localhost:3102`                     |
| DGTL360 service example  | `http://localhost:3102/services/production` |

One browser profile cannot hold both Payload roles simultaneously. Log out
before switching between the two accounts, or use a separate private browser
profile. Never reuse these passwords on a public server.

## 8. Mandatory public-launch gates

Every item below requires evidence from GitHub CI or the target Linux
staging/production services. Public launch remains blocked until all are signed
off.

1. Create the initial reviewed Git commit and protect the release branch/tags.
   The current repository has no `HEAD` and every file is untracked, so no
   immutable release can yet be reproduced.
2. Run all required GitHub CI jobs against that exact commit and retain the
   evidence artifacts.
3. Build and scan the five Docker targets on Linux; this workstation has no
   Docker daemon and therefore cannot certify the images or rendered Compose
   runtime.
4. Provision staging DNS/TLS and verify Cloudflare **Full (strict)** mode. Never
   cache Admin, auth, preview, draft, mutation, or revalidation routes.
5. Provision private versioned R2/S3 storage and prove upload, retrieval,
   checksum invalidation, tenant isolation, and credential rotation.
6. Provision private ClamAV with current definitions; prove EICAR rejection and
   confirm that no rejected object remains in storage.
7. Verify a Resend sender domain and prove invite, verification, reset, expiry,
   and failure telemetry with an approved staging mailbox.
8. Enforce MFA or equivalent identity controls for administrators and test
   onboarding/offboarding.
9. Configure central logs, uptime, 5xx, login-failure, queue-age, delivery,
   database, storage, scanner, and certificate-expiry alerts.
10. Perform an isolated coordinated PostgreSQL plus object-storage restore,
    verify representative records/file hashes, and record achieved RPO/RTO.
11. Resolve and rerun the previously failing authenticated Payload Admin axe
    scan, then run the manual keyboard/screen-reader, cross-browser, responsive,
    load, spike, and soak gates at the thresholds in `Final_Testing_doc.md`.
12. Seed only provisioned client websites. The local reference data includes
    Client 03 and Client 04, but no frontend is deployed for them; their retrying
    local deliveries are expected and must not be part of a real release.

## 9. Final decision

The engineering remediation is complete enough for a **release candidate and
protected staging deployment**. Core functional, isolation, migration, build,
content-lifecycle, media, and live browser gates pass.

The platform is **not yet approved for public production traffic or real client
data** because release provenance and environment-dependent controls remain
unverified. When all section 8 items pass against one immutable commit and image
digest set, QA can issue the final production GO. Until then, use the running
environment only for local acceptance testing.

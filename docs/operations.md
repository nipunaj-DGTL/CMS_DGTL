# Operations and production checklist

## Current production gate

The application code is a **local release candidate**, not a production
approval. The former migration, publish-to-draft invalidation, tenant/user
access, media packaging, High dependency, and frontend integration defects have
been remediated and retested. Promotion remains **NO-GO for real client data**
until the exact Git revision has passed protected CI and staging, the external
services below are provisioned, and the launch checklist has recorded evidence.

Mandatory external launch gates are: production DNS/TLS, private versioned
object storage, ClamAV definition monitoring, a verified Resend sender domain,
MFA or equivalent identity enforcement for administrators, protected secrets,
central alerts, and a successful database-plus-object-storage restore drill.
The local host used for this review has no Docker daemon, so the images and
Compose rollout must also pass on the target Linux staging host before approval.

Never use `PAYLOAD_DB_PUSH=true` in staging or production. A successful local
schema push is not migration evidence.

## Runtime topology

`deploy/compose.prod.yml` defines the CMS web process, exactly one revalidation
worker, Client 01, DGTL360, an optional Caddy edge, and a one-shot migration
service. `deploy/compose.self-hosted-db.yml` adds PostgreSQL for a low-cost
single-server installation plus a private ClamAV daemon. A managed PostgreSQL
service may be used by omitting that override and changing the two database URLs
in the protected server env files. ClamAV's official guidance recommends 4 GB of
RAM for the scanner alone, so size a combined VPS with adequate headroom (often
8 GB minimum) or use a private scanner on a separate host.

The Caddy service is in the `edge` profile. A plain VPS starts it with
`--profile edge`. Compose `expose` is network-only: a different containerized
ingress must join `${COMPOSE_PROJECT_NAME}_app` and route to `cms:3000`,
`client01:3000`, and `dgtl360:3000` by service DNS. A host-level ingress needs
separately reviewed loopback-only port bindings because this bundle deliberately
publishes none. Never add a public port-3000 binding. The checked-in files are
not a turnkey UI-only Coolify import; see `deploy/README.md`. Never expose
PostgreSQL or ClamAV publicly.

Recommended server layout:

```text
/opt/dgtl/tooling/<sha>/ immutable deploy bundle plus content inventory
/opt/dgtl/releases/     root-owned, immutable, non-secret release manifests
/opt/dgtl/secrets/      root-owned runtime env files, deploy-group-readable
/opt/dgtl/state/        deploy-owned fixed lock and successful manifests
/opt/dgtl/backups/      deploy-owned local recovery staging; export encrypted
```

Create a dedicated `dgtl-deploy` group and add only the deployment account.
Make `tooling`, `state`, and `backups` real (not symlinked), deployment-owned
directories with mode `0700`. Make `releases` and `secrets` root-owned
directories with group `dgtl-deploy` and mode `0750`; use root-owned files with
group `dgtl-deploy` and mode `0640`. The deployment account needs read access to
Compose env files, but must not be able to rewrite release input or secrets.
Docker socket membership is effectively root-equivalent, so dedicate and
harden this host account, disallow interactive password login, and alert on its
use.

Copy each `deploy/secrets/*.env.example` file without the `.example` suffix and
replace every placeholder. The CMS runtime and migration env files should use
different database roles: the migrator may own/apply schema changes; the runtime
role should have only required application privileges. Secrets never belong in
release manifests, Docker build arguments, images, Git, shell history, or
browser-visible variables.

For a new self-hosted PostgreSQL volume, `deploy/postgres/init` creates the
separate migrator and runtime roles and grants future-table privileges. Keep the
matching passwords synchronized across `postgres.env`, `migration.env`, and
`cms.env`. These initialization scripts do not rerun on an existing data volume;
perform later credential rotation with a reviewed database runbook.
Use cryptographically random passwords and percent-encode any URL-reserved
characters when placing them inside `CMS_DATABASE_URL`.

For DigitalOcean Managed PostgreSQL, use the administrative URL only from a
protected operator shell with `deploy/scripts/provision-managed-postgres.sh`.
The idempotent script creates separate `dgtl_migrator` and `dgtl_app` logins,
removes public schema creation, grants DDL only to the migrator, and grants the
runtime role only the DML/sequence privileges Payload needs. Rerun it after the
first migration so existing objects and future-object defaults are both covered.
Do not place the administrative URL in either application environment file.

Frontend runtime env files use `CMS_URL=http://cms:3000` so authenticated API
traffic stays on the private Compose network and first boot does not depend on
Caddy already serving the public hostname. Image builds use the public CMS
origin only to compile Next.js image-host allowlists; Payload's `CMS_PUBLIC_URL`
keeps returned browser media URLs public.

## Images and provenance

The CMS Dockerfile has three targets built from one source revision:

- `web`: minimal Payload/Next.js server;
- `worker`: revalidation delivery process;
- `migrate`: one-shot Payload migration CLI.

The Client 01 image uses the `web` target in `apps/website/Dockerfile`. The
website build accepts only public origins and the non-secret website key as
arguments; read, preview, and revalidation credentials are runtime-only.

`.github/workflows/images.yml` requires a successful `ci.yml` push run for the
exact default-branch commit. It builds and loads all five in-repository targets,
including DGTL360, scans each local image and generates its SPDX SBOM before it
pushes explicit tags, then creates keyless Cosign/Sigstore provenance, SPDX, and
DGTL release-policy attestations and uploads exact digest evidence. The release
policy binds the Docker target, environment variant, compiled origins, and both
website identities to each digest. The deployment workflow verifies the public
Sigstore trust chain and transparency-log evidence, source repository, source
commit, trusted workflow, service repository names, and every bound value. A
release manifest must use
`image@sha256:...`, never `latest` or another mutable tag. The deploy script
applies the same digest/repository rule to PostgreSQL, ClamAV, and Caddy whenever
those optional self-hosted services are enabled.

The frontend images compile the public CMS origin into the Next.js image-host
allowlist. A staging environment with a different public CMS hostname therefore
needs staging-specific frontend image digests; changing only the runtime env file
is not sufficient for browser media. The manual image workflow exposes validated
`cms_public_url`, `client01_site_url`, and `dgtl360_site_url` inputs and records
them beside each digest. Tag builds default to the production origins. Promote
source revisions between environments, and record the exact environment-specific
digests in each release manifest.

Registry publication uses a unique variant/source/workflow-run tag so rerunning
the same source cannot overwrite a prior run's lookup label. Even these tags are
non-authoritative: record, verify, and deploy only the emitted digest and its
matching signed release policy.

## CI gates

`.github/workflows/ci.yml` enforces generated artifacts, lint, TypeScript, unit
and contract tests, PostgreSQL isolation tests, checked-in Playwright tests, a
migration-only empty-database boot with schema push disabled, dependency and
secret scanning, filesystem scanning, and an SBOM. A red migration-only job is a
real release blocker; do not weaken it or turn schema push back on.

Protect the production branch and require every CI job plus the DGTL360 consumer
contract/build status. GitHub Actions are pinned to reviewed commit SHAs and CI
rejects mutable references; review the weekly Dependabot Action-pin updates
instead of changing a workflow back to a moving tag.

Protect `v*` tags and configure required reviewers on both GitHub Environments.
Registry tag immutability is helpful, but deployments trust only verified
digests. Review and refresh the pinned PostgreSQL, ClamAV, Caddy, Trivy,
Gitleaks, Buildx, BuildKit, Node, and Dockerfile-frontend versions/digests on a
scheduled cadence; do not accept an automated update until CI, image scanning,
and staging pass.

The release workflow currently targets GitHub's `ubuntu-24.04` AMD64 runner. It
downloads the exact Buildx Linux AMD64 asset and verifies its reviewed SHA-256
before installation, then boots the builder from a digest-pinned BuildKit
multi-platform index. A future ARM runner migration must deliberately update
both the asset URL and its independently reviewed checksum.

Keyless signing uses GitHub's OIDC token and the public Sigstore Fulcio/Rekor
services, so it is viable for a private GitHub Free/Team repository without
GitHub Enterprise artifact-attestation licensing. Treat repository/workflow
identity and digest metadata as publicly observable transparency-log data and
never place secrets in predicates or image labels. If the organization cannot
accept that disclosure or dependency on the public Sigstore service, replace
this with an independently operated trust root and document its key-rotation,
revocation, and availability procedures before production.

GitHub Dependency Review runs only when the repository is public because its
private-repository use requires paid GitHub security features. The fail-closed
full production lockfile advisory audit remains mandatory for every repository
visibility and is the low-cost private-repository baseline.

The deploy workflow accepts deployment tooling only from the repository default
branch. Protect that branch, protect `v*` tags, require production Environment
reviewers, and restrict who may edit Environment variables/secrets or create a
server-side release manifest.

## Server preparation

Install a supported Docker Engine with Compose v2, `curl`, `rsync`, `flock`,
`find`, `mktemp`, `readlink`, and `sha256sum`. Use a dedicated non-root deploy
user with access only to Docker and the deployment-owned `/opt/dgtl`
directories; restrict SSH, enable OS security updates and log rotation, and
load the exact host key into the GitHub Environment secret
`DEPLOY_KNOWN_HOSTS`.
If GHCR packages are private, log the server into `ghcr.io` using a dedicated
read-only package token and a protected Docker credential store; never reuse the
workflow's publishing token or place registry credentials in a release manifest.

For the included GitHub deployment workflow, configure separate `staging` and
`production` Environments with:

- environment variables `DEPLOY_HOST` and `DEPLOY_USER`;
- secrets `DEPLOY_SSH_KEY` and `DEPLOY_KNOWN_HOSTS`;
- required reviewers for production.

The workflow stages deployment tooling immutably under
`/opt/dgtl/tooling/<GITHUB_SHA>`, verifies a checkout-derived content inventory,
and safely reuses the exact directory on a same-commit retry. It deliberately
expects a reviewed manifest to already exist under `/opt/dgtl/releases`, which
prevents CI from silently replacing hostnames or image digests. The manifest's
`TOOLING_GIT_SHA` must match the workflow commit; all five app digests must carry
valid Cosign provenance, SPDX, and DGTL release-policy attestations for its
`SOURCE_REPOSITORY`, `SOURCE_GIT_SHA`, environment, origins, and website
identities.

Validate a candidate configuration without starting it:

```text
docker compose --env-file /opt/dgtl/releases/<release>.env \
  -f deploy/compose.prod.yml \
  -f deploy/compose.self-hosted-db.yml \
  --profile tools --profile edge config
```

## Deployment sequence

1. Freeze the CMS and both frontend source SHAs, image digests, contract version,
   and migration set.
2. Confirm clean CI and DGTL360 consumer results.
3. Confirm and record the private, versioned object-storage checkpoint. For a
   managed database, confirm PITR and record `BACKUP_REFERENCE`; for self-hosted
   PostgreSQL, the deployment creates a quiesced database dump.
4. Pull every immutable application and enabled infrastructure image while the
   incumbent application is still serving traffic.
5. Stop the incumbent worker and CMS, keep them quiesced from the verified
   recovery point through the migration, and run the `migrate` target once with
   `PAYLOAD_DB_PUSH=false`.
6. Start and wait for CMS readiness, then both ready-gated frontends, then exactly
   one worker. Replace the edge proxy only after every application is healthy.
7. Run non-mutating health, binding, and representative page checks.
8. Record the successful release manifest and retain its predecessor.

Normal releases use `.github/workflows/deploy.yml`; do not bypass its
attestation gate. For an approved emergency invocation, first independently
run the same pinned Cosign `verify-attestation` identity and predicate checks
for all five digests, calculate and record the manifest SHA-256, and invoke the
tooling version named by the manifest:

```text
bash /opt/dgtl/tooling/<TOOLING_GIT_SHA>/scripts/deploy.sh \
  /opt/dgtl/releases/<release>.env <verified-manifest-sha256>
```

If backup, configuration, pull, or final pre-migration preparation fails, the
script attempts to restart exactly the incumbent CMS/worker services that were
previously running. As soon as the migration command starts, a failure could
mean a partially applied migration set, so writers remain stopped. Assess the
schema and use the compatible recorded rollback, coordinated restore, or an
approved forward fix; never auto-restart an old application against an unknown
schema or conceal a partial rollout by marking it successful.

An ordinary application release deliberately rejects a changed
`POSTGRES_IMAGE`. Upgrade PostgreSQL only through a separate, rehearsed database
upgrade runbook with a verified backup, compatibility checks, and a tested
restore path; do not combine an infrastructure major/minor upgrade with an
application rollout. For the same reason, it rejects changes to
`COMPOSE_PROJECT_NAME`, `SELF_HOSTED_POSTGRES`, or `ENABLE_CADDY` after the first
successful release. Those settings control volumes, database ownership, and
ingress topology and need their own reviewed transition plan.

Set `ENABLE_CADDY=true` and use the Caddy hostname values for a plain VPS. When
Cloudflare proxies the records, use **Full (strict)** TLS and do not create cache
rules for Payload Admin, authentication, preview, draft, or mutation routes.
Apply rate limits to login, preview, revalidation, uploads, and public forms.

`apps/cms/src/app/api/health` is the CMS/database readiness check;
`apps/cms/src/app/api/live` is process liveness. Both client frontends expose a
shallow process-health endpoint and `/api/ready`; readiness verifies the exact
CMS website binding and contract without returning a credential. Compose gates
traffic on readiness, and release smoke checks exercise both bindings.

## Rollback

Application rollback selects a previously recorded digest manifest:

```text
CONFIRM_DB_COMPATIBLE=YES \
  bash /opt/dgtl/tooling/<previous-TOOLING_GIT_SHA>/scripts/rollback.sh \
  /opt/dgtl/state/previous.env
```

This command never runs a down migration. Confirm that the prior application is
compatible with the current schema first. Prefer expand/contract migrations so
the previous and next release overlap safely. If a destructive migration makes
application rollback unsafe, stop and use an approved forward fix or coordinated
database/object-storage restore. Never improvise a partial database rollback.
Rollback accepts only the deployment-owned `state/previous.env`, which was
recorded after an attestation-verified successful deployment, and it must run
from the tooling commit bound into that manifest. It snapshots both selected and
active manifests under the fixed lock before reading either. The rollback
replaces only CMS, frontend, and worker containers; it never
recreates PostgreSQL, ClamAV, or Caddy from the older manifest. After smoke checks
pass, it records the selected application release as `current.env`, preserves
the active PostgreSQL/ClamAV/Caddy configuration and database/object-storage
recovery references, and records the displaced release as `previous.env`.

## Backups and restore evidence

For the self-hosted profile, `deploy/scripts/backup.sh` stops both CMS and the
worker, proves neither is running or restarting, reconciles PostgreSQL only
after writers are stopped, creates a custom-format dump, records the snapshotted
release manifest and separately verified object-storage checkpoint, and writes
SHA-256 checksums. A standalone backup resumes only services that were running.
During deployment it deliberately leaves those services quiesced through
migration; a pre-replacement failure attempts to restore the incumbent set.
It is only a baseline checkpoint: copy it to encrypted, access-controlled
off-site storage and enforce retention.

Object storage must be private, versioned, and included in the same recovery
procedure as PostgreSQL. Quarterly, restore both into an isolated environment,
verify record counts and representative file hashes, start the matching image
digests, run tenant isolation and publish/preview checks, and record achieved RPO
and RTO. A backup that has not been restored is not release evidence.

## Release

1. Confirm a successful PostgreSQL backup/PITR point and object-storage versioning.
2. Run unit, contract, PostgreSQL isolation, and build checks from CI.
3. Generate and review a Payload migration; never use schema push outside local/ephemeral test environments.
4. Deploy compatible CMS code and run the migration once.
5. Start the worker and verify `/api/health`.
6. Fetch one known published page for each website credential.
7. Preview and publish a staging page for every client, then confirm its delivery succeeded.
8. From staging, send the supported CMS account email flow to an approved test
   mailbox and verify sender identity, links, expiry, and delivery logs.
9. Upload the standard harmless EICAR scanner test file in staging. Confirm
   ClamAV rejects it, the CMS reports a safe error, and no object remains in the
   media bucket. Then upload and retrieve an approved image.
10. Record release, migration set, artifact digest, operator, and result.

After the production environment file has been mounted into the worker image,
the operator can exercise the three external integrations without storing a test
recipient in Git:

```text
NODE_ENV=production \
PRODUCTION_INTEGRATION_TEST_RECIPIENT=approved-test-mailbox@example.com \
pnpm --filter @dgtl/cms verify:production-integrations
```

The check uploads, reads and deletes one uniquely named text object; scans one
harmless PNG-signature buffer; verifies that ClamAV rejects the harmless EICAR
test pattern; and asks Resend to deliver one verification message. Run it only
in secured staging first. A returned Resend delivery ID proves provider
acceptance, while the operator must still confirm inbox arrival and links.

## Website did not update

Open **Operations → Revalidation deliveries** in Payload Admin. Confirm the delivery belongs to the expected website, inspect the safe error/status, check the website health endpoint, and retry with the same delivery ID only after fixing connectivity or secret rotation. Publication remains committed; the old cached page is the rollback-safe state.

## Suspected cross-tenant access

Suspend the affected user or tenant without deletion, preserve activity/security logs, rotate exposed website/preview credentials, identify the collection and request ID, and run the full four-tenant matrix. Do not purge records while investigating. Escalate as a security incident and notify affected parties according to contract and law.

## Tenant suspension/reactivation

Only a DGTL super admin changes tenant status. Suspension blocks client access and public DTO resolution but retains content. Confirm all website credentials return not-found/unavailable behavior. Reactivation requires a verified client company admin, valid domain/secret binding, and a four-site smoke test.

## Restore exercise

Quarterly, restore PostgreSQL and object storage into an isolated environment, deploy the matching release, verify each tenant’s record counts, execute isolation tests, preview/publish one page per tenant, and record achieved RPO/RTO. Target RPO is 24 hours minimum (15 minutes preferred) and RTO is four hours.

## Required production integrations

- Managed PostgreSQL with PITR, pooling, connection/storage/lock alerts.
- Private S3-compatible object storage with versioning and tenant-aware keys.
- A private ClamAV service (`CMS_MEDIA_SCAN_MODE=clamav`) with definition-update
  monitoring; the self-hosted Compose override includes one baseline instance.
- Resend with a verified sender domain, restricted API key, monitored delivery
  failures, and reviewed SPF/DKIM/DMARC; production must use
  `CMS_EMAIL_PROVIDER=resend` plus the documented sender address/name.
- MFA or enterprise OIDC for company accounts and offboarding automation.
- CDN/WAF TLS, rate limits, CSP, upload-size enforcement, and uptime checks.
- Central structured logs and alerts for CMS/website availability, 5xx rate, repeated login failure, queue age, failed delivery, storage failure, and certificate expiry.

## Administrator email and invitation acceptance

Production boot fails closed unless `CMS_EMAIL_PROVIDER=resend`,
`CMS_EMAIL_FROM_ADDRESS`, `CMS_EMAIL_FROM_NAME`, and `RESEND_API_KEY` are set.
Verify the sender domain in Resend and publish reviewed SPF, DKIM, and DMARC
records before inviting a real administrator. The supported operator flow is:

1. The Super Admin creates a Client Company Admin with the intended tenant,
   only the `client-admin` role, and a unique temporary password generated by
   an approved password manager. Keep the account in `invited` state.
2. Payload sends its verification message through the configured adapter.
3. Give the temporary password through a separate, expiring secure channel.
   The recipient follows the HTTPS verification link, logs in, and immediately
   changes that password from the Account screen.
4. Successful email verification activates the invited account. Confirm the
   first login, password change, exact tenant banner, and self-only account
   access in the audit trail.
5. Never send production passwords in chat, tickets, source control, or an
   environment template. Revoke test invitations and rotate a credential after
   any suspected disclosure.

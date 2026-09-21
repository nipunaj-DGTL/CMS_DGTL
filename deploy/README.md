# Deployment bundle

## CMS-only releases (default for new installations)

Use `DEPLOYMENT_SCOPE=cms-only` in the release manifest. The base Compose file
now contains CMS, worker, migration tooling and optional CMS ingress only.
Use `release.staging.env.example` and follow
[`docs/CMS_ONLY_STAGING_RUNBOOK.md`](../docs/CMS_ONLY_STAGING_RUNBOOK.md).
Demo websites are optional via `DEPLOYMENT_SCOPE=full-stack`, which adds
`compose.demos.yml`. Legacy manifests without a scope retain full-stack
meaning. Existing topology cannot be switched by an ordinary deploy/rollback.

The scope determines which application image signatures, secret files and
website smoke checks are required. All applicable release gates remain active.
The historical full-stack examples below apply only when that scope is chosen.

This directory is the server-side deployment interface for the DGTL CMS stack.
It turns the current application into a reproducible release candidate, but it
does not approve a public launch by itself; use the release gates in
`docs/operations.md` and promote through a Linux staging environment first.

## Plain VPS with Caddy and local PostgreSQL

1. Prepare the ownership-separated `/opt/dgtl` directories described in
   `docs/operations.md`.
2. Create root-owned, deploy-group-readable `/opt/dgtl/secrets/*.env` files
   from the examples.
3. Create a root-owned, deploy-group-readable immutable manifest in
   `/opt/dgtl/releases` from
   `release.env.example`, replacing every image with its GHCR digest.
4. Record the exact tooling/source commits, repository, image-build variant,
   compiled public origins, database recovery reference, and media checkpoint.
5. Point Cloudflare DNS at the server and use Full (strict) TLS.
6. Run the protected GitHub deployment workflow. It verifies keyless Sigstore
   attestations and their exact DGTL release policy,
   stages this directory under `/opt/dgtl/tooling/<git-sha>`, snapshots the
   manifest under the fixed deployment lock, and supplies its verified hash to
   the deploy script.

The manifest flags `SELF_HOSTED_POSTGRES=true` and `ENABLE_CADDY=true` enable the
two optional layers. The self-hosted override also runs ClamAV on the private
network. No database or scanner port is published. Media remains in private,
versioned R2/S3-compatible storage rather than a container volume.

The release-image workflow accepts only an exact commit with a successful CI
push run. It builds locally, scans and inventories the image before publishing
any tag, then creates provenance and SPDX SBOM attestations for the resulting
digest, plus a signed release policy that binds target, variant, origins, and
website identities. Git tag-triggered builds use production origins. Manual runs accept a deployment
variant and the three public origins so staging can receive separate, traceable
frontend digests with the correct Next.js media allowlist.
Registry tags contain the full source SHA and unique workflow run/attempt only
for lookup; release manifests must always use the emitted digest.

Do not invoke `deploy.sh` directly for a normal production release. The script's
hash argument protects the workflow-to-host transfer, while the GitHub workflow
is the external gate that verifies image provenance and SBOM signatures. An
emergency manual invocation first requires the same pinned Cosign identity and
predicate checks for all five application digests, a verified manifest hash,
and a recorded approval. Keyless signing uses the public Sigstore trust service,
so signing identity and digest metadata are transparency-log data; predicates
must never contain credentials or customer data.

## Managed PostgreSQL

Set `SELF_HOSTED_POSTGRES=false`, omit `compose.self-hosted-db.yml`, and put the
managed TLS connection strings in `cms.env` and `migration.env`. Confirm the
provider PITR point and set `BACKUP_CONFIRMED=true` plus its traceable
`BACKUP_REFERENCE` for that release. Every
deployment must also record `OBJECT_STORAGE_CHECKPOINT_CONFIRMED=true` and a
traceable `OBJECT_STORAGE_CHECKPOINT_REFERENCE`.

## Coolify

Do not import these VPS files as a UI-only Coolify stack yet. They intentionally
require service-specific protected `env_file` files, while the runtime and
migrator database credentials and the two websites' same-named secrets must stay
separate. A safe Coolify integration needs a dedicated, standalone Compose
resource with namespaced UI variables plus a separate one-shot migration
resource; `compose.self-hosted-db.yml` is an override, not a standalone file.
Until that definition is added and staging-tested, use the included SSH deployment
workflow on a plain VPS or provision the protected files on the host and run the
scripts directly. Never expose the migrator credential to application services.

## Files

- `compose.prod.yml` — applications, tooling target and optional Caddy ingress.
- `compose.self-hosted-db.yml` — optional private PostgreSQL and ClamAV services.
- `Caddyfile` — TLS reverse proxy for `cms.dgtl.lk`, Client 01 and `dgtl.lk`.
- `scripts/deploy.sh` — pull, checkpoint, migrate, rollout and smoke.
- `scripts/rollback.sh` — digest rollback without database downgrade.
- `scripts/backup.sh` — quiesced local PostgreSQL dump plus R2 checkpoint record.
- `scripts/smoke.sh` — non-mutating public checks.
- `../apps/dgtl360/Dockerfile` — first-class DGTL360 standalone image.

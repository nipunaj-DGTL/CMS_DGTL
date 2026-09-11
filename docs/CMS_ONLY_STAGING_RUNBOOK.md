# CMS-only staging runbook

## Scope and safety

The supported standalone release is the CMS web process, one delivery worker,
and a one-shot migration image. PostgreSQL, private object storage, ClamAV,
transactional email and HTTPS remain required dependencies. Client 01 and
DGTL360 are consumers, not dependencies of a CMS-only release.

Staging uses synthetic accounts and content, a separate database, bucket,
secrets and hostname. Do not connect it to the local demo database or to real
customer data. A passing build is not production approval.

## 1. Review and freeze a release

1. Review the intended CMS/content-contract changes and generated migrations.
2. Commit them together. Never run schema push against staging.
3. Require the CI checks for that exact commit: release validation, lint,
   types, unit/contracts, PostgreSQL isolation, migration-only boot, browser
   tests and security checks. Demo consumer tests remain regression coverage;
   passing them does not require hosting demo websites in production.
4. Merge the reviewed candidate into the protected default branch. Image and
   deployment workflows continue to reject non-default-branch manual releases.

## 2. Provision the isolated environment

The GitHub Environment is `staging`. Restrict deployment branches to `main`.
Configure these values only after the actual host and SSH identity are known:

| Kind | Name | How to obtain it |
| --- | --- | --- |
| Variable | `DEPLOY_HOST` | Real staging server IPv4 address or hostname |
| Variable | `DEPLOY_USER` | Dedicated server deployment account |
| Secret | `DEPLOY_SSH_KEY` | Its restricted SSH credential, through secure settings |
| Secret | `DEPLOY_KNOWN_HOSTS` | Host-key entry verified through an independent trusted channel |

Do not invent host values or bypass strict SSH host verification. A GitHub
Environment alone is not a server. Registry pull access on the host must also
be configured securely. Do not print credentials in job output.

Use the ownership-separated `/opt/dgtl` layout in `operations.md`. The current
deployment lock and state paths are fixed to `/opt/dgtl/state`; use a dedicated
staging host. Merely choosing another Compose project name on a production
host does not isolate the deployment state, ports or protected secrets.

## 3. Configure runtime dependencies

Prepare protected `cms.env` and `migration.env` from `deploy/secrets/` examples.
Use the staging CMS origin, independent strong secrets and a verified Resend
sender. Replace demo website token maps with `{}` until a synthetic staging
website is intentionally onboarded. Add only origins actually needed by the
integration; no wildcard authenticated-origin policy.

Keep `PAYLOAD_DB_PUSH=false`. Use a least-privileged database runtime user and
a separate migrator user. For self-hosted PostgreSQL, also provide
`postgres.env`; `compose.self-hosted-db.yml` provides private PostgreSQL and
ClamAV. With managed PostgreSQL, configure a separate private ClamAV service;
omitting the database override also omits its scanner.

Protect first-user setup behind restricted access. Create the intended company
super admin, verify account/email behavior and prove anonymous signup is closed
before making the environment more widely available.

### Media recovery is not just a checkpoint string

The backup script dumps PostgreSQL and records a separately verified media
recovery reference. It does not back up the media objects itself. R2's S3 API
does not implement bucket-versioning operations. If using R2, supply a tested
archive/backup design that retains overwritten and deleted objects, or use a
compatible provider with proven versioning/retention. Never claim a backup
exists merely by setting `OBJECT_STORAGE_CHECKPOINT_CONFIRMED=true`.

Source: https://developers.cloudflare.com/r2/api/s3/api/

## 4. Build only the CMS images

Run **Build release images** from the reviewed default-branch commit:

- `deployment_variant`: `staging`
- `deployment_scope`: `cms-only`
- `cms_public_url`: the actual staging HTTPS origin

The matrix includes only `cms-web`, `cms-worker` and `cms-migrate`. Demo origin
inputs are ignored for CMS-only deployment verification. The workflow preserves
local image scanning before publication, SBOM inventory and signed provenance.
The signed release policy binds source commit, image role, origin, environment
and deployment scope. It must match the release manifest.

The CMS Dockerfile-specific ignore file excludes demo source/assets, local
tooling, uploaded files, dependencies, build output and all environment files.
The two demo package manifests remain solely to resolve the workspace lockfile.

## 5. Create the reviewed manifest

Start from `deploy/release.staging.env.example`. Its hostname is illustrative,
not evidence of a provisioned DNS record. Fill exact source/tooling commits,
reviewed upstream pins, signed application digests, and verified recovery
references. Keep `DEPLOYMENT_SCOPE=cms-only` and
`IMAGE_BUILD_VARIANT=staging`. Never use mutable tags for a release.

Record an empty, restorable pre-migration baseline on first installation. Do not
run the demo seed. Store the root-owned manifest under `/opt/dgtl/releases`.

## 6. Deploy through the protected workflow

Run **Deploy immutable release**, selecting `staging` and the simple manifest
filename. The workflow validates the exact successful CI source, SSH identity,
image signatures and manifest hash before touching the host. The script pulls
images before stopping writers, checkpoints, runs migrations once, starts CMS
and one worker, then validates CMS health and login availability.

CMS-only smoke checks intentionally do not require a customer website to exist.
After onboarding one synthetic website, run the stronger authenticated public
API binding check with `SMOKE_WEBSITE_KEY` and `SMOKE_READ_TOKEN` supplied through
protected process configuration, not the release manifest.

## 7. Verify user requirements

Record evidence for super-admin and client-admin login, invitations/password
reset, account suspension, cross-tenant denial, page creation, supported block
editing, draft isolation, signed preview, publish-to-frontend updates, media
upload/replacement/scanning, navigation, social links and SEO. Connect a test
frontend separately; do not change customer-owned data to prove the flow.

Also record keyboard/mobile usability, realistic-load response times,
concurrent-edit behavior, dependency failure handling, restarts and a complete
database/media restore. Agree performance and recovery targets before claiming
they passed. Production email, scanning and HTTPS tests cannot be replaced by
development-mode mocks or a green unit-test suite.

## Optional full-stack demos and existing deployments

Use `DEPLOYMENT_SCOPE=full-stack`, build with that scope, and supply the demo
origins, website identities, signed images and two frontend secret files. The
scripts then add `compose.demos.yml` and the demo Caddy configuration.

Legacy manifests with no scope retain full-stack meaning. Deploy and rollback
reject a scope change against existing state. To migrate an already-hosted
full-stack installation, use a separately reviewed topology migration with
backups and explicit handling of old frontend containers and DNS. This runbook
does not delete any existing containers, demo content or website repositories.

## Rollback and approval

Use the protected previous successful manifest and verify current database
compatibility. Rollback never automatically reverses migrations or switches
deployment scope. Staging approval needs evidence for the exact deployed
revision; production approval remains a separate decision.

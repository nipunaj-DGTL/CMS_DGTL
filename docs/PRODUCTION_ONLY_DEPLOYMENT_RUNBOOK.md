# DGTL CMS production-only deployment runbook

Last reviewed: 2026-09-22

Target: `https://cms.dgtl.lk`

Repository: `nipunaj-DGTL/CMS_DGTL`

Deployment scope: CMS only (`DEPLOYMENT_SCOPE=cms-only`)

Production topology: one DigitalOcean VPS running Caddy, CMS, one worker,
PostgreSQL and ClamAV; private Cloudflare R2 for media; Resend for transactional
email; GitHub Container Registry and protected GitHub Actions for releases.

## 1. Purpose and important limitation

This runbook deliberately uses **one production environment and no staging
environment**, as requested. Skipping staging removes an important safety layer:
a defect in the exact production configuration may be discovered only on the
production server. The compensating controls in this runbook are mandatory:

1. Production starts with an empty database and no real client data.
2. The server remains restricted during initial verification.
3. The exact merged commit must pass all CI checks before deployment.
4. Only digest-pinned images may be deployed.
5. Database and media recovery must be proven before public launch.
6. Email, R2, ClamAV, reboot recovery and rollback must be exercised on the
   production host before real users are invited.
7. The CMS is not considered publicly launched merely because its login page
   loads.

This is a production-only **cold launch**. It is not permission to skip
production validation.

## 2. Final architecture

| Component | Production location | Publicly exposed? |
| --- | --- | --- |
| Caddy HTTPS edge | DigitalOcean VPS | Ports 80 and 443 only |
| CMS web process | Docker on VPS | No; reached through Caddy |
| Revalidation worker | Docker on VPS | No |
| PostgreSQL 16 | Docker on VPS | No |
| ClamAV | Docker on VPS | No |
| Uploaded media | Private Cloudflare R2 bucket | No anonymous bucket access |
| Transactional email | Resend | Outbound API only |
| Application images | GitHub Container Registry | Private package access if configured |
| Deployment control | GitHub Actions production Environment | SSH to deployment account |
| Existing `dgtl.lk` website | Existing shared hosting | Unchanged |
| CMS hostname | `cms.dgtl.lk` | Public only after final approval |

Do not move `dgtl.lk` or `www.dgtl.lk` to this VPS in this deployment. Do not
change existing MX records. Only `cms.dgtl.lk` belongs to this runbook.

## 3. Required accounts and information

Prepare access to all of the following before starting:

- DigitalOcean team/project with billing enabled.
- DNS management for `dgtl.lk`.
- Cloudflare account with R2 enabled.
- Resend account.
- GitHub repository administration access.
- A password manager approved by DGTL.
- A stable administrator public IP where possible.
- A monitored operations email address, for example `ops@dgtl.lk`.

Never paste production credentials into chat, tickets, Git commits, release
manifests or shell command arguments. Any credential previously used in local
testing or previously shared must be replaced.

## 4. Release code gate — complete before server deployment

### 4.1 Clean and review the repository

The production release must come from the protected default branch, normally
`main`. Before merging:

- review all modified and untracked files;
- ensure no `.env` file containing real values is tracked;
- ensure no password, API key, private SSH key or access token is present;
- ensure generated migrations required by the code are committed;
- ensure temporary output, test reports and local uploads are not accidentally
  included;
- run secret scanning and review every result;
- open a pull request and obtain the required review.

The following files may contain placeholders and may be committed:

- `.env.example`
- `apps/cms/.env.example`
- `deploy/secrets/cms.env.example`
- `deploy/secrets/migration.env.example`
- `deploy/secrets/postgres.env.example`
- `deploy/release.env.example`

They must never contain real production values.

### 4.2 Require a green exact-commit CI run

The exact commit merged into `main` must pass the repository CI, including:

- production release validation;
- lint;
- TypeScript checks;
- unit and contract tests;
- PostgreSQL isolation tests;
- browser tests;
- migration-only empty-database boot;
- migrated-schema verification;
- dependency, secret and filesystem scans;
- application builds and SBOM generation.

Do not disable a failing check to continue. Do not enable
`PAYLOAD_DB_PUSH=true`; production schema changes must use reviewed migrations.

Record the final 40-character `main` commit SHA. It will be both the source SHA
and tooling SHA in the first release manifest.

## 5. Create the DigitalOcean VPS

Create one Droplet with these settings:

| Setting | Required value |
| --- | --- |
| Region | Bangalore (`BLR1`) when available; otherwise Singapore (`SGP1`) |
| Image | Ubuntu 24.04 LTS x64 |
| Plan | Basic shared CPU for the initial low-traffic launch |
| CPU | 4 vCPU minimum |
| Memory | 8 GB minimum |
| Disk | 60 GB minimum |
| Authentication | SSH key only |
| IPv6 | Enabled |
| Monitoring | Enabled |
| Automated backups | Enabled, daily minimum |
| Hostname | `dgtl-cms-production` |
| Tags | `production`, `dgtl-cms` |

Eight GB is the minimum for this all-in-one topology because ClamAV recommends
3 GB minimum and 4 GB preferred, in addition to the CMS, worker, PostgreSQL,
Docker and operating system. Use 16 GB if production load or ClamAV signature
reloads cause memory pressure. Do not depend on swap as a substitute for RAM.

DigitalOcean reference:
<https://docs.digitalocean.com/products/droplets/how-to/create/>

ClamAV memory reference:
<https://docs.clamav.net/manual/Installing/Docker.html>

### 5.1 Verify the new VPS

Connect initially using the administrator SSH key:

```bash
ssh root@VPS_IPV4
```

Run:

```bash
cat /etc/os-release
uname -m
nproc
free -h
df -h /
timedatectl status
```

Expected:

- Ubuntu 24.04 LTS;
- `x86_64`/`amd64`;
- at least 4 CPUs;
- approximately 8 GB RAM or more;
- at least 60 GB disk;
- correct UTC-capable time synchronization.

Stop if these values are wrong.

## 6. Protect the host before installing the application

### 6.1 Create a named administrator

Create a separate administrative account. The example name is `dgtl-admin`:

```bash
adduser dgtl-admin
usermod -aG sudo dgtl-admin
install -d -m 0700 -o dgtl-admin -g dgtl-admin /home/dgtl-admin/.ssh
cp /root/.ssh/authorized_keys /home/dgtl-admin/.ssh/authorized_keys
chown dgtl-admin:dgtl-admin /home/dgtl-admin/.ssh/authorized_keys
chmod 0600 /home/dgtl-admin/.ssh/authorized_keys
```

Open a second terminal and prove that this works before modifying SSH:

```bash
ssh dgtl-admin@VPS_IPV4
sudo -v
```

### 6.2 Harden SSH

Using `sudoedit`, create `/etc/ssh/sshd_config.d/99-dgtl-hardening.conf` with:

```text
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
```

Validate before restarting:

```bash
sudo sshd -t
sudo systemctl restart ssh
```

Keep the confirmed `dgtl-admin` connection open while testing a fresh login.
Retain DigitalOcean Recovery Console access.

### 6.3 Apply operating-system updates

```bash
sudo apt update
sudo apt full-upgrade -y
sudo apt install -y ca-certificates curl jq rsync git openssl unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
sudo reboot
```

Reconnect as `dgtl-admin` after the reboot.

## 7. Create the DigitalOcean Cloud Firewall

Create a firewall called `dgtl-cms-production` and attach it by the
`dgtl-cms` tag.

During private production setup use:

| Direction | Protocol/port | Source/destination |
| --- | --- | --- |
| Inbound | TCP 22 | Administrator IP and approved deployment source only |
| Inbound | TCP 80 | All IPv4/IPv6; needed for HTTP redirect and ACME validation |
| Inbound | TCP 443 | Administrator IP, Droplet source and approved deploy runner only |
| Inbound | UDP 443 | Same restricted sources during setup |
| Outbound | ICMP | All |
| Outbound | TCP all | All |
| Outbound | UDP all | All |

Never allow public access to:

- `3000` — CMS;
- `3001` — worker health;
- `5432` — PostgreSQL;
- `3310` — ClamAV.

The application does not publish these ports. The Cloud Firewall is a second
control. Docker-published ports can bypass ordinary UFW rules, so treat the
DigitalOcean Cloud Firewall and the checked-in Compose bindings as authoritative.

DigitalOcean firewall reference:
<https://docs.digitalocean.com/products/networking/firewalls/getting-started/quickstart/>

## 8. Install Docker Engine and Compose

Use Docker's official Ubuntu repository, not the convenience script:

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

Create `/etc/apt/sources.list.d/docker.sources` using `sudoedit`:

```text
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: noble
Components: stable
Architectures: amd64
Signed-By: /etc/apt/keyrings/docker.asc
```

Install and verify:

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker run --rm hello-world
sudo docker version
sudo docker compose version
```

Official instructions:
<https://docs.docker.com/engine/install/ubuntu/>

## 9. Create the deployment identity and directory layout

The deployment account is separate from the human administrator:

```bash
sudo groupadd --system dgtl-deploy
sudo useradd --create-home --shell /bin/bash --gid dgtl-deploy dgtl-deploy
sudo usermod -aG docker dgtl-deploy
```

Create the protected layout:

```bash
sudo install -d -o dgtl-deploy -g dgtl-deploy -m 0700 /opt/dgtl/tooling
sudo install -d -o dgtl-deploy -g dgtl-deploy -m 0700 /opt/dgtl/state
sudo install -d -o dgtl-deploy -g dgtl-deploy -m 0700 /opt/dgtl/backups
sudo install -d -o root -g dgtl-deploy -m 0750 /opt/dgtl/releases
sudo install -d -o root -g dgtl-deploy -m 0750 /opt/dgtl/secrets
```

Do not make these directories symlinks. Do not grant the deployment account
permission to rewrite `/opt/dgtl/releases` or `/opt/dgtl/secrets`.

Docker group membership is effectively root-equivalent. The deployment account
must use key-only SSH and must not be shared with a human operator.

## 10. Create the GitHub deployment SSH key

On the trusted administrator computer, create a dedicated key different from the
human administration key and different from the GitHub repository deploy key:

```powershell
ssh-keygen -t ed25519 -a 64 -f "$env:USERPROFILE\.ssh\dgtl_cms_github_deploy" -C "DGTL CMS GitHub production deploy"
```

Add only its `.pub` content to:

```text
/home/dgtl-deploy/.ssh/authorized_keys
```

Required permissions:

```bash
sudo install -d -o dgtl-deploy -g dgtl-deploy -m 0700 /home/dgtl-deploy/.ssh
sudo chown dgtl-deploy:dgtl-deploy /home/dgtl-deploy/.ssh/authorized_keys
sudo chmod 0600 /home/dgtl-deploy/.ssh/authorized_keys
```

Place the private key only in the GitHub `production` Environment secret named
`DEPLOY_SSH_KEY`. Do not add it to the repository or VPS project directory.

## 11. Configure GitHub Container Registry access on the VPS

If the GHCR packages are private, create a dedicated GitHub machine/service
identity and a classic token with only `read:packages`. Authorize organization
SSO if the organization requires it.

Log into GHCR interactively as `dgtl-deploy` without placing the token in shell
history:

```bash
sudo -iu dgtl-deploy
docker login ghcr.io --username GITHUB_SERVICE_ACCOUNT
exit
```

Paste the token only at Docker's password prompt. Protect the resulting Docker
credential file. Do not use a personal administrator token or the workflow's
publishing token.

GitHub reference:
<https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry>

## 12. Create the private Cloudflare R2 storage

Create the primary bucket:

```text
dgtl-production-media
```

Settings:

- automatic/default jurisdiction unless DGTL has a documented residency rule;
- public access disabled;
- no public development URL;
- no anonymous custom domain;
- one account API token with Object Read & Write permission restricted to this
  bucket.

Record once in the password manager:

- Cloudflare account ID;
- R2 Access Key ID;
- R2 Secret Access Key;
- endpoint: `https://ACCOUNT_ID.r2.cloudflarestorage.com`.

Cloudflare reference:
<https://developers.cloudflare.com/r2/api/tokens/>

### 12.1 Mandatory media recovery

The main bucket is not a backup. Configure and document an independent archive
or backup process that retains overwritten and deleted objects. Test restoring
an object from that archive.

Create a traceable recovery reference, for example an operations record ID. The
release manifest's `OBJECT_STORAGE_CHECKPOINT_REFERENCE` must point to real
evidence. Do not set the confirmation flag merely to satisfy deployment checks.

## 13. Configure Resend

In Resend:

1. Add the sending subdomain `mail.dgtl.lk`.
2. Add exactly the SPF and DKIM records Resend supplies to authoritative DNS.
3. Publish and review DMARC.
4. Wait for Resend to show the sending domain as verified.
5. Create a sending-only API key restricted to that domain where supported.
6. Save the key once in the password manager.
7. Use `cms@mail.dgtl.lk` as the CMS sender.

Do not change existing inbound mail MX records for `dgtl.lk` unless Resend's
documented feature explicitly requires a record on its sending subdomain.

## 14. Generate new production secrets

Generate distinct 256-bit hexadecimal values. Run this separately for every
secret and store each result immediately in the password manager:

```bash
openssl rand -hex 32
```

Generate separate values for:

- Payload application secret;
- preview signing secret;
- PostgreSQL bootstrap owner password;
- PostgreSQL migrator password;
- PostgreSQL runtime application password.

Do not reuse any local Docker password or previously shared password. Hex values
avoid URL-reserved characters in PostgreSQL URLs. Use a separate password-manager
generated password later for the human Super Admin.

## 15. Create the protected production environment files

Create these files on the VPS with `sudoedit`:

```text
/opt/dgtl/secrets/cms.env
/opt/dgtl/secrets/migration.env
/opt/dgtl/secrets/postgres.env
```

Do not copy them back to the repository.

### 15.1 `/opt/dgtl/secrets/postgres.env`

```dotenv
POSTGRES_DB=dgtl_cms
POSTGRES_USER=dgtl_bootstrap
POSTGRES_PASSWORD=UNIQUE_BOOTSTRAP_PASSWORD
POSTGRES_INITDB_ARGS=--auth-host=scram-sha-256
POSTGRES_MIGRATOR_USER=dgtl_migrator
POSTGRES_MIGRATOR_PASSWORD=UNIQUE_MIGRATOR_PASSWORD
POSTGRES_APP_USER=dgtl_app
POSTGRES_APP_PASSWORD=UNIQUE_RUNTIME_PASSWORD
```

### 15.2 `/opt/dgtl/secrets/cms.env`

```dotenv
CMS_DATABASE_URL=postgresql://dgtl_app:UNIQUE_RUNTIME_PASSWORD@postgres:5432/dgtl_cms
CMS_PUBLIC_URL=https://cms.dgtl.lk
PAYLOAD_SECRET=UNIQUE_PAYLOAD_SECRET
CMS_PREVIEW_SIGNING_SECRET=UNIQUE_PREVIEW_SECRET
CMS_EMAIL_PROVIDER=resend
CMS_EMAIL_FROM_ADDRESS=cms@mail.dgtl.lk
CMS_EMAIL_FROM_NAME=DGTL CMS
RESEND_API_KEY=REAL_RESTRICTED_RESEND_KEY
CMS_WEBSITE_READ_TOKENS={}
CMS_REVALIDATION_SECRETS={}
CMS_ALLOWED_ORIGINS=
PAYLOAD_DB_PUSH=false
CMS_MEDIA_STORAGE=s3
CMS_MEDIA_BUCKET=dgtl-production-media
CMS_MEDIA_ENDPOINT=https://CLOUDFLARE_ACCOUNT_ID.r2.cloudflarestorage.com
CMS_MEDIA_ACCESS_KEY_ID=REAL_R2_ACCESS_KEY_ID
CMS_MEDIA_SECRET_ACCESS_KEY=REAL_R2_SECRET_ACCESS_KEY
CMS_MEDIA_REGION=auto
CMS_MEDIA_FORCE_PATH_STYLE=false
CMS_MEDIA_SCAN_MODE=clamav
CLAMAV_HOST=clamav
CLAMAV_PORT=3310
CLAMAV_TIMEOUT_MS=15000
```

### 15.3 `/opt/dgtl/secrets/migration.env`

```dotenv
CMS_DATABASE_URL=postgresql://dgtl_migrator:UNIQUE_MIGRATOR_PASSWORD@postgres:5432/dgtl_cms
CMS_PUBLIC_URL=https://cms.dgtl.lk
PAYLOAD_SECRET=THE_SAME_PAYLOAD_SECRET_AS_CMS_ENV
CMS_PREVIEW_SIGNING_SECRET=THE_SAME_PREVIEW_SECRET_AS_CMS_ENV
CMS_EMAIL_PROVIDER=resend
CMS_EMAIL_FROM_ADDRESS=cms@mail.dgtl.lk
CMS_EMAIL_FROM_NAME=DGTL CMS
RESEND_API_KEY=THE_SAME_REAL_RESEND_KEY
CMS_WEBSITE_READ_TOKENS={}
CMS_REVALIDATION_SECRETS={}
CMS_ALLOWED_ORIGINS=
PAYLOAD_DB_PUSH=false
CMS_MEDIA_STORAGE=s3
CMS_MEDIA_BUCKET=dgtl-production-media
CMS_MEDIA_ENDPOINT=https://CLOUDFLARE_ACCOUNT_ID.r2.cloudflarestorage.com
CMS_MEDIA_ACCESS_KEY_ID=THE_SAME_REAL_R2_ACCESS_KEY_ID
CMS_MEDIA_SECRET_ACCESS_KEY=THE_SAME_REAL_R2_SECRET_ACCESS_KEY
CMS_MEDIA_REGION=auto
CMS_MEDIA_FORCE_PATH_STYLE=false
CMS_MEDIA_SCAN_MODE=clamav
CLAMAV_HOST=clamav
CLAMAV_PORT=3310
CLAMAV_TIMEOUT_MS=15000
```

Protect the files:

```bash
sudo chown root:dgtl-deploy /opt/dgtl/secrets/*.env
sudo chmod 0640 /opt/dgtl/secrets/*.env
sudo find /opt/dgtl/secrets -maxdepth 1 -type f -printf '%M %u %g %f\n'
```

Expected mode/ownership: `-rw-r----- root dgtl-deploy`.

Do not print the file contents for verification.

## 16. Configure the GitHub production Environment

In GitHub repository settings, create an Environment named exactly:

```text
production
```

Restrict it to the protected `main` branch and add a required human reviewer.

Add Environment variables:

```text
DEPLOY_HOST=VPS_IPV4_OR_APPROVED_DEPLOY_HOSTNAME
DEPLOY_USER=dgtl-deploy
```

Add Environment secrets:

```text
DEPLOY_SSH_KEY=<complete dedicated private deployment key>
DEPLOY_KNOWN_HOSTS=<independently verified VPS SSH host-key line>
```

Obtain the host key from a trusted server console and compare its fingerprint
independently. Do not accept an unverified `ssh-keyscan` result as identity
proof. Test a deployment-account SSH login before continuing.

## 17. Build the production images

From the exact reviewed `main` commit, run the GitHub workflow named
**Build release images** with:

```text
deployment_scope: cms-only
deployment_variant: production
cms_public_url: https://cms.dgtl.lk
```

The workflow must build and publish only the required CMS images:

- `dgtl-cms-web`;
- `dgtl-cms-worker`;
- `dgtl-cms-migrate`.

It must complete image scanning, SBOM creation and signed attestations. Record
the exact `image@sha256:...` references emitted by the successful workflow.
Never copy only a mutable tag such as `latest`.

## 18. Pin the enabled infrastructure images

Resolve and review the current immutable registry digest for:

- `postgres:16-alpine`;
- the approved ClamAV feature/stable image;
- `caddy:2-alpine`.

Example inspection command:

```bash
docker buildx imagetools inspect docker.io/library/caddy:2-alpine
```

Repeat for PostgreSQL and ClamAV and record the displayed digest. The release
manifest must use `repository@sha256:digest`, never only a tag. A later
PostgreSQL image change requires a separate database-upgrade procedure; do not
combine it with an ordinary application release.

## 19. Create the immutable production release manifest

On the VPS, use `sudoedit` to create a timestamped file, for example:

```text
/opt/dgtl/releases/20260922T120000Z.env
```

Use this structure and replace every placeholder:

```dotenv
COMPOSE_PROJECT_NAME=dgtl-platform
DEPLOYMENT_SCOPE=cms-only
TOOLING_GIT_SHA=EXACT_40_CHARACTER_MAIN_COMMIT
SOURCE_REPOSITORY=nipunaj-DGTL/CMS_DGTL
SOURCE_GIT_SHA=THE_SAME_EXACT_MAIN_COMMIT
IMAGE_REPOSITORY_PREFIX=ghcr.io/nipunaj-dgtl
IMAGE_BUILD_VARIANT=production
IMAGE_CMS_PUBLIC_URL=https://cms.dgtl.lk
SECRETS_DIR=/opt/dgtl/secrets
SELF_HOSTED_POSTGRES=true
ENABLE_CADDY=true
BACKUP_CONFIRMED=false
BACKUP_REFERENCE=first-install-self-hosted-baseline
OBJECT_STORAGE_CHECKPOINT_CONFIRMED=true
OBJECT_STORAGE_CHECKPOINT_REFERENCE=REAL_MEDIA_RECOVERY_RECORD_ID
CMS_WEB_IMAGE=ghcr.io/nipunaj-dgtl/dgtl-cms-web@sha256:EXACT_DIGEST
CMS_WORKER_IMAGE=ghcr.io/nipunaj-dgtl/dgtl-cms-worker@sha256:EXACT_DIGEST
CMS_MIGRATE_IMAGE=ghcr.io/nipunaj-dgtl/dgtl-cms-migrate@sha256:EXACT_DIGEST
POSTGRES_IMAGE=docker.io/library/postgres@sha256:EXACT_DIGEST
CLAMAV_IMAGE=docker.io/clamav/clamav@sha256:EXACT_DIGEST
CADDY_IMAGE=docker.io/library/caddy@sha256:EXACT_DIGEST
ACME_EMAIL=ops@dgtl.lk
CMS_HOSTNAME=cms.dgtl.lk
CMS_ORIGIN=https://cms.dgtl.lk
```

Requirements:

- `TOOLING_GIT_SHA` must match the commit running the deployment workflow.
- `SOURCE_GIT_SHA` must match the commit used to build the images.
- The signed production policy attached to every CMS image must match the
  hostname, variant, scope, repository and source SHA.
- `OBJECT_STORAGE_CHECKPOINT_REFERENCE` must identify real recovery evidence.
- No secret belongs in this manifest.

Protect it:

```bash
sudo chown root:dgtl-deploy /opt/dgtl/releases/20260922T120000Z.env
sudo chmod 0640 /opt/dgtl/releases/20260922T120000Z.env
```

Do not edit a manifest after it has been approved. Create a new timestamped
manifest for any correction.

## 20. Prepare `cms.dgtl.lk` without changing the main website

At the authoritative DNS provider add:

```text
Type: A
Name: cms
Value: VPS_IPV4
TTL: 300
```

Do not change:

- the apex `dgtl.lk` record;
- `www.dgtl.lk`;
- existing MX records;
- the existing shared-hosting website.

If Cloudflare controls DNS, keep the new record DNS-only initially so Caddy can
obtain a publicly trusted certificate. Ensure no stale `AAAA` record points
elsewhere.

Before deployment confirm:

```bash
dig +short cms.dgtl.lk A
```

It must return the VPS IPv4 address.

## 21. Run the protected production deployment

In GitHub Actions run **Deploy immutable release** from `main` with:

```text
environment: production
release_manifest: 20260922T120000Z.env
```

Approve the production Environment review only after checking:

- exact commit SHA;
- successful CI;
- application image digests;
- infrastructure image digests;
- hostname and origin;
- R2 recovery evidence;
- secret-file ownership;
- DNS and firewall state.

The workflow and server scripts then:

1. verify the successful CI run for the exact commit;
2. verify the release-manifest hash;
3. verify signed image provenance, SBOM and release policy;
4. install immutable deployment tooling under `/opt/dgtl/tooling/<sha>`;
5. validate the rendered Compose configuration and protected environment;
6. pull all images before stopping writers;
7. create an empty, restorable database baseline on the first installation;
8. start and health-check ClamAV;
9. run reviewed migrations once with schema push disabled;
10. start and health-check the CMS;
11. start exactly one worker;
12. start Caddy on ports 80/443;
13. run read-only public health/login smoke checks;
14. record the successful release as `/opt/dgtl/state/current.env`.

Do not bypass this workflow by manually running `docker compose up` for a normal
release.

## 22. Verify the production deployment before opening it broadly

### 22.1 Container and resource checks

On the VPS identify the exact tooling SHA from the release and run the
corresponding Compose status command. Confirm:

- `postgres` is healthy;
- `clamav` is healthy;
- `cms` is healthy;
- exactly one `worker` is healthy;
- `caddy` is running;
- `migrate` exited successfully;
- no application container is restarting.

Also check:

```bash
free -h
df -h /
docker system df
sudo ss -tulpn
```

Only ports 22, 80 and 443 may be reachable from the host network. PostgreSQL
and ClamAV must remain container-private.

### 22.2 HTTPS and application checks

From an authorized computer:

```bash
curl -I http://cms.dgtl.lk
curl -I https://cms.dgtl.lk
curl https://cms.dgtl.lk/api/health
```

Confirm:

- HTTP redirects to HTTPS;
- the certificate is valid for `cms.dgtl.lk`;
- `/api/health` reports healthy;
- `/admin/login` loads without browser-console errors;
- port `3000` is not reachable publicly.

Caddy automatic HTTPS reference:
<https://caddyserver.com/docs/automatic-https>

## 23. Create the first production Super Admin safely

Keep HTTPS restricted to the approved administrator/deployment sources during
this step. Open:

```text
https://cms.dgtl.lk/admin
```

On the empty database, create the intended individual DGTL Super Admin:

- use a real individual DGTL email address;
- generate a unique password in the password manager;
- use the company account type;
- confirm the stored role is `company-super-admin`;
- complete email verification;
- log out and log back in;
- confirm anonymous creation is no longer available;
- confirm the dashboard shows production and no demo tenants/content.

Never run the local/demo seed in production. Never use the historical
`admin@docker.dgtl.test` account or its password.

Before public access, require MFA or equivalent identity enforcement for
administrators. If the CMS itself does not yet provide verified MFA, keep it
restricted by IP or place it behind a reviewed identity-aware access layer such
as Cloudflare Access. Do not call the CMS publicly ready without this control.

## 24. Execute real production integration checks

Use an approved test mailbox and protected production environment to exercise
all three external integrations.

The repository command is:

```bash
NODE_ENV=production \
PRODUCTION_INTEGRATION_TEST_RECIPIENT=APPROVED_TEST_MAILBOX \
pnpm --filter @dgtl/cms verify:production-integrations
```

Run it only from a secured checkout/process with the production environment
injected without committing it. The check must prove:

- R2 upload succeeds;
- the exact R2 bytes can be read;
- the temporary R2 object is deleted;
- ClamAV accepts a harmless image buffer;
- ClamAV rejects the harmless EICAR test payload;
- Resend accepts the verification message.

Manually confirm the email arrives in the mailbox. A provider delivery ID alone
does not prove inbox arrival.

Then use the Admin UI to:

1. upload an approved image;
2. confirm its object appears under the R2 `media/` prefix;
3. retrieve the image through the CMS media route;
4. replace the image and confirm the new bytes are served;
5. delete test media and confirm the expected storage behavior;
6. verify no scanner-rejected object remains in R2.

## 25. Prove reboot and worker recovery

With no real clients or content yet:

1. record current container health;
2. reboot the VPS cleanly;
3. reconnect after boot;
4. confirm Docker starts automatically;
5. confirm PostgreSQL, ClamAV, CMS, one worker and Caddy recover;
6. confirm `/api/health` becomes healthy;
7. confirm the login page and test media remain available;
8. confirm only one worker is running.

Do not proceed if an operator must manually reconstruct the stack after reboot.

## 26. Prove database and media recovery

### 26.1 Database backup

Use the deployed tooling's backup script and current successful manifest. It
temporarily quiesces the CMS and worker, produces a custom-format PostgreSQL
dump, records the release manifest and media recovery reference, and calculates
checksums.

Copy the resulting backup directory from `/opt/dgtl/backups` to encrypted
off-server storage. A backup that exists only on the same VPS is not sufficient.

### 26.2 Isolated restore drill

Before public launch:

1. create an isolated recovery location that cannot reach production services;
2. restore the PostgreSQL dump;
3. restore at least one media object from the independent media archive;
4. deploy the matching image digests and manifest;
5. verify the Super Admin record, health and restored media;
6. record the achieved recovery time and recovery point;
7. destroy the isolated copy after retaining non-secret evidence.

Target:

- RPO: no more than 24 hours for the initial low-traffic deployment;
- RTO: no more than 4 hours.

If these objectives are not acceptable, use continuous WAL archiving or move
PostgreSQL to a managed service with proven point-in-time recovery before real
clients are onboarded.

## 27. Prove application rollback

After a second harmless release exists, retain both current and previous
manifests. Before invoking rollback, confirm the older application images are
compatible with the current database schema.

The rollback script accepts only the protected previous successful manifest and
does not reverse database migrations. A rollback must never automatically put
old code against an unknown or partially migrated schema.

Record:

- selected previous release;
- schema-compatibility decision;
- operator and approval;
- rollback start/end time;
- health and smoke results.

For a first release with no predecessor, recovery is a database/media restore or
an approved forward fix—not an invented rollback.

## 28. Configure monitoring and alerts

Before public launch configure delivered alerts for:

- Droplet CPU saturation;
- memory pressure and swap use;
- root disk usage at 70% warning and 85% critical;
- HTTPS and `/api/health` availability;
- TLS certificate expiry;
- CMS/container restarts;
- PostgreSQL health and storage;
- ClamAV health and stale signature definitions;
- worker health and queue age;
- failed revalidation deliveries;
- elevated HTTP 5xx rate;
- repeated login failures;
- Resend delivery failures;
- R2 read/write failures;
- missed database/media backup;
- unauthorized SSH/deployment-account use.

Send test alerts and confirm a responsible person receives them. A configured
alert that has never been delivered is not verified monitoring.

## 29. Public launch gate

All items below must be true:

- [ ] Exact merged `main` commit passed all required CI checks.
- [ ] Production images are digest-pinned and their attestations passed.
- [ ] VPS has at least 4 vCPU, 8 GB RAM and adequate disk.
- [ ] SSH is key-only; direct root login and password login are disabled.
- [ ] DigitalOcean Cloud Firewall is attached.
- [ ] Only Caddy publishes ports 80/443.
- [ ] PostgreSQL, ClamAV, CMS and worker ports are not public.
- [ ] R2 bucket is private and token is bucket-scoped.
- [ ] Deleted/overwritten media recovery was tested.
- [ ] Resend sender domain is verified and inbox delivery was confirmed.
- [ ] ClamAV accepted a safe file and rejected EICAR.
- [ ] Database backup completed and an isolated restore succeeded.
- [ ] Production reboot recovery succeeded.
- [ ] Super Admin uses a unique individual account and protected password.
- [ ] MFA or equivalent identity control is active.
- [ ] Anonymous signup/first-user creation is closed.
- [ ] No demo user, tenant, website, page or token exists.
- [ ] `CMS_WEBSITE_READ_TOKENS={}` until a real website is onboarded.
- [ ] `CMS_REVALIDATION_SECRETS={}` until a real website is onboarded.
- [ ] `PAYLOAD_DB_PUSH=false` in both protected environment files.
- [ ] Uptime, resource, security and backup alerts were delivered successfully.
- [ ] A rollback/recovery decision owner is available during launch.

If any mandatory item is false, keep production access restricted and mark the
launch **NO-GO**.

## 30. Open production access

After the launch gate is approved:

1. Retain TCP 80 and 443 access required for Caddy and HTTPS.
2. Open TCP/UDP 443 to intended users, or route through the approved
   identity-aware Cloudflare policy.
3. If enabling Cloudflare proxying, first confirm the origin certificate is
   valid, then set SSL/TLS mode to **Full (strict)**—never Flexible.
4. Restrict origin access further only after verifying certificate renewal,
   health monitoring and GitHub deployment connectivity.
5. Test the public URL from a network unrelated to the VPS.
6. Confirm the login page, authentication, password reset and logout.
7. Confirm the existing `dgtl.lk` and `www.dgtl.lk` website remains unchanged.
8. Record the public launch time, commit, manifest, digests, operator and
   approval.

Cloudflare Full (strict) reference:
<https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/>

## 31. First 24 hours after launch

For the first day:

- watch CPU, RAM, disk and swap;
- watch CMS, worker, PostgreSQL, ClamAV and Caddy restarts;
- review 4xx/5xx and authentication failures;
- confirm ClamAV signatures continue updating;
- confirm the scheduled backup completes and is exported off-server;
- verify Resend delivery logs;
- verify R2 errors and usage;
- do not onboard a real client until the system remains stable and the first
  backup is independently recoverable.

Scale to 16 GB RAM if memory pressure, out-of-memory kills, heavy swap or
ClamAV reload instability appears. Do not solve persistent memory exhaustion by
adding increasingly large swap.

## 32. Routine production operation

### Daily

- review uptime and security alerts;
- review failed deliveries and scanner failures;
- verify database and media backup completion;
- review disk and memory headroom.

### Weekly

- review OS and container security updates;
- review Resend bounces/failures;
- review ClamAV definition freshness;
- verify off-server backup inventory;
- review deployment and Super Admin activity.

### Monthly

- review Super Admin membership and remove unused access;
- rotate credentials after any personnel or exposure event;
- review firewall rules and SSH keys;
- test a representative backup checksum;
- review dependency and pinned-image updates through CI before releasing.

### Quarterly

- perform a complete isolated PostgreSQL and media restore;
- record achieved RPO/RTO;
- test application rollback with schema compatibility review;
- review the incident response and account-offboarding procedure.

## 33. Stop, rollback and incident rules

Stop the launch or an active deployment if:

- a migration fails or may be partially applied;
- health checks fail after the migration boundary;
- R2, email or ClamAV is unavailable;
- a secret appears in logs, Git or chat;
- tenant isolation behaves unexpectedly;
- more than one worker is active;
- PostgreSQL or ClamAV is publicly reachable;
- backup or restore evidence is missing;
- the release manifest or image digest does not match approval.

After a migration starts, do not blindly restart the old application. Determine
schema compatibility and choose an approved forward fix, compatible application
rollback or coordinated database/media restore.

For a suspected credential disclosure:

1. restrict public access;
2. preserve relevant logs;
3. revoke and replace the affected credential;
4. update protected server files or GitHub Environment secrets;
5. create a new immutable release manifest when required;
6. redeploy through the protected workflow;
7. document scope, timing and affected systems.

## 34. Files used by this deployment

| Repository file | Purpose |
| --- | --- |
| `deploy/compose.prod.yml` | CMS, worker, migration tool and Caddy edge |
| `deploy/compose.self-hosted-db.yml` | Private PostgreSQL and ClamAV |
| `deploy/Caddyfile` | HTTPS, security headers and proxy to `cms:3000` |
| `deploy/release.env.example` | Production release-manifest template |
| `deploy/secrets/cms.env.example` | Runtime secret template |
| `deploy/secrets/migration.env.example` | Migrator secret template |
| `deploy/secrets/postgres.env.example` | PostgreSQL role/password template |
| `deploy/scripts/deploy.sh` | Backup, migrate, rollout and smoke sequence |
| `deploy/scripts/backup.sh` | Quiesced PostgreSQL dump plus recovery metadata |
| `deploy/scripts/smoke.sh` | Read-only HTTPS health and login checks |
| `deploy/scripts/rollback.sh` | Previous compatible application release rollback |
| `.github/workflows/ci.yml` | Required code and security gates |
| `.github/workflows/images.yml` | Builds/scans/signs immutable images |
| `.github/workflows/deploy.yml` | Verifies and deploys an approved manifest |
| `apps/cms/scripts/production-preflight.mjs` | Rejects invalid production configuration |
| `apps/cms/src/scripts/verify-production-integrations.ts` | R2, ClamAV and Resend verification |

## 35. Final production status definition

The deployment is complete only when all of the following are true:

```text
CI-approved code
  + signed digest-pinned images
  + protected production secrets
  + healthy CMS/worker/PostgreSQL/ClamAV/Caddy
  + valid HTTPS
  + private recoverable media
  + verified real email
  + verified administrator identity protection
  + delivered monitoring alerts
  + successful database/media restore
  + recorded production approval
= production ready
```

A working `/admin/login` page by itself is not production readiness.

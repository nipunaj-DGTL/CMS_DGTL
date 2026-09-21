# Terraform infrastructure

This directory provisions the CMS-only staging or production foundation. It
creates DigitalOcean compute/database resources and Cloudflare DNS/R2
resources. It does not deploy application containers and it never runs
`terraform apply` automatically.

The Droplet is bootstrapped with a dedicated non-root deployment account,
key-only SSH, Docker Compose, unattended security updates and the protected
`/opt/dgtl` directory layout. Terraform also configures CPU, memory and disk
alerts plus multi-region HTTPS availability, latency and certificate-expiry
alerts. The alert address must already be verified on the DigitalOcean account.

Before applying, create narrowly scoped DigitalOcean and Cloudflare API tokens,
choose a region, and configure encrypted remote Terraform state. Never commit
tokens or a `.tfvars` file.

From this directory:

```text
terraform init
terraform fmt -check
terraform validate
terraform plan -var-file=staging.tfvars
terraform apply -var-file=staging.tfvars
```

For production, copy `production.tfvars.example` to a secret, untracked
`production.tfvars` file and use that filename for the plan and apply commands.
The prepared single-server production layout uses an 8 GB Basic Droplet, daily
Droplet backups, and a 1 GB managed PostgreSQL cluster. At the prices checked on
2026-09-21, those three items total approximately USD 77.55 per month before
R2/Resend usage, taxes, and other optional services. Always confirm the plan and
current provider price before applying.

Review the plan and provider costs before applying. GitHub Actions remains
responsible for building and deploying signed CMS images after infrastructure
exists. Use `DEPLOYMENT_SCOPE=cms-only`; the existing Vercel website remains a
separate deployment and is connected to the CMS after secured staging passes.

Cloudflare R2 is private by default and compatible with the CMS S3 adapter, but
R2 does not provide S3 bucket versioning. A production approval therefore needs
a separately recorded object-storage checkpoint/backup procedure rather than a
false versioning claim.

After the managed database is created, run
`deploy/scripts/provision-managed-postgres.sh` from a protected operator shell
with the DigitalOcean admin connection URL and two newly generated passwords.
Run it once before migrations and once after migrations. The CMS receives only
the runtime URL; the one-shot migration container receives only the migrator
URL; neither receives the administrative URL.

# Run the CMS in Docker Desktop (local testing)

This runs only the CMS, PostgreSQL and delivery worker. It uses a **new, separate
database** and does not import or delete your existing CMS data. Demo websites and
demo clients are not automatically installed.

## Start

1. Open Docker Desktop and wait for its Linux engine to be running.
2. Open PowerShell in the project folder:

   ```powershell
   cd C:\Users\Nipuna\Documents\ChatGPT\cms_test_project
   node scripts/docker-local.mjs up
   ```

3. Wait for the image build, database migrations and health checks. First startup
   can be slow because Next.js compiles admin pages when you first visit them.
4. Open <http://localhost:3000/admin/login>.
5. Show the generated local super-admin credentials:

   ```powershell
   node scripts/docker-local.mjs credentials
   ```

Use `localhost` consistently; `127.0.0.1` has a different browser cookie scope.
If port 3000 is already occupied, stop the other application first. Do not change
only the port mapping without also updating `CMS_PUBLIC_URL`.

## Daily commands

```powershell
# Start existing containers without rebuilding
node scripts/docker-local.mjs start

# Show containers (migrate/bootstrap should be Exited (0), not continuously running)
node scripts/docker-local.mjs status

# Recent logs
node scripts/docker-local.mjs logs

# Stop the application; keep all database and upload data
node scripts/docker-local.mjs stop

# After source code changes, rebuild and start
node scripts/docker-local.mjs up
```

The Compose project is `dgtl-cms-local` in Docker Desktop. PostgreSQL has no
published host port; the CMS is bound only to your computer's loopback interface.
Named volumes hold PostgreSQL data, uploaded media and Next.js compilation cache.
Do not delete volumes or use `docker compose down -v` unless you intend to erase
this local environment's data.

## Accounts and data

The first run creates `admin@docker.dgtl.test` as an active company super admin.
It never resets existing accounts on subsequent starts. The password is randomly
generated, not a shared default. `.local/docker/.env` is ignored by Git; keep it
private and keep it with this database. Deleting it does **not** reset the database
password stored in an existing volume. If you change the administrator password
inside the CMS, the `credentials` command still shows the initial password.

The empty dashboard is expected. Create tenants, websites and client-admin
accounts to test onboarding. Existing demo content on your other local CMS is
untouched. Client frontends still need their own API integration and a configured
website read token; this setup does not automatically connect hosted sites.

## What this proves—and does not prove

This intentionally runs the Dockerfile's **development** target (`next dev`) to
test the application locally without buying/configuring cloud services. It uses
committed database migrations (`PAYLOAD_DB_PUSH=false`) and persistent local
uploads. Production image targets and production deployment settings are unchanged.

- Email is development-only; real email delivery and verification are not enabled.
- Media scanning uses the development `basic` mode, not a real antivirus service.
- Local uploads are not S3/R2; off-computer backups are not configured here.
- It is not a production image test, staging deployment or production approval.
- Do not expose this development environment publicly or use real customer data.

The initial local restart required Docker to force-stop the worker and development
CMS (exit 137). Subsequent production hardening fixed the worker's lifecycle and
verified active/standby/one-shot shutdown in separate production-worker containers.
Rebuild with `up` to include source changes in this local development image;
`start` alone does not update an existing image. Development Next.js shutdown is
not production certification. Keep this environment local and use test data only.

For a production image test, use the production Compose/runbook with real test
S3/R2, ClamAV and email configuration instead of relaxing production safeguards.

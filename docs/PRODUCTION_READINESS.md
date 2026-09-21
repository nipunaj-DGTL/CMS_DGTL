# CMS production hardening and release handoff

Date: 11 September 2026

**Decision: not approved for public production yet.** This work prepares a
release candidate; it does not provision a server or prove every user journey.
Use synthetic data in an isolated staging environment first. No cloud resources,
DNS records, customer websites or live databases were changed in this task.

## Scope implemented

1. **Worker lifecycle:** stop between deliveries; keep signal handlers installed
   through cleanup; handle advisory-lock connection errors; use a 25-second
   drain deadline with a nonzero exit on timeout; explicitly exit only after
   awaited delivery/health/Payload cleanup. Payload 3.88's adapter destroy method
   leaves its pool/monitor connection open. The worker image now invokes Node
   directly with the tsx import hook instead of a launcher process.
2. **Database startup protection:** reject `PAYLOAD_DROP_DATABASE=true` in
   production before constructing the database configuration. Production schema
   push remains disabled. This does not prevent an authorized operator from
   issuing destructive SQL; database privileges and backups still matter.
3. **Production configuration preflight:** new read-only checks for production
   mode, public HTTPS origin/release-origin agreement, explicit allowed origins,
   non-placeholder signing secrets, distinct website tokens, matching token-map
   keys, database URL, runtime account name, storage, scanner and email settings.
   Errors identify fields, never their secret values. Deployment runs both
   runtime and migration configuration checks after image pulls but **before**
   stopping the incumbent release. This is not a provider-connectivity test or a
   proof of database role privileges, DNS ownership, secret entropy or TLS setup.
4. **CMS-only defaults:** runtime/migration secret examples start with empty
   website token maps and no demo origins. Real clients are onboarded separately.
   R2 backup guidance no longer implies that S3 bucket versioning is available.
5. **Regression gates:** CI now requires worker exit 0, and the pinned Next.js
   web server's expected SIGTERM exit 143 **plus its cleanup-finished diagnostic**,
   restart health, and a separate temporary-database worker lifecycle suite.
   Exit 143 alone is not proof of a graceful stop. Exit 137 or a worker drain
   deadline failure is not accepted as a clean shutdown.

No dependency warning, scan, signature check, migration check or backup gate was
disabled. No temporary security-exception expiry was extended.

## Verification in this task

| Check | Result and evidence |
| --- | --- |
| CMS TypeScript | Passed after the worker changes and database guard. |
| CMS lint | Passed, including the final rerun after the database guard. |
| Workspace unit/contract tests | 152 passed: CMS 107, content contracts 6, CMS client 5, Client 01 14, DGTL360 20. Consumer tests do not imply deploying those websites. |
| Release/configuration regression tests | 29 passed (20 preflight plus 9 existing release-scope tests). |
| Production worker image | Built as `dgtl-cms-qa:worker-hardening`; immutable evidence follows below. |
| Production worker runtime | Seven checks passed, then passed again on the final image: committed migrations, production schema probe, active health, standby SIGTERM, active SIGTERM, one-shot exit, restart/lock reacquisition/clean exit. |
| Schema probe | Queried 15 collections and 2 versioned collections using production configuration and committed migrations. |
| In-flight publishing | Existing unit test covers stopping between deliveries. A real in-flight publish to an independently hosted frontend still needs staging evidence. |
| Production web build/runtime | Standalone production image built successfully. See final verification update below for runtime results. |
| Browser UI | Incomplete: both agent-browser attempts failed at the browser transport boundary (Windows error 10060). No new visual/authenticated-dashboard pass is claimed. The isolated automation session was closed. |
| Live security audit | Two moderate advisories, zero high/critical in the returned production dependency audit. This is not a full application penetration test. |

Worker evidence: `.qa/worker-lifecycle-eugJAe/result.json`, `worker.log`,
`standby.log`, `migrate.log` and `probe.log` (ignored local QA artifacts).
That first worker build preceded the separate database-drop guard addition. All
three production targets were subsequently built from the final runtime source;
their identities are recorded in the final update below. They remain local QA
images, not signed or published production releases. Rebuild from the reviewed
final commit and require the updated CI gates.

The temporary QA containers, RAM-backed PostgreSQL database, network and generated
credentials were removed. The database was disposable test data, not customer
data. The existing `dgtl-cms-local` data volumes were not removed or migrated.

## Security risks still requiring approval/remediation

| Advisory | Current finding | Required action |
| --- | --- | --- |
| `GHSA-jg8r-5jh2-v2xj` | Payload 3.88.0 account-unlock access advisory. This project restricts unlock to company super admins. The audit reports a fix in >=3.88.1, but an exact 3.88.1 lookup returned no matching version from the configured registry during this task. | Security owner reviews the mitigation. Obtain an available, verified upstream fix and test all aligned Payload packages together. Do not invent an upgrade version or treat the mitigation as vulnerability removal. |
| `GHSA-67mh-4wv8-2f99` | esbuild 0.18.20 in the Payload/Drizzle development-tooling dependency path. | Keep development servers private; review a compatible upstream dependency update and image exposure. |

The existing narrowly scoped exceptions expire on **1 October 2026**. Their
continued validity is a release-owner decision, not automatic approval. Require
a fresh advisory and image scan for the exact release candidate.

## Remaining production gates and owners

| Gate | Owner | Evidence required |
| --- | --- | --- |
| Release freeze | Development lead | Review only intended changes, preserve unrelated `infra/`, commit/merge the candidate, all updated CI jobs pass on that exact revision, signed immutable images. Current work is not committed or pushed. |
| Host and HTTPS | DevSecOps | Dedicated staging host, protected deployment identity, independently verified SSH host key, CMS hostname, HTTPS and restricted first-user setup. |
| PostgreSQL | DevSecOps + QA | Least-privileged runtime role, separate migrator, private access/verified TLS where required, successful migration and real backup/restore rehearsal. A username check alone does not prove grants. |
| Media and antivirus | DevSecOps + QA | Private S3/R2 credentials, real upload/download/replacement, scanner success/failure behavior, recovery of overwritten/deleted objects. |
| Email and accounts | QA | Real verified sender, invitation/verification/password-reset delivery, login/logout/session expiry, suspension and anonymous signup controls. |
| Client isolation and publishing | QA | Super admin creates tenant/site/account; client admin accesses only its site; draft stays private; preview works; publication refreshes a separately hosted test frontend; media/navigation/social links/SEO render correctly. |
| Resilience | QA + Operations | In-flight publish shutdown, dependency outage/retry, concurrent edits, load against agreed targets, web and worker restart, upgrade/rollback, database and media restore. |
| Operations | DevSecOps | Firewall, origin protection, monitoring, delivered alerts, disk/resource limits, recovery objectives, incident ownership and restore runbook. |
| Sign-off | Security + product owner | Remaining risks explicitly accepted or resolved, staging UAT evidence, approved production release manifest. |

## How the team proceeds

1. Review this change set. Do not deploy the local `development` target publicly.
2. Use Node 22.22.0 and pnpm 11.21.0 (the project pins), then run:

   ```text
   corepack pnpm -r test
   corepack pnpm --filter @dgtl/cms typecheck
   corepack pnpm --filter @dgtl/cms lint
   node --test .github/scripts/production-preflight.test.mjs .github/scripts/release-scope.test.mjs
   docker build -f apps/cms/Dockerfile --target worker -t dgtl-cms-qa:worker-hardening .
   node scripts/test-worker-lifecycle.mjs dgtl-cms-qa:worker-hardening
   ```

   The lifecycle script creates and cleans up only its own labelled QA resources.
   It uses configuration-import placeholders: **real email, S3 and ClamAV are not
   contacted or certified by this test.**
3. Follow [CMS_ONLY_STAGING_RUNBOOK.md](CMS_ONLY_STAGING_RUNBOOK.md), using separate
   staging secrets, database, bucket and hostname. The preflight runs automatically
   in the protected deployment script and deliberately rejects the examples until
   real values replace their placeholders.
4. Execute the remaining acceptance matrix above, record evidence and obtain
   production approval. A passing local build or configuration preflight cannot
   replace these gates.

## Final verification update

- **All three production Docker targets built successfully**, as non-root
  `nextjs`. These are local QA images, not the running development stack or a
  published release:

  | Image | Docker image ID |
  | --- | --- |
  | `dgtl-cms-qa:web-hardening` | `sha256:50cf41f2a83254b16dc7891fb4dcf7448befe49c8f53d6918c2c28f2e6139da8` |
  | `dgtl-cms-qa:worker-hardening` | `sha256:4acfaa460f6870d0490bad84a5acf7b5aec02e8cf179ab0171cea6df67394f6a` |
  | `dgtl-cms-qa:migrate-hardening` | `sha256:2b80a11bc86be20adbd3a352642811e8e75b7feb8b8c3810737117cc81e3c605` |

- **Ten production-container checks passed** in
  `.qa/worker-lifecycle-NgrUFj/result.json`: the seven worker/schema checks plus
  standalone web health/admin-entry availability, verified web shutdown, and
  web restart followed by a second verified shutdown. HTTP probes follow
  redirects; admin-entry HTTP 200 does not prove an authenticated dashboard,
  functioning email verification or a full browser user journey.
- The lifecycle runner invokes the migration command from the worker's tooling
  image, which contains Payload's config and migration CLI. The separate migrator
  target built successfully; the existing CI migration step exercises that target.
- The first combined web test correctly rejected its original *test expectation*
  of web exit 0. The installed Next.js 16.3.4 source
  (`node_modules/next/dist/server/lib/start-server.js`, cleanup handler) explicitly
  exits **143 after awaited SIGTERM cleanup**, rather than 0. The revised gate
  requires that code AND a newly emitted cleanup-finished diagnostic for each
  shutdown. Worker exit remains 0. The original failed evidence remains at
  `.qa/worker-lifecycle-Hgx5O5/result.json`; it was not overwritten. The final
  passing run proves startup/idle drain/restart, not long-running request drain.
- The packaged production preflight was executed in a network-disabled container
  with missing settings; it failed with exit 1 and field-only error messages as
  intended. The unit fixtures also prove valid configuration can pass. No live
  production secret file has been supplied or certified.
- Final CMS lint, JavaScript syntax checks, CI/Compose YAML parsing, immutable-pin
  checks and `git diff --check` passed. The deployment shell passed syntax checking;
  a real remote deployment and full Linux release-shell test suite were not run
  in this task. The dependency-policy command passed with the two documented
  exceptions still present. No fresh image vulnerability scan, SBOM/signature
  publication or remote GitHub CI run was performed for these uncommitted changes.
- Browser verification remains incomplete after two transport failures, not a
  confirmed application UI failure. Next.js/self-hosting and verification guidance
  informed the standalone-runtime checks, signal-code investigation and the
  separation of container evidence from unverified end-to-end user flows.
- The final disposable QA database, containers, network and credentials were
  removed; retained logs are redacted. Test database contents are not retained
  but can be recreated by the script. Production QA images remain in Docker for
  inspection/retesting. Existing local CMS data volumes were preserved; its
  development image was not replaced by these QA builds.

**Handoff:** local code hardening and the tests above are complete. Public
production approval is still blocked by the remaining gates. The owner must
provide a staging host and intended CMS hostname, configure credentials through
secure deployment settings, and approve the reviewed release and staging evidence.

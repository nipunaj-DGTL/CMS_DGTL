# DGTL CMS SSO — implementation and verification

Date: 2026-09-28. Scope: local working trees, not a deployed or merged release.

## Outcome

The CMS integration and dashboard changes are implemented locally. Automated
protocol, permission, database and build checks pass. Real Supabase/dashboard
browser acceptance is NOT completed; live registration and account mappings are
still required. SSO remains disabled in the existing local CMS containers.

Read `DGTL_CMS_SSO_SETUP.md` for activation, role boundaries and rollback.

## Results

| Check | Result | Evidence / scope |
| --- | --- | --- |
| CMS unit suite | PASS | 153 tests, 24 files; Node 22.22.0 |
| CMS TypeScript | PASS | `tsc --noEmit` |
| CMS lint | PASS | Full application `eslint .` |
| CMS production build | PASS | Next 16.3.4; includes `/sso` and `/sso/callback`; Node 22.22.0 |
| Empty-database migrations | PASS | All seven migrations applied; production mode, DB push false |
| Migrated-schema probe | PASS | 16 collections, 2 versioned collections |
| Database-backed SSO checks | PASS | 13 checks against isolated PostgreSQL 16; repeated on Node 22.22.0 |
| Dashboard tests | PASS | 12 tests, including four new CMS integration cases |
| Dashboard TypeScript | PASS | `tsc --noEmit` |
| Dashboard targeted lint | PASS | Consent route, admin page, OAuth policy and service catalog |
| Dashboard production build | PASS | Next 16.3.5; Node 22.22.0; no live provider configuration |
| Dashboard patch consistency | PASS | `git apply --reverse --check` against modified checkout |
| CMS source secret scan | PASS | Gitleaks, redacted output, no findings in `apps/cms/src` |
| Dashboard patch secret scan | PASS | Gitleaks, redacted output, no findings |
| Diff whitespace check | PASS | `git diff --check` |
| Existing local database preservation | PASS | Read-only check: existing database has no `cms_sso_sessions` table |
| Real Supabase login in browser | NOT RUN | Requires separate CMS OAuth registration and real configuration |
| Real account switching, cookie/proxy behavior and SEO regression in browser | NOT RUN | Must be demonstrated against the configured dashboard and CMS |
| Full multi-service global logout | NOT IMPLEMENTED | Explicit limitation, not claimed as complete |
| GitHub CI / merged exact-commit release | NOT RUN | No commit, push, PR or deployment performed |

The source scan is not a complete repository/history security audit. Existing
ignored local secret files were not printed, changed or included in the patch.

## New protocol/security tests

- SSO disabled by default; fixed callback derived from trusted CMS origin.
- Reject HTTP production URLs, URL credentials, unexpected origin paths and weak
  encryption-key configuration.
- Migration mode allows unlinked native users; strict mode limits recovery to an
  explicitly selected unlinked company super-admin.
- Randomized authenticated encryption rejects tampering, wrong keys and wrong purpose.
- Central identity ID, active status and explicit `cms` entitlement must all match.
- Central checks are uncached, refuse token-bearing redirects and fail closed offline.
- Same-origin enforcement rejects sibling-domain/unknown-origin mutation requests.
- Actual `openid-client` exchanges against a controlled provider verify PKCE,
  state, nonce, issuer, audience, token expiry and the cryptographic signature.
- Reused authorization codes, wrong state and forged ID tokens are rejected.
- Opaque cookies are hashed in storage; central tokens are encrypted.
- Expired, unlinked, suspended, revoked and offline sessions fail authentication.
- SSO users retain local tenant restrictions; no email-based auto-provisioning.
- Clients cannot assign mappings; incomplete mappings fail and identity keys are
  derived server-side.

## Database-backed outputs — all PASS

1. Legacy login remains available before account linking.
2. Super-admin links an existing CMS account.
3. Database rejects duplicate central identity bindings.
4. SSO authenticates without promoting a central admin to CMS super-admin.
5. PostgreSQL tenant reads exclude another company.
6. Client cannot relink the central identity.
7. Session records are not accessible through collection permissions.
8. Linked account cannot bypass SSO with native password login.
9. Stale native JWT cannot read tenant data.
10. Removing central CMS entitlement invalidates the next request.
11. Local tenant suspension invalidates SSO access.
12. Refresh preserves central expiry without creating a bypass JWT.
13. CMS logout invalidates the stored session.

Payload silently discards a client update to protected mapping fields; verification
checks the stored mapping remains unchanged instead of requiring an HTTP exception.
Denied collection reads return Forbidden, rather than an empty collection result.
Those framework behaviors were accounted for in the assertions.

## Repositories and isolation

- CMS: current uncommitted workspace, preserving pre-existing branding/media work.
- Dashboard base: `f72f27351258984b7fde956c8aff6521812b2e54`, `dev-sandalu`.
- Backend reviewed base: `57a2fdf854d3ff816aef411ee33029ab1b888f53`, `dev-sandalu`.
- Dashboard patch: `docs/integrations/dgtl-service-cms-sso.patch`.
- Test database: `dgtl_cms_sso_verification`, isolated container
  `dgtl-cms-sso-verification-20260928`, bound only to `127.0.0.1:55439`.
- The isolated container was stopped after verification. Its test fixtures are
  retained; restart that named container before rerunning the database checks.
- The existing `dgtl_cms_docker_local` database was not migrated, reset or seeded.
- Starting Docker Desktop also restarted the existing local CMS stack through its
  normal restart policy. It still uses its previous image and configuration.

## Reproducing the checks

Use Node 22.22.0 and the lockfile's pnpm 11.21.0. From `apps/cms`:

```text
node node_modules/vitest/vitest.mjs run --config vitest.config.mts
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js .
node scripts/sso-verification-env.mjs migrate
node scripts/sso-verification-env.mjs schema
node scripts/sso-verification-env.mjs test
node scripts/sso-verification-env.mjs build
```

The verification helper deliberately hard-codes only disposable test configuration.
The `test` command refuses another database host, port or name. It creates fixtures
in that database; reruns use unique names. It never loads real Supabase credentials.
The test database must already exist and be running on the documented loopback port.

The initial concurrent build was interrupted after compilation when the laptop
became slow. The final bounded-memory build ran successfully using Node 22.22.0.
The PostgreSQL adapter emitted a `pg` query-concurrency deprecation warning during
integration setup; tests passed. Do not treat these results as validation for a
future pg major upgrade without rerunning the suite.

## Before public activation

Create the separate confidential CMS OAuth client, verify asymmetric signing,
configure the dashboard allowlist and CMS secret environment, assign the central
CMS service, and explicitly link the approved CMS users. Then execute every live
acceptance case in the setup guide. Do not enable strict mode or claim production
SSO readiness before that evidence and a tested recovery account exist.

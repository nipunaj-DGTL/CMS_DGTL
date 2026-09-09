# DGTL CMS Platform — Production Readiness QA Execution Report

> **Historical baseline / superseded:** this report records the defects found
> before the production-hardening implementation. Do not use its original
> NO-GO defect list as the current code status. The remediation and retest
> outcome is recorded in `Production_Readiness_Report_2026-09-08.md`.

| Field | Value |
|---|---|
| Report version | 1.0 |
| Test date | 2026-09-08 (Asia/Colombo) |
| Master plan | `Final_Testing_doc.md` |
| System | Payload CMS, revalidation worker, Client 01 generic Next.js frontend, DGTL360 Client 02 Next.js frontend, PostgreSQL |
| Test level | Local release-candidate certification with isolated databases |
| QA decision | **NO-GO / REJECTED** |
| Production grade | **No** |

## 1. Executive decision

The platform must not be released to production in its present state.

There is strong positive evidence that the core concept works: both roles can authenticate, normal tenant filtering works in many paths, exact website-key/token isolation works, signed previews work, CMS media streams correctly in the current working tree, the worker can deliver a publish invalidation, both supplied frontends render CMS data, and all executable automated tests passed when invoked through a compatible harness.

However, production approval is blocked by multiple independent Critical/High findings:

1. A clean database created only from committed migrations is incomplete and cannot run current Pages, Posts, CMS Users or Site Settings queries.
2. Moving a published page back to Draft does not enqueue cache invalidation. The CMS API hides the draft, but the public frontend continues serving the formerly published content.
3. The CMS repository has no Git `HEAD` and zero tracked files. There is no immutable or reproducible release candidate.
4. The working public-media Route Handler is excluded by the repository's unanchored `media/` ignore rule.
5. Client Admin authorization permits access or mutations that conflict with the stated two-role policy, including private tenant notes, self-suspension and access after tenant suspension.
6. Database plus media backup/restore and point-in-time recovery have not been demonstrated; the current backups do not cover the newer media set.
7. The production dependency audit reports one High vulnerability.
8. The CMS editor fails the agreed accessibility gate with Critical and Serious violations.

No waiver is recommended for findings 1–6. The release decision remains **NO-GO** even if all other tests pass.

## 2. Evidence policy and scope

`Final_Testing_doc.md` was used as the test source of truth. Statements in the document were treated as hypotheses to verify, not as proof that a feature works.

This cycle covered:

- CMS startup, health and canonical-origin behavior.
- Super Admin and Client Admin authentication, logout and role visibility.
- Tenant and website isolation at UI, REST API, database and public API layers.
- Page Draft → Preview → Publish → Unpublish lifecycle.
- Revalidation signing, timestamp limits, target validation and replay handling.
- Client 01 route rendering, responsive smoke testing and accessibility scans.
- DGTL360 Home and all eight service routes, responsive/reduced-motion smoke testing and accessibility scans.
- Public media authorization, byte delivery and HTTP range behavior.
- Unit, contract, integration, browser E2E, lint, typecheck and production builds.
- Migration-only database creation with schema push disabled.
- Database integrity, backup inventory, dependency audit, security headers and secret exposure checks.

The following were not certified because a production-like or specifically approved environment was unavailable, or because earlier P0 failures had already stopped release approval:

- Sustained load, spike, stress and soak testing.
- Real HTTPS cookie, TLS, WAF, CDN and rate-limit behavior.
- MFA, external identity provider and production email delivery.
- Managed secret rotation.
- Multi-instance worker concurrency and durable replay behavior.
- Full backup restore with media plus point-in-time recovery.
- Production monitoring, paging and incident-response rehearsal.
- Full cross-browser and assistive-technology matrix.
- Destructive malware/polyglot upload testing.

These items are **BLOCKED / NOT CERTIFIED**, not implicitly passed.

### 2.1 Master-plan corrections made from evidence

The execution cycle corrected the media expectation in `TC-MED-013`, `TC-C01-018`, `TC-D360-020` and `GAP-001`: the public media handler is present and works locally, but Git ignores its source path. `GAP-029` was added for the reproduced published-to-Draft cache exposure. These are documentation-only changes; no application code was modified.

## 3. Test environment and release identity

| Item | Evidence |
|---|---|
| Host | Windows 10.0.19045 |
| Node.js | v24.19.0 |
| pnpm | 11.19.0 |
| Git | 2.55.0.windows.3 |
| PostgreSQL | 18.6, workspace-local isolated cluster |
| PostgreSQL data directory | `.qa/pgdata` |
| Runtime database | `dgtl_cms` on `127.0.0.1:55432`, restored from a local backup and used only for this QA cycle |
| Integration database | `dgtl_cms_qa_20260908` |
| Migration database | `dgtl_cms_migration_20260908` |
| CMS | `http://localhost:3000` |
| Client 01 | `http://localhost:3101` |
| DGTL360 | `http://localhost:3102` |

### 3.1 Release provenance result

**FAIL — Critical release-process blocker**

- The CMS platform repository has no valid `HEAD`.
- `git ls-files` returns `0`.
- Every project file, including CI, is untracked.
- Therefore there is no commit SHA, reviewable diff, clean-checkout proof or immutable build input.
- DGTL360 has Git commit `7b0799e94549211845a2ba69320b638884924ce1`, but all CMS-integration work is currently modified or untracked. The tested DGTL360 state is not represented by that commit.

The exact tested tree cannot be reconstructed from source control. A production build success from this machine is therefore useful functional evidence, but not release reproducibility evidence.

### 3.2 Test-data baseline

The restored runtime baseline contained four tenants, four websites, six users, twelve published pages and thirteen media records. After the controlled lifecycle test, one clearly named QA page remains as a Draft. Its CMS public endpoint and Client 01 public route both return `404`.

No real production system or installed PostgreSQL database on port 5432 was modified.

## 4. Execution summary

Counts below are reported by suite so unlike checks are not combined into a misleading overall percentage.

| Suite or gate | Result | Evidence |
|---|---:|---|
| Workspace unit/contract/component tests | PASS | 29/29 across 11 files: CMS 21; contracts/client/website 8 |
| Tenant-isolation integration tests | PASS | 13/13 on `dgtl_cms_qa_20260908` |
| Checked-in Playwright canonical-origin tests | PASS | 3/3 in Chromium through Playwright's native loader |
| Total executable automated assertions | PASS | 45/45 |
| Official `test:e2e` wrapper | FAIL | Crashes before tests under Node 24/Windows because forced `tsx/esm` calls `os.userInfo()` and receives `uv_os_get_passwd ... ENOMEM` |
| Frozen offline install | PASS | Exit 0; manifests and lockfiles unchanged |
| Generated Payload types | PASS with harness workaround | Generator output SHA-256 unchanged |
| Workspace lint | PASS | All four in-repository packages |
| Workspace TypeScript | PASS | All four in-repository packages |
| Workspace production build | PASS | Contracts, CMS client, Payload/Next CMS and Client 01 |
| DGTL360 lint | PASS | Exit 0 |
| DGTL360 strict TypeScript | PASS | `tsc --noEmit --incremental false`, exit 0 |
| DGTL360 production build | PASS | Next.js 16.3.4; 16 static pages generated; all eight service paths included |
| Migration-only clean database | **FAIL** | 24 tables and 57 columns absent; runtime collection query fails |
| Four-site credential matrix | PASS | 16/16 combinations; only four exact key/token pairs returned 200 |
| DGTL360 CMS service route matrix | PASS | 8/8 returned 200 with the Client 02 website identity and Service Detail data |
| Revalidation endpoint security matrix | PASS | Missing/expired signature 401; wrong site 403; unsafe target 400; valid 200; replay 409 |
| Page publish lifecycle | PASS until unpublish | Draft private; publish delivered and rendered; unpublish cache invalidation failed |
| Public media delivery | PASS locally / FAIL packaging | Correct media 200/206; invalid range 416; foreign/missing media 404; handler ignored by Git |
| CMS accessibility gate | **FAIL** | Critical and Serious axe findings in editor |
| Production security/operations gate | **BLOCKED/FAIL** | No production HTTPS/WAF/MFA/rate-limit/monitoring proof; local headers incomplete |

## 5. Critical page lifecycle reproduction

This is the most important end-to-end failure because it exposes content that an editor has explicitly moved back to Draft.

### Test record

- Tenant: Client 01
- Website: `client-01-main`
- Record ID: 13 in the isolated QA runtime database
- Slug: `qa-cache-lifecycle-1788815234`
- Final state: Draft and not publicly accessible after manual cache cleanup

### Steps and observed results

| Step | Action | CMS/public API | Client 01 website | Delivery/audit result | Status |
|---:|---|---|---|---|---:|
| 1 | Client Admin created a valid Draft page | Draft stored | `404` | No public delivery expected | PASS |
| 2 | Requested the normal public CMS endpoint | `404` with safe non-public behavior | `404` | None | PASS |
| 3 | Requested a signed preview URL | 200, five-minute URL, `private, no-store` | Draft rendered with “Draft preview — not public” banner | Preview cookies created | PASS |
| 4 | Exited preview | Preview cookie/state cleared | Draft route returned `404` after exit | None | PASS; SPA banner needs hard reload in browser UI |
| 5 | Published the Draft | Public CMS endpoint became 200 | Route became 200 and showed the QA heading | Delivery 39: `succeeded`, attempt 1, HTTP 200; one publish audit event | PASS |
| 6 | Changed the published record back to Draft | Public CMS endpoint returned `404` | **Route remained 200 and continued showing the old published heading** | Delivery count remained 1; no unpublish event or invalidation delivery created | **FAIL — Critical** |
| 7 | Sent a valid signed manual invalidation for the route | CMS remained 404 | Route changed to 404 | Frontend endpoint returned 200 | Cleanup PASS |

### Root-cause evidence

The Page `afterChange` publication hook returns immediately whenever the resulting status is not `published`. It creates activity and revalidation records for publish/republish, but it does not handle a `published → draft` transition. The frontend correctly caches public pages, so without an invalidation it keeps serving the last published representation.

### Required behavior

Every public-to-non-public transition—unpublish, archive, suspension and any future delete workflow—must enqueue a durable invalidation for the exact site tag and path. The end-to-end acceptance test must prove:

1. The API hides the document.
2. The target frontend stops serving it inside the approved freshness objective.
3. Other tenant sites remain unchanged.
4. An attributable audit event and durable delivery record exist.
5. Retry/recovery works if the frontend is unavailable.

## 6. Confirmed defects and release blockers

### PRD-001 — Clean migrations do not produce the current schema

| Attribute | Value |
|---|---|
| Severity | Critical / P0 |
| Gate | TC-DB-001, TC-DB-003, TC-ENV-008 |
| Result | FAIL |

Reproduction:

1. Create an empty isolated PostgreSQL database.
2. Set `PAYLOAD_DB_PUSH=false` and production mode.
3. Apply all three checked-in migrations.
4. Compare the resulting schema to the current Payload model.
5. Start/query Payload Pages against that database.

Evidence:

- Expected current tables: 116.
- Migration-created tables: 92.
- Missing tables: 24.
- Missing columns in existing tables: 57.
- No unexpected extra tables were found.
- Missing structures include Page/version tables for Service Index, Company Overview, Statement, Team Showcase, Identity Field and Service Detail.
- Missing columns include Hero fields, CMS user verification fields, relation columns and DGTL Site Settings fields.
- `payload.find` on Pages fails with PostgreSQL `SQLSTATE 42703` because `pages__blocks_hero.eyebrow` does not exist.
- CMS Users, Posts and Site Settings queries also fail on missing columns.

Production effect: a fresh environment or disaster-recovery database cannot run the application without undocumented schema push. CI currently enables schema push, which hides this defect.

### PRD-002 — Published content remains public after unpublish

| Attribute | Value |
|---|---|
| Severity | Critical / P0 |
| Gate | TC-PAGE-011, TC-C01-014, TC-E2E-004, TC-SEC-005 |
| Result | FAIL |

Exact evidence is in section 5. This is a content-governance and confidentiality failure, not a cosmetic cache delay.

### PRD-003 — No reproducible source release

| Attribute | Value |
|---|---|
| Severity | Critical release-process blocker |
| Gate | TC-ENV-008, release provenance gate |
| Result | FAIL |

The CMS repository has no commit and no tracked files. The tested DGTL360 CMS integration is also not committed. No production deployment should be approved from an unidentified mutable working directory.

### PRD-004 — Working media handler is ignored by Git

| Attribute | Value |
|---|---|
| Severity | Critical/High |
| Gate | TC-MED-013, TC-C01-018, TC-D360-020 |
| Result | Runtime PASS; packaging FAIL |

The handler at `apps/cms/src/app/api/dgtl/public/v1/sites/[websiteKey]/media/[mediaID]/route.ts` works locally, but `.gitignore` line 13 contains the unanchored rule `media/`. `git check-ignore` confirms that the source Route Handler is excluded. A normal clean checkout/build can therefore lose all CMS image/video delivery.

### PRD-005 — Tenant suspension does not revoke Client Admin CMS access

| Attribute | Value |
|---|---|
| Severity | High / P0 |
| Gate | TC-TEN-008, TC-E2E-007 |
| Result | FAIL |

In the disposable integration database, suspending Client 01 still allowed its active Client Admin to read two Client 01 Pages. Public site binding was blocked, but authoring access remained. Suspension semantics are inconsistent and unsafe.

### PRD-006 — Client Admin can read company-private tenant notes

| Attribute | Value |
|---|---|
| Severity | High / P0 security |
| Gate | TC-SEC-001, TC-SEC-002 |
| Result | FAIL |

A controlled integration probe stored a synthetic private note and confirmed it was visible to the Client Admin. Cleanup reset the note to null.

### PRD-007 — Client Admin can change own account status

| Attribute | Value |
|---|---|
| Severity | High / P0 |
| Gate | TC-USR-012 |
| Result | FAIL |

The API allowed the Client Admin to change its own status to `suspended`. The account UI also exposes the Status dropdown. The controlled record was restored to `active` after the test.

### PRD-008 — Final active Client Admin can be suspended

| Attribute | Value |
|---|---|
| Severity | High / P0 |
| Gate | TC-USR-013 |
| Result | FAIL |

Deletion protection exists, but a Super Admin could suspend the final active Client Admin. The tenant can be left with no usable administrator. The test record was restored.

### PRD-009 — Media trust state is not protected

| Attribute | Value |
|---|---|
| Severity | High / P0 security |
| Gate | TC-MED-012, TC-MED-015 |
| Result | FAIL |

`scanStatus` has no update access guard and defaults to `clean`. The current model does not prove a trusted byte-level scanner set that state. A user-editable trust flag cannot protect public media.

### PRD-010 — Backup and recovery chain is incomplete

| Attribute | Value |
|---|---|
| Severity | Critical production-readiness blocker |
| Gate | TC-DB-007–009, TC-REL-012 |
| Result | FAIL/BLOCKED |

Two PostgreSQL dumps are structurally readable, but no coordinated media archive was found. The media store contains 43 files totaling 106,278,093 bytes, and newer media exists than the newest database dump. There is no successful isolated database-plus-media restore, file-hash comparison, RPO/RTO measurement or PITR evidence.

### PRD-011 — Production dependency audit fails

| Attribute | Value |
|---|---|
| Severity | High |
| Gate | TC-SEC-016 |
| Result | FAIL |

`pnpm audit --prod --audit-level high` reported seven findings: one High, four Moderate and two Low. The High advisory affects the installed `sharp <0.35.0`/libvips chain. The application currently declares `sharp 0.34.2`.

### PRD-012 — CMS editor accessibility gate fails

| Attribute | Value |
|---|---|
| Severity | High / release-blocking accessibility defect |
| Gate | TC-A11Y-001–003, TC-A11Y-006 |
| Result | FAIL |

The Page editor axe scan reported eight violation rule types, including:

- 16 Critical unnamed buttons.
- 5 Critical unlabelled form elements.
- 8 Serious unnamed ARIA command controls.
- 6 Serious focusable elements inside `aria-hidden` content.
- 6 Serious insufficient-contrast nodes.
- Invalid list structure, heading order and missing landmark regions.
- Two Critical invalid `aria-labelledby` references.
- 29 contrast checks that remained unresolved and require manual review.

The login page also had three Moderate landmark/heading violations. This fails the master plan's zero Critical/Serious gate.

## 7. High-priority implementation and operations findings

### 7.1 Runtime and CI reliability

- Standard worker startup, generated-type command and official E2E wrapper fail on this Node 24/Windows host at `tsx` → `os.userInfo()` with `uv_os_get_passwd ... ENOMEM`.
- A QA-only process preload allowed the worker/type generator to run. That workaround did not change application source.
- CI uses Node 22, while the local environment used Node 24, and the repository has no exact `.nvmrc`/`.node-version` pin.
- CI uses `PAYLOAD_DB_PUSH=true`, masking migration drift.
- CI omits lint, checked-in Playwright E2E, migration-only/schema-diff tests, dependency/SBOM/secret scanning, browser matrix and evidence artifacts.
- The CI file itself is untracked.
- DGTL360 is outside the CMS repository's CI, so contract-breaking changes are not automatically checked against Client 02.
- Payload reports no configured email adapter, so production password reset/invitation delivery is not demonstrated.

### 7.2 Database production controls

- Runtime relational integrity checks passed: zero invalid foreign keys, zero detected cross-tenant relationships and zero duplicate page routes.
- The local application connects as PostgreSQL superuser.
- Local PostgreSQL SSL is disabled and no row-level security policies exist.
- These local facts do not prove the intended production deployment is insecure, but there is no evidence for a least-privilege production role, TLS enforcement or separation of migration/runtime permissions. The production gate is therefore not certified.

### 7.3 Frontend capability boundaries

- Client 01 implements 11 of the 16 Page block types. Service Index, Company Overview, Team Showcase, Identity Field and Service Detail are silently omitted.
- DGTL360 intentionally supports `/` and `/services/[slug]`. A normal CMS page such as `/new-slug` returns 404.
- DGTL360 uses approved local fallback data when CMS reads fail. This can visually hide a broken CMS connection unless health/telemetry makes degraded mode obvious.
- Navigation children are delivered by the CMS contract but ignored by both frontends.
- Posts can be authored but have no public Posts endpoint, public frontend route or signed Post preview.
- Several visible labels remain hardcoded and are not CMS-editable.

These can be valid product boundaries only if Admin choices are constrained and documentation is explicit. Silently accepting unsupported content is not acceptable.

### 7.4 UI, responsive and preview issues

- Client Admin self-account visibly exposes Status, tenant-role removal and Force Unlock controls. Server rules must deny unauthorized changes and the UI should not advertise them.
- Preview credentials are cleared successfully, but clicking Exit Preview leaves the preview banner in the client-side view until hard reload.
- At 320 px, Client 01's primary navigation disappears without an equivalent menu control.
- DGTL360's reduced-motion/mobile rendering contains very large empty black/spacer regions between sections.
- DGTL360 logs a warning that an above-fold CMS image is not loaded eagerly.
- One Super Admin Pages list observation temporarily showed `<No Website>` for a record whose editor and database correctly showed DGTL360; this requires a repeatable relationship/list regression test.

### 7.5 SEO and HTTP security surface

- Both frontends return 404 for `/favicon.ico`, `/robots.txt` and `/sitemap.xml`.
- Canonical metadata is absent.
- DGTL360 duplicates its title suffix. Examples observed:
  - `DGTL 360 — Make the thing. Make it land. Make it work. — DGTL 360`
  - `Production — DGTL 360 — DGTL 360`
- Both local sites correctly render `noindex, nofollow` from current CMS development settings.
- Local CMS, Client 01 and DGTL360 HTML responses did not include CSP, HSTS, `X-Content-Type-Options`, frame protection, Referrer Policy or Permissions Policy. DGTL360 exposes `X-Powered-By: Next.js`.
- Because testing used HTTP development servers, HSTS and final reverse-proxy policy must be verified again in a production-like HTTPS environment.

## 8. Confirmed positive evidence

### 8.1 Authentication and role isolation

- Active Super Admin login succeeded and exposed all four tenants/sites, all six users and twelve baseline published pages.
- Active Client Admin login succeeded and showed only Client 01's tenant, website, page and own user record.
- Wrong credentials returned a generic 401 with no session.
- Suspended user login was rejected in integration testing.
- Both browser roles logged out; protected pages redirected to login.
- Client Admin attempts to create another CMS user returned 403 and created no record.
- Client Admin tenant/website mutation attempts returned 403 and left database values unchanged.
- Direct Client 02 page access from Client 01 returned safe not-found/scoped-list behavior.
- Client Admin could not access Revalidation Deliveries.

### 8.2 Tenant and public API isolation

- The four-site Cartesian key/token matrix passed all 16 combinations.
- The four exact key/token pairs returned 200.
- All twelve cross-site pairs returned identical non-enumerating 404 responses with `no-store`.
- Missing authorization, missing Bearer value, wrong token and path/header mismatch also returned safe 404 responses.
- Invalid Page-list queries returned structured 400 `INVALID_QUERY` responses.
- Missing pages/navigation returned structured 404 responses.
- Every error response inspected included a request ID and `no-store`.
- No CMS read token, preview secret or revalidation secret was present in Client 01 or DGTL360 HTML.

### 8.3 Canonical Admin origin

- Wrong-host GET navigation from `127.0.0.1` returned a 307 redirect to the canonical `localhost` Admin URL.
- Wrong-host POST returned 409 with `CMS_CANONICAL_ORIGIN_REQUIRED` and did not replay a Server Action.
- The three checked-in Chromium tests for this behavior passed.

### 8.4 Signed revalidation endpoint

| Probe | Expected | Actual |
|---|---:|---:|
| Missing signature | 401 | 401 |
| Correct signature with expired timestamp | 401 | 401 |
| Correct signature for wrong website binding | 403 | 403 |
| Correct signature with unsafe `..` path | 400 | 400 |
| Correct signature, valid tag/path and unique delivery ID | 200 | 200 |
| Replay of the same delivery ID | 409 | 409 |

Signature boundary tests also passed: offsets through ±300 seconds were accepted, ±301 seconds were rejected, and tampered/wrong-secret messages failed.

The remaining architectural risk is that frontend replay memory is process-local. Restarting or horizontally scaling the frontend loses this replay set.

### 8.5 Signed draft preview

- Anonymous preview-token creation returned 401 with `AUTH_REQUIRED` and `no-store`.
- Authenticated Client Admin preview-token creation returned 200.
- The token TTL was 300 seconds.
- The frontend enabled Draft Mode, set HTTP-only preview state and rendered the Draft with a visible warning banner.
- The preview CMS response was private/no-store.
- Exiting preview removed preview state; a direct request to the Draft route returned 404.
- Tampered, expired, wrong-secret and wrong-boundary preview tokens were rejected.

### 8.6 Media delivery

- Client 01 media ID 5 returned 200 `image/png`, 22,108,798 bytes, immutable one-year cache and `nosniff`.
- `Range: bytes=0-99` returned 206 with exactly 100 bytes and the correct `Content-Range`.
- DGTL360 media returned 200/206 for valid image/video requests.
- Invalid ranges returned 416.
- A valid media ID requested with another tenant's website credentials returned 404.
- Missing media returned 404 with `no-store`.

Runtime media behavior therefore passes. Source packaging remains blocked by PRD-004.

### 8.7 Client 01 frontend

- `/` returned 200 and rendered CMS-backed Home content.
- The generic catch-all successfully rendered existing published non-Home page content during browser verification.
- Unknown and Draft routes returned branded 404 responses after correct invalidation.
- Desktop browser scan found no page/console errors.
- A page-specific axe scan found no confirmed violation on Home, with one contrast item requiring manual review.
- The 320 px page did not horizontally overflow.
- Warm development observations were approximately TTFB 103 ms, FCP/LCP 180 ms and CLS 0. These are smoke observations, not production performance certification.

### 8.8 DGTL360 frontend

- `/` returned 200 and consumed CMS Home, settings, navigation and service data.
- All eight database-backed service URLs returned 200:
  - Agentic Systems
  - Events & Experiences
  - Business Systems
  - Apps & Product
  - Web Platforms
  - Digital Marketing
  - Brand Strategy
  - Production
- `/services/production` rendered the expected CMS service content and passed its page-specific axe scan with zero confirmed violations.
- Unknown service and `/new-slug` produced the designed 404 behavior.
- Images loaded after progressive scroll; CMS image and video byte requests succeeded.
- No horizontal overflow was observed at 320 px.
- DGTL360 lint, strict TypeScript and production build passed.
- Warm development observations were approximately TTFB 106 ms, FCP 316 ms, LCP 648 ms and CLS approximately 0. These are not production SLO evidence.

## 9. Database integrity and isolation evidence

The disposable integration database completed 13/13 tenant-isolation tests. Additional controlled probes and read-only checks showed:

| Check | Result |
|---|---:|
| Wrong-tenant Pages | 0 |
| Wrong-tenant Posts | 0 |
| Wrong-tenant Media | 0 |
| Wrong-tenant Navigation | 0 |
| Wrong-tenant Site Settings | 0 |
| Wrong-tenant Content Requests | 0 |
| Wrong-tenant Website homepage relationships | 0 |
| Duplicate website/slug page routes | 0 |
| Unvalidated foreign keys | 0 |
| Forged tenant Page create | Rejected |
| Cross-tenant publish | Rejected |
| Cross-tenant media relationship | Rejected |
| Cross-tenant homepage assignment | Rejected |
| Other-tenant version history | Denied/scoped |

Controlled security probes were cleaned up. Client 01 tenant and user statuses were restored to active, private notes were reset to null, the homepage relationship was restored, and no synthetic navigation/settings/request rows remain.

## 10. Requirement-level certification matrix

| Requirement area | Status | Key evidence |
|---|---:|---|
| Environment/startup | PARTIAL | All services healthy; normal worker/E2E/type-generation wrappers fail on current Node 24/Windows |
| Authentication | PARTIAL PASS | Both roles, wrong password, suspended login and logout work; lockout/expiry/production cookies not fully certified |
| Tenant isolation | **FAIL** | Cross-tenant filters pass, but tenant suspension and private notes fail |
| Two-role user model | **FAIL** | Self-only listing/create denial pass; self-status and final-admin suspension fail |
| Website binding | PARTIAL PASS | Exact binding matrix passes; production provisioning remains engineering-driven |
| Pages/drafts/publishing | **FAIL** | Draft/private, preview and publish pass; unpublish remains publicly cached |
| Page blocks | PARTIAL | Contracts/models work; frontend support is deliberately incomplete and silent |
| Posts | NOT PRODUCTION-COMPLETE | Admin model exists; public delivery and preview do not |
| Media | **FAIL packaging/security** | Runtime delivery passes; route ignored by Git and scan trust is unsafe |
| Navigation/settings | PARTIAL | Public DTOs work; nested navigation and several fields are not rendered |
| Content Requests | PARTIAL | Basic state model/tests exist; actor transition policy remains incomplete |
| Audit/revalidation | **FAIL** | Publish event/delivery succeeds; unpublish event/delivery missing; replay not durable across instances |
| Public content API | PASS for tested contract | Binding, non-enumeration, errors, cache policy and request IDs passed |
| Signed preview | PASS with UX defect | Security boundaries pass; exit banner requires reload |
| Client 01 | PARTIAL | Home/catch-all/media work; mobile nav and unsupported blocks remain |
| DGTL360 | PARTIAL | Home/eight services/media work; arbitrary pages, fallback observability, mobile spacing and SEO remain |
| Security | **FAIL/BLOCKED** | Authorization/media/dependency issues plus no production control evidence |
| Performance | BLOCKED | Only warm local smoke timings; no load/soak/SLO certification |
| Accessibility | **FAIL** | CMS editor has Critical/Serious violations |
| Compatibility | PARTIAL | Chromium/Edge-like path only; no complete browser/AT matrix |
| Reliability/recovery | **FAIL/BLOCKED** | Restore cache mismatch and incomplete backup/PITR proof |
| Database/migrations | **FAIL** | Clean migration schema cannot run current app |
| Observability | BLOCKED | Request IDs exist; no production alert/correlation/incident proof |
| Privacy/governance | BLOCKED | No retention/export/erasure/consent certification |
| Release/CI | **FAIL** | No tracked release, incomplete CI and external frontend not covered |

## 11. Browser evidence inventory

Evidence is stored under `qa-evidence/2026-09-08/browser/`.

### CMS and roles

- [CMS login](qa-evidence/2026-09-08/browser/cms-login.png)
- [Client 01 dashboard](qa-evidence/2026-09-08/browser/cms-client01-dashboard.png)
- [Client 01 scoped Pages list](qa-evidence/2026-09-08/browser/cms-client01-pages-list.png)
- [Client 01 cross-tenant page denied](qa-evidence/2026-09-08/browser/cms-client01-cross-tenant-page-denied.png)
- [Client Admin self-account controls](qa-evidence/2026-09-08/browser/cms-client01-account-controls.png)
- [Super Admin Pages list](qa-evidence/2026-09-08/browser/cms-super-pages-list.png)
- [Super Admin DGTL360 record](qa-evidence/2026-09-08/browser/cms-super-branding-page6.png)

### Client 01

- [Client 01 desktop Home](qa-evidence/2026-09-08/browser/client01-home-desktop.png)
- [Client 01 320 px Home](qa-evidence/2026-09-08/browser/client01-home-320px.png)
- [Client 01 non-Home route](qa-evidence/2026-09-08/browser/client01-about-us.png)
- [Signed Draft preview banner](qa-evidence/2026-09-08/browser/client01-signed-preview.png)
- [Preview exited after hard reload](qa-evidence/2026-09-08/browser/client01-preview-exited-after-reload.png)

### DGTL360

- [DGTL360 desktop Home](qa-evidence/2026-09-08/browser/dgtl360-home-desktop.png)
- [DGTL360 reduced-motion 320 px](qa-evidence/2026-09-08/browser/dgtl360-home-320px-reduced-motion.png)
- [DGTL360 320 px after progressive scroll](qa-evidence/2026-09-08/browser/dgtl360-home-320px-after-scroll.png)
- [DGTL360 Production service](qa-evidence/2026-09-08/browser/dgtl360-service-production.png)
- [DGTL360 unknown service 404](qa-evidence/2026-09-08/browser/dgtl360-service-404.png)
- [DGTL360 arbitrary page 404](qa-evidence/2026-09-08/browser/dgtl360-general-page-404.png)

The generated Playwright HTML result is at `apps/cms/playwright-report/index.html`.

## 12. Required remediation order

### Release-stopper work

1. Put the complete CMS platform and tested DGTL360 integration under source control. Create an immutable candidate and prove a clean clone.
2. Fix `.gitignore` so the public media Route Handler is tracked. Verify media from the clean clone/build artifact.
3. Generate and review complete migrations for the current Payload model. Run CI with schema push disabled and compare model/schema.
4. Fix public-to-non-public cache invalidation and audit generation. Add the exact lifecycle test from section 5.
5. Centralize tenant/account authorization:
   - tenant suspension must revoke CMS and public access;
   - Client Admin must not read company-private notes;
   - Client Admin must not mutate protected status/role/lock fields;
   - no operation may remove/suspend the final active Client Admin.
6. Replace user-controlled/default-clean media status with a trusted upload-scanning workflow based on file bytes.
7. Produce coordinated encrypted database plus media backup, restore it in isolation, and demonstrate PITR/RPO/RTO.
8. Upgrade/remediate the High dependency advisory and rerun the production audit.

### High-priority quality work

9. Fix Critical/Serious CMS editor accessibility findings and repeat axe plus keyboard testing.
10. Pin and support a runtime version; make worker, type generation and Playwright work without QA shims.
11. Change CI to enforce lint, unit, integration, E2E, migration-only boot, schema diff, audit/SBOM/secret scans and artifacts. Add DGTL360 consumer-contract coverage.
12. Configure production email, HTTPS security headers, least-privilege DB access, secret storage, rate limiting, WAF, monitoring and alerts.
13. Fix preview-exit state refresh, mobile navigation, DGTL360 mobile spacing and footer contrast.
14. Fix duplicate metadata titles and add approved favicon, robots, sitemap, canonical and Open Graph behavior.
15. Constrain each Website/Admin content model to blocks and routes its frontend truly supports, or implement the missing renderers with visible compatibility diagnostics.

## 13. Retest entry criteria

Do not request final production recertification until all of the following evidence is ready:

- A commit SHA for each repository and a clean checkout.
- A clean install/build on the approved Node version.
- Migration-only database creation with schema push off and zero model/schema drift.
- Passing publish → unpublish/archive → public 404 tests for both Client 01 and DGTL360.
- Passing suspension, private-field, self-status and final-admin invariant tests.
- A tracked public media route plus trusted scanning tests.
- Passing production dependency audit or formally reviewed non-exploitable waivers.
- Coordinated DB/media restore and PITR evidence.
- Zero unwaived Critical/Serious accessibility violations in critical flows.
- Production-like HTTPS security header, cookie, WAF/rate-limit and monitoring evidence.
- Full P0 regression and agreed P1 suite at 100% pass, with no open Critical/High defects.

## 14. Final QA sign-off

| Sign-off field | Decision |
|---|---|
| Functional concept demonstrated | Yes |
| Tenant isolation fully safe | No |
| Draft/publication control safe | No |
| Database deployable from migrations | No |
| Release reproducible | No |
| Backup/recovery proven | No |
| Security gate passed | No |
| Accessibility gate passed | No |
| Production release approved | **NO** |

**Final verdict: NOT PRODUCTION GRADE.**

This result does not mean the project should be discarded. It has a working architectural foundation and several strong controls. It means the current build is a development/QA candidate that requires the release-stopper work above before it can responsibly handle real client production content.

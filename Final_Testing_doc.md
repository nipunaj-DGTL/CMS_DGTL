# DGTL CMS Platform — Final Testing Roadmap and Master Test Plan

| Document field | Value |
|---|---|
| File | `Final_Testing_doc.md` |
| Version | 1.0 |
| Date | 2026-09-08 |
| Status | Master QA baseline — execution results must be recorded separately |
| Product | DGTL multi-tenant Payload CMS and connected Next.js websites |
| Test owner | Senior QA Engineer / QA Lead |
| Audience | QA, developers, DevOps, security, product owner, client acceptance testers |
| Initial topology | One CMS, one PostgreSQL database, four logical client tenants, independent website deployments |

> This is a test strategy, roadmap, and executable test catalogue. It is not evidence that a test passed. Every execution must record environment, build, data, tester, time, evidence, and result.

## Contents

1. Purpose
2. Source-of-truth and requirement policy
3. Scope
4. System under test
5. Quality risks and priorities
6. QA principles and testing concepts
7. Test levels and test pyramid
8. QA roadmap
9. Team responsibilities
10. Test environments
11. Test data management
12. Current effective role matrix
13. Test case standard
14. Entry, suspension, exit and release gates
15. Existing automation and required CI evolution
16. Critical end-to-end journeys
17. Functional test catalogue
18. Non-functional test strategy
19. Exploratory testing charters
20. Regression and change-impact strategy
21. Requirements traceability matrix
22. Defect management
23. Test execution and reporting
24. User acceptance testing
25. Verified known gaps and expected failures
26. New-client certification
27. Release and production verification
28. Evidence pack and deliverables
29. QA team kickoff roadmap
30. Definition of done
31. Reference inventory
32. Glossary

## 1. Purpose

This document defines how the team will verify and validate the complete DGTL CMS platform. It covers the Payload Admin application, PostgreSQL persistence, tenant isolation, user roles, content workflows, public APIs, preview, publishing, cache revalidation, the reusable Client 01 frontend, the custom DGTL360 frontend, deployment, security, accessibility, performance, recovery, and production readiness.

The plan has five objectives:

1. Prove that each client can manage only its own content.
2. Prove that an authorized DGTL Super Admin can safely manage every client.
3. Prove that published CMS content reaches only the correct frontend.
4. Detect data loss, security, migration, media, cache, usability, accessibility, and reliability failures before release.
5. Produce repeatable evidence that supports an informed release decision.

## 2. Source-of-truth and requirement policy

The supplied reference documents describe the desired product but contain historical roles and planned capabilities that do not exactly match the current implementation. QA must not silently convert an old statement into a passing expected result.

Use this precedence when determining expected behaviour:

1. An explicit, current, approved product decision.
2. Current access-control code, collection schemas, API contracts, and frontend implementation.
3. Current automated tests.
4. Current architecture, security, operations, and connection documentation.
5. Historical/reference documents, used as requirements input and gap evidence only.

When the reference and implementation disagree, create a requirement clarification or defect and label the test as `BLOCKED — REQUIREMENT CONFLICT`; do not choose the most convenient outcome.

### 2.1 Verified current product baseline

- Exactly two human profiles exist: `company-super-admin` and `client-admin`.
- Super Admin has company-wide access. Client Admin is restricted to assigned tenant(s).
- Super Admin currently creates and assigns Client Admin accounts. Client Admin user access is self-only.
- A single Payload Admin application serves both roles.
- The CMS uses one shared PostgreSQL database with application-level tenant isolation; it does not use one database per client or PostgreSQL Row-Level Security.
- Tenant-scoped collections are Tenants, Websites, Pages, Posts, Media, Navigation, Site Settings, Content Requests, Activity Events, and Revalidation Deliveries, with CMS Users and Payload internal records.
- Pages and Posts support drafts, autosave, publishing, versions, and a maximum of 50 versions per document.
- Pages support 16 CMS block types. A frontend displays a block only when that frontend implements it.
- The reusable frontend resolves `/` to CMS slug `home` and other paths to matching CMS slugs.
- DGTL360 currently implements `/` and `/services/[slug]`; an arbitrary CMS page does not automatically create a DGTL360 route.
- Creating a Website record does not generate, host, or deploy a frontend.
- Website read tokens and revalidation secrets are server-side environment configuration, not editable content.

### 2.2 Capability classification

Every requirement and test must be classified as one of:

| Classification | Meaning |
|---|---|
| `MUST PASS` | Implemented, approved release behaviour |
| `KNOWN FAIL` | Required or exposed behaviour with a confirmed current defect |
| `NOT IMPLEMENTED` | Planned capability absent from the current release |
| `OUT OF SCOPE` | Deliberately excluded from this release |
| `BLOCKED` | Cannot execute because environment, data, dependency, or requirement is unavailable |

## 3. Scope

### 3.1 In scope

- Repository configuration, dependency integrity, type safety, linting, builds, and migration reproducibility.
- CMS startup, health, canonical hostname behaviour, login, logout, sessions, account locking, and account states.
- Super Admin and Client Admin UI and API permissions.
- Tenant, Website, CMS User, Page, Post, Media, Navigation, Site Settings, Content Request, Activity Event, and Revalidation Delivery behaviour.
- Drafts, versions, preview tokens, publishing, unpublishing where supported, archive behaviour, and restoration.
- All 16 CMS page block schemas and all block types rendered by each frontend.
- Public website API authentication, DTO validation, site binding, publication filters, error responses, and content isolation.
- Client 01 generic frontend routing, content, typography, navigation, metadata, media, preview, and cache refresh.
- DGTL360 homepage and service pages, CMS mapping, media, navigation, settings, metadata, fallbacks, and error handling.
- PostgreSQL schema, constraints, migrations, backups, restoration, connection pooling, transactions, and data integrity.
- Revalidation worker, signature verification, idempotency, retries, failure visibility, and multi-site isolation.
- Security, privacy, accessibility, compatibility, responsive design, performance, resilience, observability, deployment, rollback, and recovery.
- New-client onboarding and credential rotation.

### 3.2 Out of scope unless separately approved

- CRM, booking, commerce, payments, client billing, and unrelated backend services.
- Native mobile applications.
- Arbitrary code execution, custom JavaScript, raw HTML, or plugin installation through CMS fields.
- Physical database isolation per client.
- Multi-region active-active writes.
- Creating a unique frontend design entirely through Payload Admin.
- Destructive penetration testing against production.
- Testing third-party infrastructure not provisioned for the release.

## 4. System under test

```text
Public visitor
    ↓
Independent Next.js website
    ↓ server-only website key + bearer token
DGTL public CMS API
    ↓
Payload access policy and same-tenant validation
    ↓
PostgreSQL + media storage

Administrator → Payload Admin → draft/publish
                                  ↓
                         Revalidation delivery
                                  ↓
                              CMS worker
                                  ↓ signed request
                        Correct Next.js website
```

### 4.1 Components

| Component | Test responsibility |
|---|---|
| Payload CMS web process | Admin UI, authentication, access, generated APIs, public API, preview API |
| PostgreSQL | Durable data, relationships, users, versions, audit and delivery state |
| Media storage | Originals, image variants, video/PDF files, ownership and availability |
| Revalidation worker | Delivery claim, signing, retry, completion, failure visibility |
| `@dgtl/content-contracts` | Runtime DTO schemas and compatibility |
| `@dgtl/cms-client` | Server-only authenticated client and error handling |
| Reusable Client 01 frontend | Generic catch-all routes and block renderer |
| DGTL360 frontend | Custom homepage and service experience |
| Hosting/network/DNS | HTTPS, origin reachability, health, caching, rollback |
| Monitoring/backup services | Detection, alerting, retention, restore evidence |

## 5. Quality risks and priorities

| Risk ID | Risk | Impact | Priority | Required control |
|---|---|---|---|---|
| QR-01 | Cross-tenant data disclosure or mutation | Critical security/privacy incident | P0 | Four-tenant negative matrix at UI, API, relationship, version, media, preview and worker levels |
| QR-02 | Super Admin edits the wrong client | Incorrect production content | P0 | Persistent tenant banner, confirmation, audit record and cross-site verification |
| QR-03 | Public token/key pair accesses another site | Cross-client publication leak | P0 | Wrong-pair, replay, rotation and site-binding tests |
| QR-04 | Draft or archived content becomes public | Confidential content exposure | P0 | API/cache/direct-ID tests |
| QR-05 | Migration cannot recreate the live schema | Failed or corrupt deployment | P0 | Empty-database migration-only build and schema comparison |
| QR-06 | Database backup excludes media | Irrecoverable content loss | P0 | Coordinated PostgreSQL + media restore exercise |
| QR-07 | Publish succeeds but frontend stays stale | Visible business failure | P1 | Delivery, retry, cache-tag/path and under-60-second tests |
| QR-08 | CMS field is stored but not rendered | Misleading editor experience | P1 | Field-to-DTO-to-component traceability |
| QR-09 | Unsupported block silently disappears | Content loss on website | P1 | Renderer exhaustiveness and unknown-block behaviour |
| QR-10 | Local fallback hides CMS outage | Undetected stale/wrong content | P1 | Failure injection, logging and monitoring tests |
| QR-11 | Media route/storage fails | Broken images/video | P1 | API, range request, image optimization and storage tests |
| QR-12 | Account or role escalation | Platform compromise | P0 | Field/API tampering and final effective-access tests |
| QR-13 | Multiple workers claim one delivery | Duplicate work/race | P1 | Concurrency and idempotency test |
| QR-14 | One CMS/database outage affects all clients | Shared availability failure | P1 | Cached-site resilience, fail/recover and monitoring tests |
| QR-15 | Inaccessible editor or public site | Legal/usability failure | P1 | WCAG 2.2 AA-oriented automated and manual tests |

## 6. QA principles and testing concepts

The team will use the following concepts deliberately rather than treating testing as only clicking through happy paths.

| Concept | Application in this project |
|---|---|
| Verification | Confirm code, schemas, migrations, contracts and configuration match approved requirements |
| Validation | Confirm Super Admins, Client Admins and visitors can achieve real goals safely |
| Shift-left | Review access rules, contracts, migrations and tests during development |
| Shift-right | Use production-safe smoke checks, logs, metrics, synthetic monitoring and alert verification |
| Risk-based testing | Execute P0 isolation, authentication, publishing and recovery cases before cosmetic cases |
| Black-box testing | Test UI/API behaviour without relying on implementation knowledge |
| White-box testing | Review branches, hooks, constraints, transaction paths and security controls |
| Grey-box testing | Use known tenant IDs/tokens to attempt realistic authorization bypasses |
| Positive testing | Valid login, valid content, valid publication and valid API consumption |
| Negative testing | Wrong role, tenant, ID, token, signature, state, MIME type, URL and input |
| Equivalence partitioning | Active/invited/suspended users; draft/published/archived content; valid/invalid token families |
| Boundary-value analysis | 0/1/max/max+1 blocks, links, items, children, text length, media size, token age and retries |
| Decision-table testing | Role × tenant × collection × operation; website status × tenant status × credentials |
| State-transition testing | Content Requests, page publication, user status, tenant status and delivery retry states |
| Pairwise/combinatorial testing | Browser × viewport × role × frontend; block × media × page template |
| Use-case testing | End-to-end administrator, client and public visitor journeys |
| Error guessing | Stale cookies, localhost/127 mismatch, duplicate slug, hardcoded text, stopped worker, expired token |
| Exploratory testing | Time-boxed sessions focused on editor usability, cross-client mistakes and visual integration |
| Regression testing | Automated suite plus targeted manual checks for all changed areas |
| Smoke testing | Fast deployment confidence checks for health, login, one API read and one page per site |
| Sanity testing | Narrow verification after a small fix, followed by impacted regression |
| Static testing | Requirements, code, dependency, secret, migration and configuration review without execution |
| Dynamic testing | Execute application and observe actual runtime behaviour |
| Requirements-based testing | Map every approved acceptance criterion to tests and evidence in the RTM |
| Model-based testing | Derive cases from role/tenant decision tables and workflow state diagrams |
| Data-driven testing | Reuse the same assertions across roles, tenants, websites, tokens, blocks and status values |
| Property-based/fuzz testing | Generate bounded slugs, URLs, nested objects and invalid inputs to find parser/validator gaps |
| Mutation testing | Deliberately alter access/signature/transition logic in isolation to prove tests detect it |
| Confirmation/retesting | Reproduce a reported defect on the fixed build and verify its exact correction |
| Impact/maintenance testing | Re-run tests chosen from code, schema, configuration, dependency and consumer changes |
| Visual regression | Review intentional baseline diffs for frontend templates, blocks, breakpoints and states |
| Usability testing | Observe whether inexperienced Super/Client Admins can complete tasks and recover from errors |
| Accessibility testing | Automated rules plus keyboard, screen-reader, zoom, contrast and reduced-motion checks |
| Compatibility testing | Browser/device/runtime/database/contract and rolling-deployment combinations |
| Performance testing | Baseline, load, stress, spike, soak, volume and scalability measurements |
| Security testing | Authentication, authorization, isolation, input, secret, upload, session and supply-chain controls |
| Reliability/recovery testing | Failure injection, retries, idempotency, restart, backup, restore, RPO and RTO |
| Localization/content resilience | Unicode, RTL, long copy, date/time/locale and empty/fallback content behaviour |
| Observability testing | Prove failures generate useful safe logs, metrics, traces, alerts and runbook actions |

## 7. Test levels and test pyramid

### 7.1 Levels

1. **Static verification:** requirements, architecture, code review, lint, types, dependency and secret scans.
2. **Unit tests:** access helpers, normalization, state machines, signatures, mappers, block logic.
3. **Component tests:** React block renderer, navigation, metadata and error components.
4. **Contract tests:** CMS DTO schema, contract version and frontend compatibility.
5. **API tests:** generated Admin APIs, public DTOs, preview and revalidation endpoints.
6. **Integration tests:** Payload with real PostgreSQL, filesystem/object storage, worker and Next.js.
7. **End-to-end tests:** browser journeys across Admin → CMS → database → worker → frontend.
8. **System/non-functional tests:** performance, accessibility, security, resilience, backup and recovery.
9. **UAT:** business representatives complete approved tasks with production-like data.
10. **Production verification:** read-only/safe smoke checks and monitoring validation.

### 7.2 Automation balance

- Keep most branch and validation coverage in fast unit/component/contract tests.
- Cover every trust boundary with real PostgreSQL/API integration tests.
- Reserve browser E2E tests for critical user journeys and rendering integration.
- Run destructive, load and recovery tests only in isolated environments.
- A manual test is not inferior when it covers visual quality, usability, accessibility or disaster recovery that automation cannot judge adequately.

## 8. QA roadmap

| Phase | Focus | Main activities | Exit deliverables |
|---|---|---|---|
| 0 — Baseline | Agree what is being tested | Resolve role/reference conflicts; inventory components, routes, fields and known gaps; assign owners | Approved baseline, risk register and traceability matrix |
| 1 — Test foundation | Reproducible environment and data | Create dedicated QA DB/storage, synthetic four-tenant seed, account matrix, secret sets, cleanup guards | Environment readiness report and reusable fixtures |
| 2 — Shift-left gates | Prevent basic defects | Types, lint, unit, component, contract, dependency, secret and migration-only checks | Green CI foundation and coverage report |
| 3 — Functional/RBAC | Verify all CMS behaviour | Execute authentication, role, tenant, collection, draft/version and workflow catalogues | Functional execution report; all P0/P1 defects triaged |
| 4 — Integration/frontends | Prove complete delivery | API, media, preview, publish, worker, Client 01, DGTL360 and four-site isolation | End-to-end evidence for each frontend |
| 5 — Non-functional | Prove quality attributes | Security, performance, accessibility, compatibility, resilience, observability, backup/restore | Signed non-functional reports and remediation decisions |
| 6 — UAT/release | Business confidence | Client/Super Admin UAT, regression, migration rehearsal, rollback rehearsal, release review | UAT approval and release recommendation |
| 7 — Post-release | Detect escaped defects | Safe smoke, metrics, alerts, publish synthetic, incident review | Production verification and lessons learned |

Suggested execution order within every iteration:

```text
Changed-code review → unit/contract → integration → P0 smoke → impacted regression
→ full regression → non-functional checks → UAT → release decision
```

## 9. Team responsibilities

| Activity | QA Lead | QA Engineers | Developers | DevOps/SRE | Security | Product/Client |
|---|---|---|---|---|---|---|
| Requirement and risk review | A/R | C | C | C | C | A/C |
| Test design and traceability | A | R | C | C | C | C |
| Unit/component tests | C | C | A/R | I | I | I |
| API/integration/E2E automation | A | R | C | C | C | I |
| Environment and observability | C | C | C | A/R | C | I |
| Security assessment | C | C | C | C | A/R | I |
| Performance/recovery testing | A | R | C | R | C | I |
| Defect correction | C | C | A/R | R when operational | C | I |
| UAT | C | Support | C | I | I | A/R |
| Release recommendation | A/R | C | C | C | C | Approves business risk |

`R` = Responsible, `A` = Accountable, `C` = Consulted, `I` = Informed.

## 10. Test environments

| Environment | Purpose | Data | Permitted testing |
|---|---|---|---|
| Developer local | Fast debugging | Synthetic only | Unit, component, targeted manual checks |
| CI ephemeral | Every change | Generated and disposable | Static, unit, contract, integration, build, selected E2E |
| Shared QA | Full functional regression | Stable synthetic four-tenant set | Functional, API, browser, exploratory |
| Staging | Production rehearsal | Sanitized representative data | E2E, security, performance, migration, recovery and UAT |
| Production | Live service | Real client data | Safe smoke, monitoring, approved synthetic/read-only checks only |

### 10.1 Local reference endpoints

| Service | URL |
|---|---|
| CMS Admin | `http://localhost:3000/admin` |
| CMS health | `http://localhost:3000/api/health` |
| Client 01 generic site | `http://localhost:3101` |
| DGTL360 / Client 02 | `http://localhost:3102` |
| Suggested Client 03 | `http://localhost:3103` |
| Suggested Client 04 | `http://localhost:3104` |

Use the exact `localhost` CMS origin during local browser testing. Use separate browser contexts for Super Admin and Client Admin. Never mix `localhost` and `127.0.0.1` cookies as a substitute for independent sessions.

### 10.2 Environment readiness checklist

- [ ] Build/release identifier is recorded.
- [ ] CMS, worker, PostgreSQL and all frontends start successfully.
- [ ] Health endpoints respond and clocks are synchronized.
- [ ] Dedicated database/storage is confirmed; production data is not targeted.
- [ ] Four synthetic tenants and website bindings exist.
- [ ] Each website has a distinct read and revalidation secret.
- [ ] Super Admin, Client Admin, suspended and unassigned test users exist.
- [ ] Email/storage emulators or approved test services are reachable where applicable.
- [ ] Logs, metrics and delivery records are visible.
- [ ] Reset/cleanup procedure has been proven.
- [ ] Browser versions and mobile devices/emulators are recorded.

## 11. Test data management

### 11.1 Minimum identity matrix

| Test actor | Required state |
|---|---|
| QA Super Admin | Active company account with `company-super-admin` |
| Client 01 Admin | Active, assigned only to Client 01 |
| Client 02 Admin | Active, assigned only to Client 02 |
| Client 03 Admin | Active, assigned only to Client 03 |
| Client 04 Admin | Active, assigned only to Client 04 |
| Multi-tenant Client Admin | Optional, explicitly assigned to two test tenants |
| Suspended Client Admin | Correct password but suspended |
| Invited Client Admin | Not yet active |
| Unassigned client account | No tenant membership |
| Anonymous user | No CMS session |
| Four website credentials | One independently rotatable pair per website |

Never store real passwords or tokens in this document, test source, screenshots, logs, issue descriptions, or shell history. Use a test secret manager or CI secret store.

### 11.2 Content fixtures per tenant

- One published `home` page and one draft page.
- One published, one archived, and one nested-slug page.
- Same slug in two different websites to prove site-scoped uniqueness.
- A version-rich page with at least 51 edit attempts to test retention.
- One document for each available page block.
- One Post in each relevant state.
- Header and footer Navigation, including internal, external, child, disabled and new-tab links.
- One Site Settings record.
- Public and private-admin media; clean, pending and rejected scan states.
- Valid image, valid video, valid PDF, oversized file, unsupported type and MIME-spoof fixture.
- Content Requests in every allowed state.
- Successful, retrying and failed Revalidation Deliveries.

### 11.3 Data safety rules

1. Integration tests must use a disposable database identified by a guarded test-only name.
2. Destructive suites must abort if the target matches a known development, staging shared, or production database.
3. Generate unique tenant keys, emails, domains, slugs and delivery IDs per run.
4. Clean up test records, databases and media even after failure.
5. Keep evidence free of secrets and unnecessary personal data.
6. Take a recovery point before migration, load or destructive recovery exercises.
7. Do not run malware, denial-of-service or data-corruption tests outside an isolated security environment.

## 12. Current effective role matrix

| CMS area | Super Admin | Client Admin |
|---|---|---|
| Tenants | Create/read/update all; no delete | Read assigned tenant(s); no create/update/delete |
| CMS Users | Create/read/update all; delete except protected final active Client Admin | Read/update self only; no create/delete |
| Websites | Create/read/update all; no delete | Read assigned websites only |
| Pages | Create/read/update/publish/read versions all; no delete | Same within assigned tenant(s) |
| Posts | Create/read/update/publish/read versions all; no delete | Same within assigned tenant(s) |
| Media | Full CRUD all | Full CRUD within assigned tenant(s) |
| Navigation | Full CRUD all | Full CRUD within assigned tenant(s) |
| Site Settings | Create/read/update all; no delete | Create/read/update within assigned tenant(s); no delete |
| Content Requests | Create/read/update all; no delete; can use company-only fields | Create/read/update within tenant; no delete; restricted workflow/fields |
| Activity Events | Read all; system writes | Read assigned-tenant records; system writes |
| Revalidation Deliveries | Read/update; system creates; no delete | No access |

The effective user-access override means Client Admin cannot invite or manage another Client Admin in this release, even though an older role document says otherwise. That contradiction must remain a tracked documentation/product item.

## 13. Test case standard

### 13.1 Identifier scheme

Use `TC-{DOMAIN}-{NNN}`:

| Domain | Meaning |
|---|---|
| ENV | Environment, build and health |
| AUTH | Authentication and sessions |
| RBAC | Roles, fields and authorization |
| TEN | Tenant isolation and lifecycle |
| USR | CMS Users |
| WEB | Website configuration/onboarding |
| PAGE | Pages, drafts, versions and SEO |
| BLK | Content blocks and renderer compatibility |
| POST | Posts |
| MED | Media |
| NAV | Navigation |
| SET | Site Settings |
| REQ | Content Requests |
| AUD | Activity Events |
| API | Public API and DTO contract |
| PRE | Preview |
| REV | Revalidation worker and caching |
| C01 | Reusable Client 01 frontend |
| D360 | DGTL360 frontend |
| ENQ | DGTL360 enquiry flow |
| E2E | Cross-system golden journeys |
| DB | Database, migration and backup |
| SEC | Security |
| PRIV | Privacy and data governance |
| PERF | Performance and capacity |
| A11Y | Accessibility |
| COMP | Browser, device and version compatibility |
| REL | Reliability, recovery and resilience |
| OBS | Observability and alerts |
| UAT | User acceptance |

### 13.2 Required test-case fields

Every managed test case must include:

```text
ID:
Title/objective:
Requirement/risk:
Priority:
Test level/type/technique:
Environment and build:
Role, tenant and website:
Preconditions:
Test data:
Steps:
Expected results for every step:
Postconditions/cleanup:
Automation status:
Actual result:
Evidence links:
Defect ID:
Tester and execution time:
```

### 13.3 Result states

`NOT RUN`, `PASS`, `FAIL`, `BLOCKED`, `SKIPPED — APPROVED`, or `NOT APPLICABLE`.

A test is not `PASS` when only the final screen looks correct. All expected database/API/audit/cache side effects that belong to the test must also be verified.

### 13.4 Priority and severity

| Level | Meaning | Examples |
|---|---|---|
| P0 / Critical | Stop release and security triage | Cross-tenant leak, auth bypass, secret exposure, wrong site changed, data corruption/loss |
| P1 / High | Primary workflow or production safety unavailable | Cannot login/publish, drafts public, migration fails, media broken across site |
| P2 / Medium | Material defect with workaround or limited scope | One block/field/browser fails, version restore issue |
| P3 / Low | Minor cosmetic/documentation issue | Spacing, non-blocking wording, low-impact visual inconsistency |

Priority controls execution order. Severity describes observed impact. Record both when they differ.

## 14. Entry, suspension, exit and release gates

### 14.1 System-test entry criteria

- [ ] Current requirements and two-role policy are approved.
- [ ] Release candidate is identified by commit SHA/artifact and migration set.
- [ ] Required services and affected frontends are deployed and healthy.
- [ ] Test environment uses a dedicated database and storage location.
- [ ] Four-tenant synthetic data and role accounts are loaded.
- [ ] Logs, request/delivery IDs and database inspection are available.
- [ ] Critical unit, contract and integration foundations pass.
- [ ] Known limitations are classified and linked to defects/decisions.

### 14.2 Suspend testing when

- Any cross-tenant response or mutation is observed.
- Production or an unapproved shared database/storage target is detected.
- A test exposes a secret or real personal data.
- Environment failures invalidate more than 20% of planned execution.
- Build, schema and frontend versions are unknown or incompatible.
- Test results cannot be attributed to a reproducible release candidate.

Resume only after the cause is corrected, the environment is revalidated, and affected results are discarded/re-executed.

### 14.3 System-test exit criteria

- 100% of planned P0/P1 tests executed and passed.
- No open Critical or High defect.
- 100% tenant-isolation and website credential matrix pass.
- All affected frontend field/block mappings are proven.
- Clean migration, current-schema upgrade and database/media restore pass.
- Security, performance, accessibility, compatibility and resilience gates pass.
- Blocked/skipped tests have approved reasons and owners.
- Full evidence pack and traceability matrix are complete.

### 14.4 Release gate

Release requires written QA, Engineering, DevOps, Security and Product approval. A waiver must contain defect ID, business risk, compensating control, owner, expiry date and named approver. Critical cross-tenant, authentication, secret, data-loss or migration-reproducibility failures cannot be waived.

## 15. Existing automation baseline and required CI evolution

### 15.1 Current repository suites

- CMS Vitest unit tests for collections, policies, canonical-origin proxy, public navigation mapping, security signatures, slugs and request transitions.
- Real-PostgreSQL tenant-isolation integration suite.
- Three Playwright canonical-origin E2E tests in Chromium.
- Reusable frontend component/signature tests.
- CMS client and public content-contract tests.

### 15.2 Standard commands

```text
pnpm install --frozen-lockfile
pnpm generate:types
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @dgtl/cms test:int
pnpm --filter @dgtl/cms test:e2e
pnpm build
```

`TEST_DATABASE_URL` must target a disposable PostgreSQL database for integration execution.

### 15.3 Pull-request gates to add or enforce

1. Secret scan and dependency/SBOM scan.
2. Generated Payload types followed by a clean-diff check.
3. Lint, typecheck, unit, component and contract suites.
4. Coverage reporting with meaningful branch coverage for policies, hooks and security code.
5. Empty PostgreSQL database built using committed migrations with schema push disabled.
6. Four-tenant PostgreSQL integration suite.
7. CMS, reusable frontend and all affected custom frontend production builds.
8. Start CMS, worker and a frontend; verify health.
9. Critical Chromium E2E journey.
10. JUnit, coverage, Playwright trace and sanitized log artifacts.

Current CI does not run lint or Playwright E2E and enables schema push, so it cannot prove migration completeness. DGTL360 is a separate repository and needs its own CI or a coordinated integration pipeline.

### 15.4 Nightly/release automation

- Chromium, Firefox and WebKit browser matrix.
- Full Client 01 and DGTL360 route/rendering matrix.
- Accessibility automation with manual follow-up.
- Worker failure/retry and service-outage scenarios.
- Migration upgrade from the last release.
- Performance budget and basic load tests.
- Deeper dependency/container/security scans.
- Synthetic four-site credential and content-freshness checks.

## 16. Critical end-to-end journeys

### TC-UAT-001 — Super Admin provisions a new client website

**Priority:** P0  
**Preconditions:** Dedicated QA environment, active Super Admin, unique synthetic client values, reusable frontend deployment prepared but not connected.

1. Login at the canonical CMS origin.
   - Expected: Super Admin dashboard appears; all tenants are visible.
2. Create a tenant with a valid unique kebab-case key and `active` status.
   - Expected: Tenant persists and is selectable; activity/configuration behaviour is recorded as designed.
3. Select the new tenant and create a Website with unique key/domain, preview domain, frontend key, model version and revalidation URL.
   - Expected: Website belongs to the selected tenant and cannot be seen by unrelated Client Admins.
4. Create one Site Settings record, header/footer Navigation, Media, and a published page with slug `home`.
   - Expected: Duplicate settings/navigation rules are enforced; relationships remain within tenant.
5. Assign the Home page in Website configuration.
   - Expected: Relationship saves only when it points to an allowed page for the intended site; record any cross-tenant acceptance as a defect.
6. Create and activate a Client Admin assigned only to the new tenant.
   - Expected: Client role is `client-admin`; no company role can be assigned.
7. Configure distinct server-side read/revalidation secrets and frontend environment; start/redeploy CMS, worker and frontend.
   - Expected: Secrets do not appear in client JavaScript or logs.
8. Read website/settings/navigation/home through the new frontend.
   - Expected: Every DTO reports the new website key and no existing-client content.
9. Publish a change.
   - Expected: Only the new frontend changes and delivery succeeds.

### TC-UAT-002 — Client Admin edits, previews and publishes Client 01

**Priority:** P0

1. Login as Client 01 Admin in an isolated browser context.
   - Expected: Only Client 01 tenant/site data appears; no company dashboard or delivery collection.
2. Create `about-us-qa` as a draft with Hero, Rich Text, Image/Text and CTA blocks.
   - Expected: Tenant/site default correctly; cross-tenant relationship options are absent.
3. Select an approved font, add SEO, enable header navigation and save a draft.
   - Expected: Draft and version persist but public URL remains 404 or shows the previous published version.
4. Obtain a signed preview through the preview API/control.
   - Expected: Correct frontend shows the draft with a visible preview state; public visitors do not.
5. Publish the page.
   - Expected: Page, activity and pending delivery records commit; route becomes public.
6. Wait for worker delivery.
   - Expected: Correct site updates within the agreed target; Client 02–04 remain unchanged.
7. Logout and revisit Admin URLs.
   - Expected: Protected content is unavailable.

### TC-UAT-003 — Four-tenant isolation attack matrix

**Priority:** P0

For each Client Admin and every tenant-enabled collection:

1. List/search own and other-tenant records.
2. Request another tenant's known ID directly.
3. Submit create/update data containing another tenant and website ID.
4. Attach another tenant's media/page relationship.
5. Request drafts, versions, locks, preview and raw generated APIs.
6. Try bulk, filter, sort, relationship search and pagination variants.
7. Repeat with each website key/token pair.

Expected: own-scope operations follow role rules; every cross-tenant operation returns safe denial/not-found without exposing record existence, counts, titles, file names, relationship data or cached content. Verify no forbidden row/file/audit/delivery was created.

### TC-UAT-004 — DGTL360 content publication

**Priority:** P0

1. As the assigned Client 02 Admin, edit CMS fields used by the DGTL360 home page.
2. Save a draft and obtain a valid preview.
3. Verify hero text/video, service order, company overview, statement, team, contact and configured interface labels.
4. Edit one `serviceDetail` page, including accent, image and capability sections.
5. Publish and verify `/services/[slug]` plus SEO and media.
6. Confirm an unknown service returns the designed 404.
7. Confirm an arbitrary non-service CMS page does not silently claim support; it is expected to need a frontend route.
8. Confirm Client 01 and other sites are unchanged.

### TC-UAT-005 — Content Request from submission to completion

**Priority:** P1

1. Client Admin submits a request with page reference, priority and attachment.
2. Verify requester/status are server-set to the logged-in user and `submitted`.
3. Attempt to set assignee/internal notes/internal state as client.
   - Expected: protected fields are hidden/rejected.
4. Super Admin moves through `reviewing`, optional `needs-information`, `in-progress` and `client-review` with visible comments.
5. Client can add feedback, but only Super Admin returns `client-review → in-progress`; Client can accept with `client-review → completed`.
6. Verify internal notes never appear to the client or public API and completed metadata is correct.

### TC-UAT-006 — Backup, migration and recovery rehearsal

**Priority:** P0

1. Back up PostgreSQL and media from a coordinated recovery point.
2. Create a new empty database and media location.
3. Apply committed migrations only, with schema push disabled.
4. Restore data/media or perform the approved upgrade rehearsal.
5. Verify tenant/user/page/version/media/audit/delivery counts and representative hashes.
6. Start CMS, worker and both frontend families.
7. Login, read, preview and publish one page per tenant.
8. Record achieved RPO/RTO and destroy the isolated recovery environment.

## 17. Functional test catalogue

The catalogue below defines minimum coverage. Convert each row into a managed test case with the full template when executing manually or automating it.

### 17.1 Environment, startup and canonical origin

| ID | Scenario | Required result | Pri. |
|---|---|---|---|
| TC-ENV-001 | Start CMS with valid database and secrets | Admin and health endpoint start without schema/runtime error | P0 |
| TC-ENV-002 | Start CMS with missing database URL | Startup/health fails safely without leaking credentials | P1 |
| TC-ENV-003 | Start worker with valid configuration | Worker polls without modifying unrelated records | P1 |
| TC-ENV-004 | Start Client 01 with complete binding | Health reports the generic service healthy and page loads; health does not currently expose website key | P0 |
| TC-ENV-005 | Remove each required Client 01 server variable | Startup/request fails clearly; no fallback to another client | P0 |
| TC-ENV-006 | Use `127.0.0.1` Admin URL while canonical origin is `localhost` | Safe canonical redirect/relay occurs; no Server Action replay or unauthorized loop | P1 |
| TC-ENV-007 | Health while PostgreSQL unavailable | CMS reports unavailable/503 with safe error; monitoring fires | P1 |
| TC-ENV-008 | Build from clean checkout | All packages build using documented versions and no undeclared local artifact | P0 |
| TC-ENV-009 | Start DGTL360 with complete binding | Health reports the expected CMS website key and mapped pages load | P0 |
| TC-ENV-010 | Remove DGTL360 CMS binding while local fallback exists | Fallback may render, but health/logs must expose degraded CMS connection; no false certification | P0 |

### 17.2 Authentication and session management

| ID | Scenario | Required result | Pri. |
|---|---|---|---|
| TC-AUTH-001 | Active Super Admin valid login | Login succeeds and company dashboard/all-tenant access appears | P0 |
| TC-AUTH-002 | Active Client Admin valid login | Login succeeds with assigned tenant scope only | P0 |
| TC-AUTH-003 | Wrong email/password | Safe generic error; no user enumeration or session | P0 |
| TC-AUTH-004 | Suspended account with correct password | Login denied with no usable session | P0 |
| TC-AUTH-005 | Invited/non-active account | Behaviour matches approved activation policy | P1 |
| TC-AUTH-006 | Five consecutive invalid attempts | Account locks according to configured policy | P1 |
| TC-AUTH-007 | Login during and after 15-minute lock | Denied during lock; valid login allowed after expiry/reset | P1 |
| TC-AUTH-008 | Eight-hour token/session expiry | Protected requests fail and reauthentication is required | P1 |
| TC-AUTH-009 | Logout then replay cookie/token | Session is unusable; Admin/API denies access | P0 |
| TC-AUTH-010 | Concurrent browser sessions and password change | Approved session invalidation policy is consistent and documented | P1 |
| TC-AUTH-011 | Cookie attributes in production-like HTTPS | HttpOnly, Secure, suitable SameSite/domain/path and expiry | P0 |
| TC-AUTH-012 | Password reset/invitation | Works through configured provider, or remains explicitly NOT IMPLEMENTED | P1 |

### 17.3 Tenant and authorization

| ID | Scenario | Required result | Pri. |
|---|---|---|---|
| TC-TEN-001 | Super Admin lists/selects every tenant | All authorized tenants visible; persistent current-client banner updates | P0 |
| TC-TEN-002 | Client Admin opens tenant selector/list | Only assigned tenant(s) visible | P0 |
| TC-TEN-003 | Client Admin manually requests another tenant URL/ID | Safe denial/not-found; no metadata leakage | P0 |
| TC-TEN-004 | Super Admin creates valid tenant | Unique record created with timestamps/status behaviour | P1 |
| TC-TEN-005 | Invalid/duplicate tenant key | Validation rejects uppercase, unsafe form and duplicate key | P1 |
| TC-TEN-006 | Client Admin attempts create/update/delete tenant | Server denies, regardless of hidden UI | P0 |
| TC-TEN-007 | Super Admin attempts normal tenant delete | Denied; content retained | P0 |
| TC-TEN-008 | Suspend tenant | Public resolution is blocked; **KNOWN FAIL probe:** current Client Admin CMS content access may remain active, although required behaviour is full tenant suspension | P0 |
| TC-TEN-009 | Reactivate suspended tenant | Access returns only after controlled checks; other tenants unchanged | P1 |
| TC-TEN-010 | Tamper selected-tenant cookie/context | Context cannot expand server authorization | P0 |
| TC-TEN-011 | Switch tenant with unsaved document | Clear warning/no accidental cross-tenant save | P1 |
| TC-TEN-012 | Direct SQL/application bypass review | Runtime credentials and elevated calls cannot accidentally bypass intended policy | P0 |

### 17.4 CMS Users and profiles

| ID | Scenario | Required result | Pri. |
|---|---|---|---|
| TC-USR-001 | Super Admin creates company user | Account is normalized to company + `company-super-admin`, no tenant assignment | P0 |
| TC-USR-002 | Super Admin creates Client Admin | Client account has only `client-admin` and intended tenant assignment | P0 |
| TC-USR-003 | Client Admin opens CMS Users | Only own user record appears | P0 |
| TC-USR-004 | Client Admin attempts to create another user | Denied by effective multi-tenant access policy | P0 |
| TC-USR-005 | Client changes display name/email/password | Safe self-service fields update according to policy | P1 |
| TC-USR-006 | Client changes account type/company role/tenant assignment | Protected values remain unchanged and request is denied/normalized | P0 |
| TC-USR-007 | Client submits another client's tenant assignment | Denied; no relationship stored | P0 |
| TC-USR-008 | Delete final active Client Admin | Last-admin deletion safeguard rejects the operation | P0 |
| TC-USR-009 | Remove one of multiple active Client Admins | Permitted only for Super Admin and audit/history remains attributable | P1 |
| TC-USR-010 | Normalize duplicate/mixed-case email | Email normalization and uniqueness work safely | P1 |
| TC-USR-011 | Login audit updates last-login field | Correct user timestamp changes without role-assignment side effects | P2 |
| TC-USR-012 | Client changes own account status | **KNOWN FAIL probe:** current self-update appears to permit this; required result is server denial | P0 |
| TC-USR-013 | Super Admin suspends or removes the only Client Admin assignment | **KNOWN FAIL probe:** deletion is protected, but these routes appear able to leave the tenant without an active admin | P0 |

### 17.5 Website configuration and onboarding

| ID | Scenario | Required result | Pri. |
|---|---|---|---|
| TC-WEB-001 | Super Admin creates Website under selected tenant | Tenant binding, unique key/domain and required fields persist | P0 |
| TC-WEB-002 | Client Admin attempts Website create/update/delete | Read-only assigned-site access; mutations denied | P0 |
| TC-WEB-003 | Duplicate website key/domain | Rejected without corrupting existing binding | P1 |
| TC-WEB-004 | Domain with scheme/case/trailing slash | Normalized to lowercase hostname-only value | P1 |
| TC-WEB-005 | Draft/suspended Website public binding | Safe not-found/unavailable; no content enumeration | P0 |
| TC-WEB-006 | Active tenant + active Website + valid pair | Binding succeeds with expected contract/site identity | P0 |
| TC-WEB-007 | Homepage relationship to another tenant/site | Must be rejected; acceptance is a security/data-integrity defect | P0 |
| TC-WEB-008 | Delete Website through Admin/API | Denied | P0 |
| TC-WEB-009 | Add only to `clients.example.yaml` then seed | No onboarding occurs; document that executable seed list is code-driven | P2 |
| TC-WEB-010 | Re-run supported seed | Idempotent; no duplicate tenants/sites/settings/home/nav | P1 |
| TC-WEB-011 | New fifth-client onboarding | Complete chain works with unique credentials and no source fork when generic frontend reused | P0 |
| TC-WEB-012 | Rotate one site's credentials | Only that site changes credentials; old token fails; other sites continue | P0 |

### 17.6 Pages, drafts, publishing, versions and SEO

| ID | Scenario | Required result | Pri. |
|---|---|---|---|
| TC-PAGE-001 | Super Admin creates a valid draft page for Client A | Draft and first version save under the selected tenant/website | P0 |
| TC-PAGE-002 | Client A Admin creates a page for Client A | Create succeeds within assigned scope | P0 |
| TC-PAGE-003 | Client A Admin creates/updates/publishes Client B page by forged ID | Denied; Client B is unchanged | P0 |
| TC-PAGE-004 | One-site tenant opens create form | Website is preselected and cannot be changed to an unrelated site | P1 |
| TC-PAGE-005 | Two-site tenant opens create form | Explicit website selection is required | P1 |
| TC-PAGE-006 | Slug contains URL, accents, case, spaces or duplicate separators | Stored slug follows the approved normalized nested-slug rule | P1 |
| TC-PAGE-007 | Duplicate slug on the same website | Conflict is rejected with no duplicate public route | P0 |
| TC-PAGE-008 | Same slug on a different website | Allowed and correctly isolated | P1 |
| TC-PAGE-009 | Save each template: standard, landing, contact, service | Each valid template persists and serializes | P1 |
| TC-PAGE-010 | Save each font choice: brand, sans, serif | Value persists; only a frontend that maps it changes visually | P1 |
| TC-PAGE-011 | Request draft page through public API/site | 404; no draft content or metadata leaks | P0 |
| TC-PAGE-012 | Publish valid draft as Client Admin | Public DTO becomes available, first `publishedAt` is populated | P0 |
| TC-PAGE-013 | Edit and republish an already published page | New content is public; action is classified as republish | P0 |
| TC-PAGE-014 | Compare `publishedAt` after republish | First-publish timestamp remains stable unless product policy says otherwise | P2 |
| TC-PAGE-015 | Archive a published page | Public API and automatic header navigation exclude it | P0 |
| TC-PAGE-016 | Unarchive and republish | Public route returns again and correct site is invalidated | P1 |
| TC-PAGE-017 | Delete page as either role | Denied under current retention policy | P1 |
| TC-PAGE-018 | Reorder several blocks, save, reopen and publish | Admin order, version order, DTO order and supported rendering order match | P0 |
| TC-PAGE-019 | Save without title, slug or layout | Required-field validation prevents invalid document | P1 |
| TC-PAGE-020 | Add media/page relationship from another tenant at any nesting depth | Rejected and no cross-tenant ID is stored | P0 |
| TC-PAGE-021 | Publish nested slug `services/production` | Exact nested CMS/API route resolves; claimed frontend route is verified separately | P1 |
| TC-PAGE-022 | Toggle `showInNavigation` on published page | Eligible page appears automatically in header only | P1 |
| TC-PAGE-023 | Opt out, draft or archive an automatically listed page | Page disappears from automatic header entries | P1 |
| TC-PAGE-024 | Trigger repeated autosaves and explicit saves | No silent loss; expected versions are present | P1 |
| TC-PAGE-025 | Create more than 50 versions | Retention stays at configured maximum of 50 | P2 |
| TC-PAGE-026 | Client A reads Client A and Client B version endpoints | Own versions visible; other tenant versions denied/empty | P0 |
| TC-PAGE-027 | Restore an older version, review and republish | Restored content is accurate and creates appropriate history/delivery | P1 |
| TC-PAGE-028 | Set SEO title, description, OG media and no-index | DTO and supported frontend metadata update | P1 |
| TC-PAGE-029 | SEO title at 70/71 and description at 180/181 characters | Boundaries accepted/rejected exactly as configured | P2 |
| TC-PAGE-030 | Publish page | Exactly one attributable Activity Event and one pending delivery are created | P0 |
| TC-PAGE-031 | Two editors update the same page concurrently | Lock/conflict/version behaviour prevents silent overwrite | P1 |
| TC-PAGE-032 | Publish invalid/incomplete page through direct API | Server validation rejects it regardless of Admin UI | P0 |

### 17.7 CMS block compatibility matrix

Every block test must cover: creation, required fields, empty/maximum rows, cross-tenant relationships, draft save, reopen, reorder, publish, public DTO, historical version, responsive rendering, keyboard access and unsupported-frontend behaviour.

| ID | Block | Main validation | DTO | Client 01 | DGTL360 |
|---|---|---|---|---|---|
| TC-BLK-001 | Hero | Heading required; maximum four links; safe URLs | Yes | Renders, but eyebrow is currently hardcoded and video unused | Mapped on Home for text/media/labels |
| TC-BLK-002 | Service Index | 1–20 related service pages; same tenant | Yes | Silently ignored | Orders Home services when slugs resolve |
| TC-BLK-003 | Company Overview | Required copy; paragraph/capability limits | Yes | Silently ignored | Mapped on Home |
| TC-BLK-004 | Statement | Required copy; valid optional anchor | Yes | Renders | Mapped on Home |
| TC-BLK-005 | Team Showcase | 1–20 members; valid media | Yes | Silently ignored | Mapped on Home |
| TC-BLK-006 | Identity Field | Wordmark/ARIA; 1–20 alphabets | Yes | Silently ignored | Mapped on Home |
| TC-BLK-007 | Service Detail | Order 1–99; six-digit hex; at least one section | Yes | Silently ignored | Required for CMS service conversion |
| TC-BLK-008 | Rich Text | Required valid Lexical value | Yes | Renders node-by-node | Stored/delivered, not consumed by designed pages |
| TC-BLK-009 | Image and Text | Required text; left/right | Yes | Renders | Not consumed by designed pages |
| TC-BLK-010 | Call to Action | Required heading; safe link | Yes | Renders | Used for enquiry heading/text |
| TC-BLK-011 | Card Grid | 1–12 cards | Yes | Renders | Not consumed by designed pages |
| TC-BLK-012 | Gallery | 1–20 valid media items | Yes | Renders | Not consumed by designed pages |
| TC-BLK-013 | FAQ | 1–20 question/answer items | Yes | Renders | Not consumed by designed pages |
| TC-BLK-014 | Contact Details | Valid email when supplied | Yes | Renders | Used for Home contact data |
| TC-BLK-015 | Logo Cloud | Up to 20 items; image required | Yes | Renders | Not consumed by designed pages |
| TC-BLK-016 | Spacer | small, medium, large | Yes | Renders | Not consumed by designed pages |

Cross-block negative and boundary tests:

| ID | Scenario | Required result | Pri. |
|---|---|---|---|
| TC-BLK-017 | Standard link uses `javascript:`, `data:`, HTTP, protocol-relative, whitespace/backslash trick | Unsafe URL rejected | P0 |
| TC-BLK-018 | Standard link uses internal path, HTTPS, `mailto:` or `tel:` | Approved schemes accepted | P1 |
| TC-BLK-019 | Anchor uses uppercase, spaces or invalid punctuation | Rejected; approved lowercase kebab anchor accepted | P1 |
| TC-BLK-020 | Colour uses short hex, name, expression or malformed value | Rejected; `#RRGGBB` accepted | P1 |
| TC-BLK-021 | Each `minRows`/`maxRows` boundary and one outside it | Exact boundary enforcement | P1 |
| TC-BLK-022 | Rich text contains scripts, handlers or raw hostile markup | Nothing executable reaches Admin, preview or public site | P0 |
| TC-BLK-023 | Logo Cloud URL contains unsafe scheme | Record current acceptance as a defect until safe-link validation is added | P1 |
| TC-BLK-024 | Image-only relationship selects video or PDF | Must be prevented or renderer must degrade safely; current unconstrained usage is a defect probe | P0 |
| TC-BLK-025 | Frontend receives unknown future block | Page remains usable; **KNOWN GAP:** current renderer silently omits it, so diagnostic/compatibility alert is required | P1 |
| TC-BLK-026 | Claim that a block is supported | Must prove stored + delivered + rendered, not merely available in Admin | P0 |

### 17.8 Posts

| ID | Scenario | Required result | Pri. |
|---|---|---|---|
| TC-POST-001 | Super/Client Admin creates, drafts, edits and publishes own-tenant post | Allowed and tenant-scoped | P1 |
| TC-POST-002 | Client A CRUD/publishes Client B post | Denied | P0 |
| TC-POST-003 | Duplicate slug same site versus different site | Same-site rejected; cross-site allowed | P1 |
| TC-POST-004 | Excerpt at 320/321 characters, categories and author | Boundary enforced; values persist | P2 |
| TC-POST-005 | Add Hero plus all nine permitted general blocks | Valid set saves, versions and maps internally | P1 |
| TC-POST-006 | Draft, autosave, restore and >50 versions | Version policy is correct and isolated | P1 |
| TC-POST-007 | Attach cross-tenant media | Rejected at every API path | P0 |
| TC-POST-008 | Publish/republish | Correct event, cache tags/path and delivery | P1 |
| TC-POST-009 | Delete post | Denied under current retention rule | P1 |
| TC-POST-010 | Fetch a published post from supplied frontends | Mark KNOWN LIMITATION: no public Posts endpoint or frontend route exists | P1 |
| TC-POST-011 | Request signed draft preview for a post | Mark KNOWN LIMITATION: no post-preview endpoint exists | P1 |

### 17.9 Media library and delivery

| ID | Scenario | Required result | Pri. |
|---|---|---|---|
| TC-MED-001 | Upload JPEG, PNG, WebP, AVIF, MP4, WebM and PDF below limit | Each supported type is accepted | P1 |
| TC-MED-002 | Upload SVG, executable or unsupported text MIME | Rejected | P0 |
| TC-MED-003 | Upload 24.9 MB and 25.1 MB fixtures | Under-limit succeeds; over-limit is rejected safely | P1 |
| TC-MED-004 | Upload representative image | Card 768×512 and Hero 1600×900 sizes are generated correctly | P1 |
| TC-MED-005 | Client A lists/updates/deletes own media | Allowed according to current matrix | P1 |
| TC-MED-006 | Client A reads/updates/deletes Client B media by list/direct ID | Denied without metadata leakage | P0 |
| TC-MED-007 | Link Client A upload to Client B website/tenant | Rejected | P0 |
| TC-MED-008 | Clean public media in a page | DTO includes only approved public representation | P1 |
| TC-MED-009 | Pending, rejected or private-admin media | DTO omits/nulls it; filename/storage path does not leak | P0 |
| TC-MED-010 | Decorative versus meaningful image alt text | Decorative alt is empty; meaningful asset requires editorial accessibility control | P1 |
| TC-MED-011 | Update alt, caption and credit | Stored values and deliberately exposed DTO fields are correct | P2 |
| TC-MED-012 | MIME header disagrees with magic bytes/polyglot fixture | Trusted byte inspection/scanner rejects it; otherwise record security blocker | P0 |
| TC-MED-013 | Fetch generated `/sites/{key}/media/{id}` URL | Correct tenant returns 200/206 with safe headers; foreign/missing media returns 404. Repeat from a clean checkout because the local handler is currently ignored by Git | P0 |
| TC-MED-014 | Restart/restore with local media directory | DB references and files stay coordinated; no broken orphaned media | P0 |
| TC-MED-015 | Client changes `scanStatus` | **KNOWN FAIL:** current field has no field-level restriction; required result is trusted-scanner-only mutation | P0 |

### 17.10 Navigation and Site Settings

#### Navigation

| ID | Scenario | Required result | Pri. |
|---|---|---|---|
| TC-NAV-001 | Create one header and one footer navigation per website | Both save for authorized role | P1 |
| TC-NAV-002 | Create a second navigation for the same website/location | Unique conflict; existing document intact | P1 |
| TC-NAV-003 | Client A CRUDs Client B navigation | Denied | P0 |
| TC-NAV-004 | Add 20/21 top-level items and 10/11 children | Configured limits enforced | P1 |
| TC-NAV-005 | Test every approved and unsafe URL scheme | Only safe schemes/routes are accepted | P0 |
| TC-NAV-006 | Use unsorted manual order values | Public items sort ascending and remain stable on ties | P2 |
| TC-NAV-007 | Disabled, empty-label or no-target item | Omitted from public navigation | P1 |
| TC-NAV-008 | Item contains both page and external URL | Documented external URL precedence is consistent | P2 |
| TC-NAV-009 | Page relation points to Home or nested page | Resolves to `/` or exact nested path | P1 |
| TC-NAV-010 | Published `showInNavigation` page is not manually listed | Automatically appended alphabetically to header | P1 |
| TC-NAV-011 | Same URL exists manually and automatically | One item only | P1 |
| TC-NAV-012 | Disabled manual item reserves the auto page URL | Verify current suppression rule and obtain product approval | P2 |
| TC-NAV-013 | Eligible page with footer navigation | Not automatically appended to footer | P2 |
| TC-NAV-014 | Save navigation | Correct event and pending `/` revalidation delivery | P1 |
| TC-NAV-015 | Render nested children on both supplied websites | KNOWN LIMITATION: DTO contains children but both current top-level UIs ignore them | P1 |
| TC-NAV-016 | `newTab=true` external link | Opens new context with safe `noopener`/`noreferrer` behaviour | P1 |

#### Site Settings

| ID | Scenario | Required result | Pri. |
|---|---|---|---|
| TC-SET-001 | Create settings for an unconfigured website | Authorized role succeeds | P1 |
| TC-SET-002 | Create second settings document for same website | Unique conflict | P1 |
| TC-SET-003 | Client A reads/updates Client B settings | Denied | P0 |
| TC-SET-004 | Delete settings | Denied under current retention policy | P1 |
| TC-SET-005 | Attach Client B logo/favicon/social image to Client A | Rejected | P0 |
| TC-SET-006 | Change contact/default SEO/footer values | Public DTO changes only for exposed fields | P1 |
| TC-SET-007 | Change DGTL brand, enquiry and service strings | Only mapped DGTL360 text changes | P1 |
| TC-SET-008 | Change Client 01 display name/footer/contact email | Only fields mapped by Client 01 change | P1 |
| TC-SET-009 | Change logo, favicon, social links/image, analytics, locale, timezone or maintenance | Mark STORED ONLY where current public DTO omits the value | P1 |
| TC-SET-010 | Enable maintenance mode | KNOWN LIMITATION: current public authorization still serves active/maintenance website | P0 |
| TC-SET-011 | Store unsafe social URL | Must be rejected; current missing validator is a defect probe | P1 |
| TC-SET-012 | Update settings | Correct `site-settings.changed` event and site/config delivery | P1 |

### 17.11 Content Requests workflow

Approved current transition model:

```text
submitted ──> reviewing ──> needs-information ──> reviewing
    │              │
    │              └──────> in-progress ──> client-review ──> completed
    │                              │               │
    │                              └───────────────┘ (back to in-progress)
    └──────────────> cancelled

reviewing may also be cancelled; completed and cancelled are terminal.
```

Current actor rules require separate validation:

| Actor | Allowed status behaviour in current code |
|---|---|
| Super Admin/company staff | May perform any edge permitted by the state graph |
| Client Admin | Creation is forced to `submitted`; may cancel where the graph permits and may set `completed` from `in-progress` or `client-review`; cannot enter/return to internal states such as `reviewing`, `needs-information`, `in-progress` or `client-review` |

The direct Client Admin `in-progress → completed` path needs Product approval; if the intended workflow requires a client-review handoff first, treat it as a defect.

| ID | Scenario | Required result | Pri. |
|---|---|---|---|
| TC-REQ-001 | Client submits valid own-tenant request with forged requester/status | Requester and initial `submitted` status are server-controlled | P0 |
| TC-REQ-002 | Anonymous creation | 401/no record | P0 |
| TC-REQ-003 | Client A creates/updates Client B request | Denied | P0 |
| TC-REQ-004 | Cross-tenant attachments, target page or result page | Rejected | P0 |
| TC-REQ-005 | Client sets `assignedTo` or `internalNotes` | Hidden and server-denied | P0 |
| TC-REQ-006 | Client reads company internal notes | Omitted | P0 |
| TC-REQ-007 | Super Admin assigns staff and adds internal notes | Allowed and attributable | P1 |
| TC-REQ-008 | `submitted → reviewing` | Company role allowed | P1 |
| TC-REQ-009 | `reviewing → needs-information/in-progress/cancelled` | Each valid edge succeeds | P1 |
| TC-REQ-010 | `needs-information → reviewing`; try direct completion | Return succeeds; skipped transition returns 409 | P1 |
| TC-REQ-011 | Super Admin: `in-progress → client-review/completed` | Each valid edge succeeds | P1 |
| TC-REQ-012 | Super Admin: `client-review → in-progress/completed` | Each valid edge succeeds | P1 |
| TC-REQ-013 | Any transition from completed/cancelled | 409 terminal-state rejection | P1 |
| TC-REQ-014 | Client attempts internal company workflow states | 403 | P0 |
| TC-REQ-015 | Client cancels submitted request | Allowed | P1 |
| TC-REQ-016 | Client approves/completes at client-review | Allowed; `completedAt` populated once | P1 |
| TC-REQ-017 | Re-save completed request | Original completion timestamp remains | P2 |
| TC-REQ-018 | Delete request | Denied | P1 |
| TC-REQ-019 | Assign staff user unrelated to tenant | Must be rejected; missing relationship check is a defect probe | P1 |
| TC-REQ-020 | Forge comment author/time | Server must normalize; missing normalization is a defect probe | P1 |
| TC-REQ-021 | Client at `in-progress` attempts `completed` | Current code allows it; flag for Product decision because it bypasses explicit `client-review` handoff | P1 |
| TC-REQ-022 | Client at `client-review` attempts `in-progress` | 403; Client supplies feedback, Super Admin performs the return transition | P1 |

### 17.12 Activity Events and revalidation deliveries

#### Audit events

| ID | Scenario | Required result | Pri. |
|---|---|---|---|
| TC-AUD-001 | Publish page/post | Event has actor snapshot, action, tenant, website, target, summary and outcome | P0 |
| TC-AUD-002 | Republish page/post | Action is classified as republished | P1 |
| TC-AUD-003 | Change navigation/settings | Correct `.changed` event | P1 |
| TC-AUD-004 | Client A reads Client A/Client B events | Own tenant only | P0 |
| TC-AUD-005 | Human role creates/updates/deletes event | Denied | P0 |
| TC-AUD-006 | Login/user/tenant/media mutations | Record KNOWN COVERAGE GAP where no general event is generated | P1 |
| TC-AUD-007 | Inspect event/log content | No password, bearer token, HMAC or unnecessary personal content | P0 |

#### Revalidation deliveries and worker

| ID | Scenario | Required result | Pri. |
|---|---|---|---|
| TC-REV-001 | Publish Home | Pending delivery has correct website/tags and `/` path | P0 |
| TC-REV-002 | Publish nested page | Cache path exactly matches nested public route | P0 |
| TC-REV-003 | Update navigation/settings | Correct site/config tags and `/` path | P0 |
| TC-REV-004 | Valid binding and healthy frontend | Worker transitions delivering → succeeded; stores status/time | P0 |
| TC-REV-005 | Missing URL/secret | **KNOWN FAIL probe:** current worker can throw before increment/error handling, leave the row pending and abort the cycle; required result is isolated actionable failure | P0 |
| TC-REV-006 | Frontend returns non-2xx or hangs >10 seconds | Retry scheduled; other tenants continue processing | P1 |
| TC-REV-007 | Exhaust failures | Attempts follow 0, 30, 120, 600 and 1800-second policy then final failure | P1 |
| TC-REV-008 | Delivery has future `nextAttemptAt` | Worker skips until eligible | P2 |
| TC-REV-009 | More than ten ready rows | Oldest ten maximum selected fairly | P1 |
| TC-REV-010 | Client opens deliveries | No collection access | P0 |
| TC-REV-011 | Super Admin read/update versus create/delete | Read/update allowed; direct human create/delete denied | P1 |
| TC-REV-012 | Valid signed webhook to each frontend | Correct cache entries invalidate | P0 |
| TC-REV-013 | Missing/bad/expired timestamp or signature | 401; cache remains unchanged | P0 |
| TC-REV-014 | Correct signature but wrong website key | 403; other website unchanged | P0 |
| TC-REV-015 | Replay same delivery ID in one unchanged frontend process | Current process returns 409; do not infer restart or multi-instance protection | P0 |
| TC-REV-016 | More than 20 tags/paths, wrong prefix, traversal or query path | 400; no arbitrary invalidation | P0 |
| TC-REV-017 | Restart frontend then replay delivery | KNOWN RISK: current process-local replay map resets | P0 |
| TC-REV-018 | Compare generic and DGTL cache behaviour | Document intentional difference; no unacceptable stale content | P1 |
| TC-REV-019 | Badly configured oldest delivery followed by healthy ready rows | **KNOWN FAIL probe:** one thrown configuration error must not starve the rest of the batch/cycle | P0 |
| TC-REV-020 | Two workers claim the same pending delivery concurrently | **KNOWN RISK:** current claim is not proven atomic; required result is one delivery attempt only | P0 |

### 17.13 Public API and content contract

Run the authentication-binding set against every public endpoint: site, settings, header navigation, footer navigation, exact page and service-page list.

| ID | Scenario | Required result | Pri. |
|---|---|---|---|
| TC-API-001 | Matching active website key + Bearer token | 200, expected DTO/version header, request ID and cache policy | P0 |
| TC-API-002 | Missing token, wrong token, key/header mismatch or unknown key | Same non-enumerating 404 shape | P0 |
| TC-API-003 | Secret map missing/malformed | Safe 503 without configuration disclosure | P0 |
| TC-API-004 | Draft/suspended website or inactive tenant | 404 | P0 |
| TC-API-005 | Maintenance website | Current result is 200; flag until product enforcement is defined | P0 |
| TC-API-006 | Published, unarchived exact page slug | Versioned Page DTO returned | P0 |
| TC-API-007 | Draft, archived, wrong-site or absent page | 404 | P0 |
| TC-API-008 | Nested or dirty URL slug | Deterministic normalization and exact lookup | P1 |
| TC-API-009 | Page list with `template=service` | Only matching published/unarchived service pages | P1 |
| TC-API-010 | Missing/unsupported list template | 400 structured `INVALID_QUERY` | P1 |
| TC-API-011 | Existing/missing settings | 200 exposed subset / 404 | P1 |
| TC-API-012 | Header/footer/invalid navigation location | Correct DTO for valid location; invalid is 404 | P1 |
| TC-API-013 | Any error response | `no-store`, request ID and safe structured body | P0 |
| TC-API-014 | Normal success | Approved public SWR cache and contract-version headers | P1 |
| TC-API-015 | Mock wrong DTO shape/version | Shared client throws controlled contract-invalid error | P0 |
| TC-API-016 | DGTL response contains wrong website identity | Reject it and use only approved safe fallback | P0 |
| TC-API-017 | Private/pending media in nested blocks | Filtered at every depth | P0 |
| TC-API-018 | Unsupported stored block | Request remains safe; **KNOWN GAP:** mapper omission is silent until diagnostics/compatibility reporting is added | P1 |
| TC-API-019 | Attempt public Posts route | KNOWN LIMITATION: endpoint is not implemented | P1 |

### 17.14 Signed draft preview

| ID | Scenario | Required result | Pri. |
|---|---|---|---|
| TC-PRE-001 | Logged-in Super Admin requests own-visible draft preview | Signed URL valid for five minutes | P1 |
| TC-PRE-002 | Client A requests Client A draft | Allowed | P1 |
| TC-PRE-003 | Client A requests Client B draft by ID | Denied | P0 |
| TC-PRE-004 | Anonymous request for signed URL | 401 | P0 |
| TC-PRE-005 | Valid URL opens frontend | Draft Mode, HTTP-only five-minute cookie and preview banner | P0 |
| TC-PRE-006 | Tamper token/signature or test 299/300/301-second boundaries | Only valid unexpired token succeeds | P0 |
| TC-PRE-007 | Client A token sent to Client B frontend | 401; no draft leakage | P0 |
| TC-PRE-008 | Change page ID/slug/site under valid token | 401; token remains document/site/slug bound | P0 |
| TC-PRE-009 | Inspect preview response/cache | `private, no-store`; never contaminates public cache | P0 |
| TC-PRE-010 | Exit Preview | Draft mode/cookie cleared and safe redirect occurs | P1 |
| TC-PRE-011 | Look for Payload Preview/Live Preview UI control | KNOWN LIMITATION: API exists but Page Admin has no configured button | P1 |
| TC-PRE-012 | Preview arbitrary DGTL page | KNOWN LIMITATION: only `/` and `/services/[slug]` route families exist | P1 |

### 17.15 Client 01 reusable frontend

| ID | Scenario | Required result | Pri. |
|---|---|---|---|
| TC-C01-001 | Healthy Client 01 binding opens `/` | CMS page with slug `home` loads | P0 |
| TC-C01-002 | Publish `about-us`, then open `/about-us` | Catch-all route renders exact CMS page | P0 |
| TC-C01-003 | Publish `services/production` | Exact nested route renders | P0 |
| TC-C01-004 | Open unknown, draft or archived slug | Branded 404/no leaked draft | P1 |
| TC-C01-005 | Remove/wrong read token or website key | Controlled failure; never another client's content | P0 |
| TC-C01-006 | Set page SEO metadata | Title, description, Open Graph and robots/no-index map correctly | P1 |
| TC-C01-007 | Select brand/sans/serif | Expected page class/computed typography changes | P1 |
| TC-C01-008 | Publish all 11 generic-renderer blocks | Each appears in CMS order and remains responsive | P1 |
| TC-C01-009 | Publish five design-specific blocks | KNOWN LIMITATION: Service Index, Company Overview, Team Showcase, Identity Field and Service Detail are silently ignored | P1 |
| TC-C01-010 | Change Hero eyebrow/video | KNOWN LIMITATION: eyebrow is hardcoded; video is unused | P1 |
| TC-C01-011 | Attempt to change header CTA/footer kicker in CMS | KNOWN LIMITATION: current copy remains hardcoded | P1 |
| TC-C01-012 | Header/footer navigation and `newTab` | Mapped top-level links work safely | P1 |
| TC-C01-013 | Navigation children | KNOWN LIMITATION: children not displayed | P1 |
| TC-C01-014 | Publish change and run worker | New content becomes visible within approved freshness target | P0 |
| TC-C01-015 | Preview/exit unpublished draft | Draft is visible only in preview and cookie clears on exit | P1 |
| TC-C01-016 | CMS unavailable on uncached request | Controlled error UI; retry works after recovery | P1 |
| TC-C01-017 | GET `/api/health` | 200, correct service identity, no-store | P1 |
| TC-C01-018 | Load a page containing CMS media | Media returns the correct tenant-bound bytes, MIME type and range response; repeat from a clean checkout because the current media Route Handler is ignored by Git | P0 |
| TC-C01-019 | Open a published Post slug | KNOWN LIMITATION: catch-all fetches Pages, not Posts | P1 |
| TC-C01-020 | 320–1920 px, keyboard, reduced motion and zoom | No content loss, overflow or inaccessible controls | P1 |

### 17.16 DGTL360 / Client 02 frontend

| ID | Scenario | Required result | Pri. |
|---|---|---|---|
| TC-D360-001 | Healthy Client 02 binding opens `/` | CMS Home, settings, navigation and service list load | P0 |
| TC-D360-002 | Change mapped Hero fields | Heading, copy, image/video and mapped labels update | P0 |
| TC-D360-003 | Change Company Overview, Statement, Team, Identity | Each designed Home section updates | P1 |
| TC-D360-004 | Change CTA/Contact content | Enquiry and contact content updates | P1 |
| TC-D360-005 | Reorder valid Service Index relationships | Home wheel/reel follows resolvable selected order | P1 |
| TC-D360-006 | Empty/unresolved Service Index | Approved full-CMS or local fallback is used predictably | P1 |
| TC-D360-007 | Publish `service` page with slug `services/x` and Service Detail | `/services/x` renders CMS content | P0 |
| TC-D360-008 | CMS service page has no Service Detail block | Omitted from CMS service lists; a CMS-only direct slug resolves to 404 rather than a reliable fallback | P1 |
| TC-D360-009 | Change service order | Service reel sorts by Service Detail order | P1 |
| TC-D360-010 | Change service SEO | Page metadata uses CMS override | P1 |
| TC-D360-011 | Unknown service without local fallback | Custom 404 | P1 |
| TC-D360-012 | Known local fallback while CMS fails | Approved fallback displays and error is observable | P1 |
| TC-D360-013 | Publish ordinary page `new-slug` | KNOWN LIMITATION: `/new-slug` returns 404; no general catch-all exists | P0 |
| TC-D360-014 | Change exposed settings/header/footer | Only mapped values change; empty values use documented fallback | P1 |
| TC-D360-015 | Navigation children | KNOWN LIMITATION: children not rendered | P1 |
| TC-D360-016 | Preview/exit Home draft | Draft banner/content appear only in preview | P1 |
| TC-D360-017 | Preview service draft | Draft Service Detail appears at bound service path | P1 |
| TC-D360-018 | Publish Client 02 change | Only Client 02 frontend invalidates; Client 01 is unchanged | P0 |
| TC-D360-019 | GET `/api/health` | Healthy response includes correct bound website key | P1 |
| TC-D360-020 | Use CMS-uploaded image/video | Image/video load through the tenant-bound public handler with valid byte ranges; repeat from a clean checkout because the current handler is ignored by Git | P0 |
| TC-D360-021 | Add generic FAQ/Gallery/etc. to designed Home | Stored/delivered but not rendered; limitation is clear, not treated as success | P1 |
| TC-D360-022 | Break CMS binding when a local fallback exists | Site may look healthy; console/API/telemetry must expose CMS failure | P0 |
| TC-D360-023 | Responsive animation and reduced motion | Layout/animation stays usable; reduced-motion preference is honoured | P1 |

#### DGTL360 enquiry flow

| ID | Scenario | Required result | Pri. |
|---|---|---|---|
| TC-ENQ-001 | Submit valid form with configured mail provider | Success state, one email and form reset | P1 |
| TC-ENQ-002 | Boundary values for name/email/company/phone/message | Client and server enforce the same approved rules | P1 |
| TC-ENQ-003 | Cross-origin request | 403 | P0 |
| TC-ENQ-004 | Non-JSON, malformed JSON, body >20,000 bytes | 415, 400 and 413 respectively | P1 |
| TC-ENQ-005 | Honeypot is populated | Safe apparent success without sending email | P1 |
| TC-ENQ-006 | Mail provider missing/failing | 503 and safe actionable UI; no false success | P1 |
| TC-ENQ-007 | Double click/retry | Client prevents accidental duplicate; server behaviour is understood | P2 |
| TC-ENQ-008 | Change mapped CMS labels/messages | Form/status copy updates | P2 |

### 17.17 Golden cross-system end-to-end scenarios

These are the smallest release-level stories that prove the platform, rather than isolated screens.

#### TC-E2E-001 — Client 01 provisioning and publication (P0)

1. Super Admin creates Tenant A and activates it.
2. Super Admin creates and activates Website A with unique key/domain.
3. Configure settings, header/footer navigation and a Home draft.
4. Create active Client A Admin and assign only Tenant A.
5. In a separate browser context, Client A Admin logs in.
6. Client changes Hero text and page font, saves a draft and uses signed preview.
7. Prove the public site still shows the last published version.
8. Client publishes.
9. Verify database version, Activity Event and pending delivery.
10. Run/observe worker success.
11. Verify Client 01 displays the new content within the accepted freshness target.
12. Verify Client 02 never changes.

Expected: the entire chain succeeds with correct tenant/site identity and sanitized evidence.

#### TC-E2E-002 — DGTL360 Home and service publication (P0)

Provision Client B, create the DGTL-compatible Home block set, create `services/x` with a Service Detail block, preview both, publish both, process deliveries, and verify `/` plus `/services/x`. Prove Client A is unchanged.

#### TC-E2E-003 — Full tenant-escape attack matrix (P0)

As Client A, attempt Client B operations by list filter, direct document ID, version ID, website relationship, nested block media/page relationship, navigation, settings, request, activity event, public token/key mixing and preview token reuse. Expected: zero Client B rows, counts, filenames, titles, drafts or writes.

#### TC-E2E-004 — Draft → preview → publish → archive lifecycle (P0)

Create a draft and prove public 404; open it using a five-minute signed preview and prove no-store; exit preview; publish and verify live; archive and verify 404/nav removal; restore a prior version, unarchive, republish and verify a new delivery.

#### TC-E2E-005 — Simultaneous multi-client publication (P0)

Publish Client A and Client B changes at nearly the same time. Inspect both deliveries and signatures. Verify each worker call reaches only its bound frontend/secret, each site changes correctly, and neither cache crosses tenants.

#### TC-E2E-006 — Revalidation outage and recovery (P0)

Make one frontend revalidation endpoint unavailable, publish content, verify the CMS transaction remains committed and last good public cache remains safe, observe the complete retry schedule, repair the endpoint, and prove the pending delivery succeeds without duplicating or affecting another client.

#### TC-E2E-007 — Suspension matrix (P0)

Suspend the user, tenant and website independently. Verify the different Admin/public effects and existing sessions. The current suspected gap—tenant suspension may not revoke Client Admin CMS content access—must be recorded as a release defect if reproduced.

#### TC-E2E-008 — Version restoration (P1)

Create several versions, restore one, compare every block/SEO field, preview, republish, and validate public rendering plus audit/delivery evidence.

#### TC-E2E-009 — Content Request completion (P1)

Exercise the complete company/client state machine: Client can cancel/approve at allowed points, while Super Admin performs internal states and any `client-review → in-progress` return. Also test the current direct `in-progress → completed` client behaviour as a Product-decision gap, and prove internal notes never appear to the client.

#### TC-E2E-010 — Credential rotation (P0)

Rotate Client A read, preview and revalidation secrets using an approved overlap/cutover procedure. Prove old credentials fail after cutover, new ones work, no secret is logged, and Client B is unaffected.

## 18. Non-functional test strategy

Non-functional testing is a release requirement, not a final cosmetic activity. Capacity and availability figures below are proposed initial baselines and require Product/Operations approval before they become contractual SLOs.

### 18.1 Security and OWASP coverage

Security tests run only against local, CI or explicitly approved staging targets. Do not attack production, third-party systems, or unapproved network ranges. Sanitize all evidence and never paste live secrets into a report.

| ID | Test | Required result | Pri. |
|---|---|---|---|
| TC-SEC-001 | Anonymous/Super/Client CRUD-publish-version matrix for every collection | Server enforces the approved matrix, not merely hidden UI | P0 |
| TC-SEC-002 | Other-tenant list, direct ID, version, relationship and lock endpoints | No record, count, title, filename or relationship metadata leaks | P0 |
| TC-SEC-003 | Forge tenant-selection cookie and tenant/website/media/page IDs | Rejected or safely normalized; no foreign relationship stored | P0 |
| TC-SEC-004 | Cartesian website-key/read-token matrix | Only exact active pair succeeds; invalid combinations look identical | P0 |
| TC-SEC-005 | Query public routes for drafts, autosaves and versions | Only published, non-archived content is public | P0 |
| TC-SEC-006 | Tamper preview payload, signature, site, page, slug, user, time | Only exact valid unexpired token succeeds with no-store | P0 |
| TC-SEC-007 | Tamper revalidation body/HMAC/time/delivery/site/path/tag and replay | Invalid message cannot invalidate any cache | P0 |
| TC-SEC-008 | Login enumeration, lockout, status, logout and expiry | Safe errors and no reusable unauthorized session | P0 |
| TC-SEC-009 | Cross-origin authenticated mutation/CSRF attempt | Blocked; production cookie attributes are correct | P0 |
| TC-SEC-010 | Stored/reflected XSS in plain, rich-text, alt, nav and settings fields | No execution in Admin, preview or public site | P0 |
| TC-SEC-011 | SQL/filter injection, malformed IDs, deep JSON, traversal and oversized params | No bypass, detailed DB error or uncontrolled resource use | P0 |
| TC-SEC-012 | Executable rename, MIME/magic mismatch, SVG/polyglot and media status abuse | Disallowed/untrusted content never becomes public | P0 |
| TC-SEC-013 | Controlled SSRF/open-redirect probes on preview and callback URLs | Private/loopback/metadata targets denied unless explicitly allowlisted | P0 |
| TC-SEC-014 | Scan source, history, bundle, network and logs for secrets | No DB URL, password, Bearer/HMAC/preview secret exposed | P0 |
| TC-SEC-015 | TLS and CSP/HSTS/nosniff/frame/referrer/permissions headers | Approved production policy present | P1 |
| TC-SEC-016 | Dependency, lockfile, container, SAST and SBOM scan | No unwaived exploitable Critical/High issue | P0 |
| TC-SEC-017 | Privileged and denied action audit | Attributable safe events/correlation IDs; users cannot edit logs | P1 |
| TC-SEC-018 | Approved abuse-rate test for login/public/media/preview/revalidation | Predictable throttling without cross-tenant effect | P1 |

Mandatory security gates:

- 100% tenant-isolation and website-token matrices pass.
- Zero public draft/private-media/secret exposure.
- No unresolved Critical or High security defect.
- Before public production use, validate MFA/SSO for company accounts, TLS, rate limiting/WAF, CSP, managed secrets and trusted malware scanning.
- Multi-instance frontend deployment requires shared, durable replay protection; process-memory replay state is not sufficient.

### 18.2 Performance, load, stress and scalability

Initial representative dataset:

- 25 tenants, 50 websites.
- 500 pages and 2,000 media metadata rows per tenant.
- 50 versions on at least 10% of pages.
- Maximum-sized navigation documents and representative block-rich pages.
- 10 concurrent editors and 5 publications per minute.

| ID | Workload | Provisional acceptance target |
|---|---|---|
| TC-PERF-001 | Public page/settings/navigation mix, 50 requests/sec for 15 min | p95 ≤ 400 ms, p99 ≤ 1 s, 5xx < 0.5% |
| TC-PERF-002 | Admin list/search/open/version history at representative volume | p95 visible document load ≤ 2.5 s; no unbounded query/memory growth |
| TC-PERF-003 | Autosave/explicit save with 10 concurrent editors | p95 acknowledgement ≤ 1.5 s; no lost/cross-document update |
| TC-PERF-004 | Publish through live frontend freshness | Ack p95 ≤ 2 s; hard requirement <60 s; stretch p95 ≤10 s/p99 ≤30 s |
| TC-PERF-005 | Upload 1 MB, 10 MB, 24.9 MB and 25.1 MB | Allowed files stable; over-limit rejected before uncontrolled buffering |
| TC-PERF-006 | Two-hour soak at 50% target traffic | Errors <0.5%; p95 degradation <20%; no connection/handle/memory leak |
| TC-PERF-007 | Five-minute 2× spike then normal traffic | Predictable degradation; recovery within 5 min; no data loss |
| TC-PERF-008 | Worker backlog/retry throughput across tenants | Oldest ready delivery <60 s at steady state; no tenant starvation |
| TC-PERF-009 | Public page on representative mobile/desktop network | p75 LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1 |
| TC-PERF-010 | Compare last accepted release | No critical-operation regression >20% without waiver |

Capture traffic model, dataset, commit, environment sizing, percentiles, throughput, error shapes, CPU/memory, PostgreSQL connections/slow queries and delivery queue age. Suggested isolated-environment tooling: k6 or Artillery for HTTP, Playwright timings for journeys and Lighthouse for page experience.

Abort a load/chaos run immediately if cross-tenant content appears, 5xx stays above 5% for 60 seconds, CPU/memory exceeds 85% for five minutes, DB pool exceeds 85%, disk exceeds 80%, or oldest queue age exceeds five minutes.

### 18.3 Accessibility

Target WCAG 2.2 AA for public websites and critical Admin workflows.

| ID | Test | Required result | Pri. |
|---|---|---|---|
| TC-A11Y-001 | axe scan login, dashboard, lists, forms, versions, preview and all public templates | Zero critical/serious violations; moderate findings reviewed | P1 |
| TC-A11Y-002 | Keyboard-only login, tenant select, page edit, block reorder, media, save/publish | Logical order, visible focus, no trap, accessible reorder alternative | P0 |
| TC-A11Y-003 | Headings, landmarks, names, tables, descriptions and validation errors | Semantic and programmatically associated | P1 |
| TC-A11Y-004 | NVDA + Chrome/Edge and VoiceOver + Safari | Critical flow and public content announced meaningfully | P1 |
| TC-A11Y-005 | 200% zoom, 320 CSS-pixel reflow and 400% critical content | No functional/content loss or unjustified two-axis scrolling | P1 |
| TC-A11Y-006 | Text/control/focus contrast in all states/themes | WCAG AA contrast passes | P1 |
| TC-A11Y-007 | Meaningful/decorative images, video, audio and animation | Alt/captions/transcripts and semantics meet approved policy | P0 |
| TC-A11Y-008 | Reduced motion, high contrast, increased text and touch | Motion reduces; layout/content remain usable | P1 |

Current schema permits a non-decorative Media item without alt text. Until validation is implemented, the editorial publication checklist must block meaningful images that lack useful alt text.

### 18.4 Browser, device and responsive compatibility

Admin support matrix:

- Latest two desktop Chrome, Edge and Firefox versions.
- Current Safari on a supported macOS device.
- 1024×768, 1366×768 and 1440×900 viewports.

Public website support matrix:

- Same desktop browsers.
- Current and previous iOS Safari.
- Current and previous Android Chrome.
- Widths 320, 375, 768, 1024, 1440 and 1920 px, with applicable orientations.

Across the matrix test authentication, tenant context, lists/forms, block reorder, media chooser/upload, version view, preview, page routes, navigation, 404/error handling, typography, images/video, animation, slow networks, long words, empty optionals, maximum rows, touch/no-hover and browser console/hydration output.

Exit requirement: all P0/P1 workflows pass on every supported browser; there is no content loss, hydration exception, unusable control or unexplained horizontal overflow at 320 px.

### 18.5 Reliability, resilience and recovery

Proposed initial objectives: public delivery availability 99.9%, Admin 99.5%, successful publish/revalidation pipeline 99.9%, RTO 4 hours, RPO 24 hours maximum with 15 minutes preferred.

| ID | Failure injection | Required result | Pri. |
|---|---|---|---|
| TC-REL-001 | Restart CMS during reads/saves | Committed data valid; incomplete request fails clearly; health recovers | P0 |
| TC-REL-002 | Stop worker after publish, then restart | Durable pending delivery processes after return | P0 |
| TC-REL-003 | Frontend unavailable through retry schedule | Safe errors/retries/final actionable state, no other tenant blocked | P0 |
| TC-REL-004 | Duplicate/concurrent delivery ID across instances | Production requires idempotency; **KNOWN FAIL/RISK:** current replay memory is per process and worker claims are not proven atomic | P0 |
| TC-REL-005 | Interrupt PostgreSQL during publication | Page/event/delivery commit atomically or all roll back | P0 |
| TC-REL-006 | Exhaust/sever DB connections | Health 503, safe errors, automatic recovery without repair | P0 |
| TC-REL-007 | Slow/hung revalidation endpoint | 10-second timeout; worker continues other tenants | P1 |
| TC-REL-008 | CMS fails while frontend has cached content | Last valid public content remains; no draft/cross-tenant fallback | P0 |
| TC-REL-009 | Media storage fails | Safe degradation; no falsely public/clean orphan row | P1 |
| TC-REL-010 | Suspend/reactivate tenant | Only that tenant stops/restores, data intact | P0 |
| TC-REL-011 | Conflicting concurrent edits | Lock/version behaviour prevents silent loss | P1 |
| TC-REL-012 | Restore full platform in isolation | Measured RPO/RTO achieved | P0 |

### 18.6 Database, migrations, backup and restore

All destructive, rollback and restore work uses an explicitly disposable database and separate media directory. Never restore over an active environment.

| ID | Test | Required result | Pri. |
|---|---|---|---|
| TC-DB-001 | Empty DB, apply every committed migration in order with schema push off | Complete schema is produced and CMS starts | P0 |
| TC-DB-002 | Upgrade masked/synthetic copy of latest released schema/data | No lost tenant rows, relationships, roles, versions or media references | P0 |
| TC-DB-003 | Compare development-pushed schema with migration-created schema | No missing table, enum, index, FK or constraint | P0 |
| TC-DB-004 | Restart/re-run migration after controlled interruption | Idempotent or safe failure with documented recovery | P1 |
| TC-DB-005 | Measure migration duration/locks at representative volume | Within approved maintenance window; risky rewrite has plan | P1 |
| TC-DB-006 | Down/rollback on disposable DB | Recoverable result or explicitly irreversible with forward-fix plan | P1 |
| TC-DB-007 | Coordinated PostgreSQL + media backup | Same recovery point, encrypted, checked, versioned and access controlled | P0 |
| TC-DB-008 | Restore DB and media into isolated environment | Counts, versions, relationships and file hashes match; smoke passes | P0 |
| TC-DB-009 | PITR before/after selected publication | Observed state matches timestamp and RPO | P1 |
| TC-DB-010 | Privacy subject deletion/anonymization plus backup ageing | Retention and eventual expiry match policy | P1 |
| TC-DB-011 | PostgreSQL 16 and currently used local PostgreSQL 18 matrix | Either one standardized version or both explicitly certified | P1 |
| TC-DB-012 | Least-privilege production DB user/no public trust | App lacks superuser/schema-owner powers not required at runtime | P0 |

Hard database gates:

- `PAYLOAD_DB_PUSH` is off for production and release verification.
- The 24 previously observed development-created block/version tables missing from committed migrations are captured in reviewed migrations.
- A verified, coordinated DB/media backup exists before an upgrade.
- Isolated restore evidence is no older than one quarter.
- Local PostgreSQL 18 versus Docker/CI PostgreSQL 16 is resolved or deliberately included in the compatibility matrix.

### 18.7 Observability and incident readiness

Required telemetry includes request count/latency/status by route, CMS/worker CPU/memory/restarts, DB pool/slow query/lock/storage/PITR health, delivery queue count/age/retries/failures, login failures/lockouts/authorization denials, media failures/scans, per-website synthetic health and certificate/secret expiry.

| ID | Test | Required result | Pri. |
|---|---|---|---|
| TC-OBS-001 | Trace one publish from Admin → DB → worker → frontend | Correlated request/delivery IDs across all stages, no secret leak | P0 |
| TC-OBS-002 | Trigger controlled 401/403/404/409/429/500 | Safe structured logs distinguish expected errors from incidents | P1 |
| TC-OBS-003 | Trigger failed revalidation, DB health failure and repeated login failure | Correct alert reaches on-call with site context and runbook | P0 |
| TC-OBS-004 | Valid per-site synthetic checks plus invalid-binding probes | Correct sites succeed; invalid calls remain non-enumerating | P1 |
| TC-OBS-005 | Search logs/traces for credentials and excessive PII | Zero secret exposure and minimal/redacted personal data | P0 |
| TC-OBS-006 | Resolve simulated incident | Alert recovery, acknowledgement and timeline are retained | P1 |

Initial alert candidates: health failure for two consecutive minutes; 5xx >2% for five minutes; ready delivery older than 60 seconds or any final failure; DB pool >80% for ten minutes; disk >80%; certificate expiry <14 days; suspicious login failures above baseline. Operations must approve exact thresholds.

### 18.8 Privacy and data governance

In-scope personal/client data includes account names/emails, login/session activity, public/contact data, content requests, audit actor snapshots, uploaded media and personal data embedded in editable content.

| ID | Test | Required result | Pri. |
|---|---|---|---|
| TC-PRIV-001 | Build data inventory with purpose, owner, retention and recipient | Every field/store has approved treatment | P1 |
| TC-PRIV-002 | Client A browses/exports data | Only authorized Client A data; no Client B records | P0 |
| TC-PRIV-003 | Export a synthetic subject | Complete and readable without unrelated tenant data | P1 |
| TC-PRIV-004 | Correct, suspend, anonymize and erase synthetic subject | Approved workflow works and preserves only required audit evidence | P1 |
| TC-PRIV-005 | Inspect expired records, media, indexes, logs and backups | Retention/expiry matches documented policy | P1 |
| TC-PRIV-006 | Inspect test/staging content | Synthetic or approved masked data only | P0 |
| TC-PRIV-007 | Inspect analytics/consent behaviour | Collection waits for required consent and withdrawal is respected | P1 |
| TC-PRIV-008 | Verify media ownership/model consent/license metadata process | Public use has documented rights | P1 |
| TC-PRIV-009 | Privacy/security incident drill | Notification/escalation timeline and roles work | P1 |

Because several core records and Activity Events cannot be deleted through normal UI, a reviewed anonymization/erasure process must define how privacy rights and audit integrity coexist.

### 18.9 Contract, runtime and upgrade compatibility

| ID | Test | Required result | Pri. |
|---|---|---|---|
| TC-COMP-001 | Validate every public response against contract v1 | Fields, enums, nullability and website key agree | P0 |
| TC-COMP-002 | Current CMS with current and previous supported frontend artifacts | Compatible throughout approved rolling-deploy window | P0 |
| TC-COMP-003 | Unknown blocks, extra fields and missing optional fields | Frontend remains safe; unsupported value is observable | P1 |
| TC-COMP-004 | Deliberately breaking contract in test branch | CI fails clearly before incompatible deploy | P0 |
| TC-COMP-005 | Every frontend × claimed block/field | Support requires stored + delivered + rendered evidence | P0 |
| TC-COMP-006 | Pinned Node/pnpm/Next/Payload/PostgreSQL versions | Types, tests, migration and production builds pass | P1 |
| TC-COMP-007 | Rotate credentials through supported rollout | No cross-site acceptance or unplanned outage | P0 |
| TC-COMP-008 | Old bookmarks, normalized/nested slugs and archives | Deterministic routes/intentional 404s | P1 |
| TC-COMP-009 | Upgrade Payload/Next/shared contracts on branch | Migration, Admin, DTO, frontend and rollback/recovery pass | P1 |

## 19. Exploratory testing charters

Time-box each charter to 45–90 minutes. Record tester, build, data, notes, screenshots/trace, risks and resulting tests/defects.

| Charter | Mission | Heuristics/data |
|---|---|---|
| EXP-01 Tenant escape | Attempt to see or mutate another client by every visible and direct route | IDs, filters, relations, versions, cookies, tabs, stale URLs |
| EXP-02 Interrupted authoring | Explore refresh, logout, network loss, crash and tenant switch during edits | Draft/autosave/lock/back-button/multi-tab |
| EXP-03 Content extremes | Break layouts and validation with empty, huge, Unicode and hostile content | emoji, RTL, long word, HTML, max rows, null media |
| EXP-04 Media abuse | Explore wrong types, corrupted files, replacements and deletion while referenced | MIME spoof, 0-byte, EXIF, huge dimensions, video/PDF-as-image |
| EXP-05 Preview boundary | Attempt to escape signed preview or poison public cache | expiry, replay, copied URL, modified slug/site, logout |
| EXP-06 Publication failure | Interrupt every step from transaction through cache refresh | DB down, worker down, bad secret, timeout, retry/replay |
| EXP-07 New client | Follow only the developer guide to onboard an unfamiliar synthetic site | ambiguity, missing secret, duplicate key, two sites/tenant |
| EXP-08 Frontend truth | Change every visible CMS field and classify actual effect | stored/delivered/rendered/hardcoded/fallback |
| EXP-09 Accessibility | Operate as keyboard/screen-reader/zoom/reduced-motion user | focus, error recovery, reorder, animation, media |
| EXP-10 Operations | Diagnose stale content using only intended dashboards/runbooks | request ID, delivery status, cache, log redaction |

Use SFDPOT (Structure, Function, Data, Platform, Operations, Time), CRUD, FEW HICCUPPS and tours (feature, data, error, configuration, claims) to expand observations into reproducible cases.

## 20. Regression and change-impact strategy

### 20.1 Suite definitions

| Suite | When | Maximum intent | Required contents |
|---|---|---|---|
| Commit | Every developer change | Minutes | lint/types, affected unit/component/contract tests |
| Pull-request | Every PR | Fast feedback | all unit/contract, clean migration, four-tenant integration, builds, critical Chromium smoke |
| Daily/nightly | At least nightly on active branch | Broad risk | all API/RBAC, full E2E, both frontends, browser subset, accessibility, worker failures |
| Release candidate | Each immutable candidate | Complete evidence | entire P0/P1 matrix, all supported browsers, NFR, upgrade/restore and UAT |
| Production smoke | Immediately after release | Safe confirmation | health, exact site identity, one public page/site, queue/alerts; no destructive write |

### 20.2 Impact rules

| Changed area | Mandatory regression |
|---|---|
| Access policy, hook or collection | Full role × tenant matrix, direct-ID and relationship attacks |
| DTO/contract/client package | Every public endpoint and both frontend families |
| Block schema/renderer | Block contract, versions, both claimed renderers, visual/responsive/a11y |
| Authentication/proxy/origin | Login/status/lockout/logout/cookies/canonical-host/CSRF |
| Page/post publication | transaction, version, audit, delivery, worker, exact site freshness |
| Website/secret config | full token matrix, preview, revalidation and rotation |
| Database schema/migration | empty create, upgrade, schema diff, backup/restore |
| Worker/revalidation | retries, fairness, replay, timeout, multi-site and outage recovery |
| Media | MIME/size/scanner, cross-tenant, public filtering, derivatives and restore |
| Frontend route/cache | route matrix, preview/public separation, revalidation and fallback masking |
| Dependency/runtime upgrade | clean install, all automation, build, migration, browser smoke and NFR delta |

Rules:

- Every fixed defect receives an automated regression test at the lowest effective layer when feasible.
- Flaky tests are defects: quarantine only with owner, reason, expiry and preserved coverage.
- A retry may diagnose flakiness but must not turn a first-run failure into a passing release gate silently.
- Update snapshots only after a human reviews the semantic change.
- Use mutation testing selectively on access rules, transition logic and signatures to prove assertions can detect incorrect code.
- Use schema/property-based or fuzz testing for slugs, URLs, nested blocks and API parsers within safe limits.

## 21. Requirements traceability matrix (RTM)

The live RTM may be maintained in the test-management system, but this document defines its mandatory structure.

| Requirement family | Acceptance focus | Representative tests | Automation target |
|---|---|---|---|
| REQ-AUTH | Two roles, active status, safe sessions | TC-AUTH-001–012, TC-SEC-008–009 | Unit + integration + E2E |
| REQ-TEN | Strict tenant isolation and lifecycle | TC-TEN-001–012, TC-E2E-003/007 | 100% automated P0 matrix |
| REQ-USR | Super-managed users; client self-only | TC-USR-001–011 | Integration + E2E |
| REQ-WEB | Correct site provisioning/binding | TC-WEB-001–012 | Integration + E2E |
| REQ-CONT | Pages/posts/drafts/versions/blocks | TC-PAGE, TC-BLK, TC-POST | Unit + contract + integration + selected E2E |
| REQ-MEDIA | Authorized validated delivery | TC-MED-001–015 | Integration + security + rendering |
| REQ-NAV | Manual/automatic navigation | TC-NAV-001–016 | Contract + E2E |
| REQ-SET | Scoped settings and mapped site effects | TC-SET-001–012 | Contract + E2E |
| REQ-REQ | Content Request state machine | TC-REQ-001–020 | Unit + integration + E2E |
| REQ-AUD | Immutable attributable events | TC-AUD-001–007 | Integration |
| REQ-PUB | Atomic publish and correct cache freshness | TC-REV, TC-E2E-001/005/006 | Integration + E2E |
| REQ-API | Versioned, bound, non-enumerating public API | TC-API-001–019 | Contract + integration |
| REQ-PREV | Signed isolated five-minute drafts | TC-PRE-001–012 | Integration + E2E |
| REQ-C01 | Generic frontend route/block support | TC-C01-001–020 | Component + E2E |
| REQ-D360 | DGTL designed Home/service support | TC-D360-001–023, TC-ENQ | Contract + E2E |
| REQ-NFR | Security/performance/a11y/recovery/privacy | Section 18 | Specialist + automated gates |
| REQ-OPS | Migration, monitoring and release operations | TC-DB, TC-OBS and Section 27 | CI + rehearsal |

Every detailed RTM row must contain:

| Requirement ID | Requirement/acceptance criterion | Source/owner | Role | Tenant/site | Test IDs | Environment | Automation | Result/evidence | Defect/waiver |
|---|---|---|---|---|---|---|---|---|---|
| _example_ | Client A cannot read B page | Product/Security | Client Admin | A→B | TC-E2E-003 | CI/staging | Yes | _link_ | _ID or none_ |

Coverage gates:

- 100% of P0/P1 requirements have a test and result.
- Every permitted action has a positive test; every trust boundary has a negative test.
- Every role × collection × action combination has an explicit outcome.
- Every public endpoint has valid, missing, wrong, wrong-site and inactive-binding cases.
- Every editable field/block claimed by a frontend has stored, delivered and rendered evidence.
- Every defect maps to a requirement/test and a regression case before closure.

## 22. Defect management

### 22.1 Lifecycle

```text
New → Triage → Accepted → In Progress → Ready for QA → Retest → Verified → Closed
                                                          └────────────→ Reopened
```

Other triage outcomes are Duplicate, Cannot Reproduce, Expected Behaviour, Deferred and Rejected. Each requires a reason and accountable owner.

### 22.2 Severity

| Severity | Definition and examples | Release effect |
|---|---|---|
| Critical / S0 | Cross-tenant disclosure/write, auth bypass, exposed secret, unrecoverable corruption, wrong client invalidated | Stop test/release; security/incident escalation |
| High / S1 | Login/publish/core site unavailable, draft public, migration incomplete, no safe recovery | Release blocked |
| Medium / S2 | Important block/workflow/browser failure with safe workaround | Fix or signed time-limited waiver |
| Low / S3 | Cosmetic/minor inconvenience without accessibility or workflow impact | May defer with owner/target |

Severity describes impact; priority describes repair order. They can differ.

### 22.3 Required defect report

```markdown
# BUG-{number}: concise observable title

- Requirement/test ID:
- Build/commit and contract version:
- Environment, browser/device:
- Role, tenant and website:
- Preconditions/test data:
- Reproduction steps:
  1.
  2.
  3.
- Expected result:
- Actual result:
- Reproducibility: always/intermittent/count
- Severity / priority:
- Security, privacy or data-loss classification:
- Screenshot/video/trace/request ID/sanitized logs:
- Workaround:
- Suspected scope (do not present as proven cause):
- Owner / target release / waiver expiry:
- Retest result and regression-test link:
```

Sensitive tenant/security findings use the restricted incident channel; do not place secrets, exploit details or client data in a public board.

## 23. Test execution and reporting

### 23.1 Per-cycle workflow

1. Identify immutable build SHA, contract version and migration set.
2. Confirm environment/readiness and disposable data safeguards.
3. Run static/commit gates.
4. Run P0 smoke and tenant/token isolation first.
5. Execute changed-area and full planned suites.
6. Log defects immediately with evidence; triage daily.
7. Retest fixes, run mapped regression and update RTM.
8. Publish daily status until exit criteria are met.
9. Archive sanitized evidence under the release ID.

### 23.2 Daily status template

```markdown
# QA Daily Status — {release/build} — {date}

- Environment health:
- Scope executed today:
- Planned / run / pass / fail / blocked / skipped:
- New Critical/High/Medium/Low defects:
- Retests and closed defects:
- Tenant-isolation status:
- Publish/revalidation status by frontend:
- Key evidence:
- Blockers and owner:
- Risks/decisions needed:
- Next execution focus:
```

### 23.3 Quality metrics

Report trends, not raw counts alone:

- Requirements coverage and P0/P1 coverage (target 100%).
- Role × tenant × collection × action coverage.
- Block/field stored-delivered-rendered coverage per frontend.
- Planned/executed/pass/fail/blocked/skipped counts.
- First-run CI pass rate, median duration and flaky rate (target <1%).
- Automated test distribution and meaningful assertion coverage.
- Open defects by severity, age and component; reopen and escape rate.
- Mean time to detect/resolve P0/P1 defects.
- API p95/p99 latency, 5xx rate and contract failure count.
- Revalidation success rate, p95 live time and oldest delivery age.
- Accessibility findings by severity and supported-browser status.
- Web vitals/performance delta from accepted baseline.
- Backup/restore measured RPO and RTO.

Metrics guide decisions and improvement; do not reward high test counts with weak assertions.

## 24. User acceptance testing (UAT)

UAT validates business usefulness after system testing; it does not replace engineering, security or regression tests.

### 24.1 UAT entry criteria

- System-test exit criteria are satisfied.
- A release candidate, migration set and environment are frozen.
- Synthetic/approved UAT accounts and reset instructions are available.
- User guide explains current two-role model and known frontend differences.
- No P0/P1 defect blocks the relevant workflow.

### 24.2 Super Admin acceptance script

1. Log in as `company-super-admin` in a clean browser context.
2. Create and activate a synthetic tenant.
3. Create and activate its website record with a unique binding.
4. Configure exposed settings and header/footer navigation.
5. Create Home and a second page using only blocks supported by the chosen frontend.
6. Create and assign one Client Admin.
7. Confirm the user cannot see company-only secrets.
8. Observe the client's publication Activity Event and delivery.
9. Diagnose one deliberately failed delivery and confirm the runbook is usable.
10. Confirm another tenant/site is unchanged.

### 24.3 Client Admin acceptance script

1. Log in separately as an assigned active `client-admin`.
2. Confirm only the assigned tenant/site/content is visible.
3. Edit a page title, Hero text, font and supported image.
4. Save a draft and confirm the live website has not changed.
5. Open signed preview using the supported flow and exit it.
6. Publish and confirm live change within the approved target.
7. Review page versions and restore an earlier version.
8. Update supported navigation/settings content.
9. Submit/cancel or approve a Content Request at allowed states.
10. Attempt to open another tenant and company-only areas; verify denial.

### 24.4 Visitor acceptance script

1. Open Home and every claimed dynamic route without CMS credentials.
2. Confirm only published, unarchived content appears.
3. Use navigation, links, contact/enquiry path and 404 page.
4. Test phone/desktop, keyboard, zoom and reduced motion.
5. Confirm page metadata and meaningful media are correct.
6. Confirm no Admin, draft, token or client-private data appears in HTML/network/console.

### 24.5 UAT exit

- DGTL Super Admin representative signs the provisioning/operations workflow.
- Representative Client Admin signs authoring/preview/publishing within their scope.
- Product Owner accepts requirement coverage, current limitations and agreed waivers.
- No open UAT blocker remains.

## 25. Verified known gaps and expected-failure register

These items were identified from the current implementation baseline. A test that reproduces one is an **expected failure/known defect**, not a product pass. Reconfirm on the exact release build and link the real defect ID.

| Gap ID | Current observation | User/business effect | Severity proposal | Required decision/remediation |
|---|---|---|---|---|
| GAP-001 | The public media Route Handler exists and passes local 200/206/tenant-isolation probes, but the unanchored `.gitignore` rule `media/` excludes its source directory | A normal clean checkout or deployment can omit the working handler and break every CMS image/video | Critical/High | Unignore and commit the intended handler, then certify media from a clean checkout/build artifact |
| GAP-002 | Client 01 renderer implements 11 of 16 Page blocks | Five Admin-selectable blocks disappear silently | High | Constrain allowed blocks per frontend or implement renderer/visible warning |
| GAP-003 | DGTL360 routes only `/` and `/services/[slug]` | Ordinary CMS pages such as `/new-slug` return 404 | High if general pages promised | Add catch-all/template routes or explicitly limit product |
| GAP-004 | Posts lack public endpoint, frontend route and signed preview | Published Posts cannot be consumed by supplied sites | Medium/High | Implement full delivery path or remove feature claim |
| GAP-005 | Page Admin has no configured Preview/Live Preview button | Editors cannot discover/use existing preview API normally | Medium | Add authorized Admin control and E2E flow |
| GAP-006 | Tenant suspension blocks public binding but appears not to revoke client CMS content access | Suspended client may still author content | Critical/High | Enforce status in Admin/API access and revoke sessions |
| GAP-007 | Client self-update appears able to change own status | Account state can become inconsistent/self-disabled | High | Server-protect status and regression test |
| GAP-008 | Tenant notes field access may test role-field presence rather than actual company role | Possible private company notes exposure | Critical/High | Correct field access and add direct API tests |
| GAP-009 | Website homepage lacks explicit same-tenant relationship hook | Cross-tenant relationship/data integrity risk | High | Add same-tenant validation |
| GAP-010 | Navigation children delivered but ignored by both UIs | Nested navigation configured in CMS is invisible | Medium | Render children or constrain Admin model |
| GAP-011 | Several settings/branding fields are omitted from public DTO | Admin changes appear to save but never affect site | Medium | Map deliberately or label fields as stored-only |
| GAP-012 | Maintenance setting/status is not enforced in current public flow | Site remains publicly available | High if relied on | Define and implement maintenance behaviour |
| GAP-013 | Image relationship usage can select video/PDF | Broken rendering/runtime errors | High | Add media-type relationship validation and safe renderer fallback |
| GAP-014 | Revalidation replay protection is process-local | Duplicate invalidation possible after restart/multi-instance | High | Use shared durable idempotency store |
| GAP-015 | DGTL360 local fallback can hide a broken CMS connection | Operators think CMS is connected while old/local data displays | High | Visible health/telemetry and explicit fallback policy |
| GAP-016 | Current docs may say Client Admin can invite/manage users, but effective policy is self-only | Testers expect an impossible workflow | Medium | Align product decision, UI and documentation |
| GAP-017 | Schema push produced tables absent from committed migrations | Fresh/release DB may be incomplete | Critical | Commit reviewed migrations; test with push disabled |
| GAP-018 | CI omits lint and existing browser E2E | Defects can merge despite available checks | High | Add mandatory CI gates |
| GAP-019 | DGTL360 lives outside this repository's CI | CMS contract changes can break Client 02 unnoticed | High | Add cross-repo/consumer contract pipeline |
| GAP-020 | Local filesystem media, incomplete coordinated backup and no demonstrated PITR | Data/file recovery not proven | Critical for production | Managed storage plus verified DB/media restore |
| GAP-021 | No demonstrated production MFA/WAF/rate limiting/CSP/central monitoring | Security/operations readiness incomplete | Critical/High | Implement and verify before public production |
| GAP-022 | Client-controlled media scan status/no byte-level malware proof | Unsafe upload may become public | Critical/High | Trusted scanning pipeline and immutable result |
| GAP-023 | Header CTA, footer kicker and some labels are hardcoded | Not every visible string is CMS-editable | Medium | Map fields or state design boundary explicitly |
| GAP-024 | Normal Website record creation does not deploy frontend/DNS/secrets | “Create website in CMS” is not end-to-end provisioning | High expectation risk | Build orchestration/wizard or document engineering steps |
| GAP-025 | Missing revalidation URL/secret can throw before delivery error accounting | One bad site can leave work pending and abort/starve a worker cycle | High | Catch per delivery, increment/store failure and continue batch |
| GAP-026 | Last-admin safeguard covers delete but not all suspension/assignment-removal paths | Tenant can be left without an active Client Admin | High | Centralize invariant across delete/update/status/assignment hooks |
| GAP-027 | Unknown blocks are silently omitted by mapper/renderer | Content disappears without editor/operator warning | Medium | Add compatibility validation, metrics and visible diagnostics |
| GAP-028 | Client can currently complete an `in-progress` request directly | Explicit company-to-client review handoff may be bypassed | Medium | Product decision, then actor-specific transition enforcement/tests |
| GAP-029 | Moving a published Page back to Draft creates no revalidation delivery; the CMS API hides it but the frontend continues serving its cached published representation | Draft/unapproved content can remain publicly accessible after unpublish | Critical | Enqueue invalidation for every public-to-non-public transition, make it durable, and add an end-to-end publish → unpublish → 404 regression test |

Known limitations must have an owner, planned resolution/review date, affected requirements, workaround and Product/Security acceptance where applicable.

## 26. New-client certification checklist

A new website is not certified merely because a Website row exists.

### 26.1 Platform and binding

- [ ] Tenant key, site key and domain are unique and approved.
- [ ] Tenant and Website are active only after review.
- [ ] Frontend deployment exists and health endpoint reports the expected website key.
- [ ] Server-only read token matches exactly one CMS binding.
- [ ] Preview and revalidation secrets are unique per website.
- [ ] Allowed origin/domain configuration is exact.
- [ ] Secrets are stored in approved environment/secret manager, never browser code or Git.
- [ ] Rotation and rollback procedure is recorded.

### 26.2 Content model and rendering

- [ ] Homepage and route strategy are defined for this frontend family.
- [ ] Every allowed block has stored-delivered-rendered evidence.
- [ ] Unsupported blocks are unavailable or clearly warned, never silently lost.
- [ ] Navigation, settings and SEO field mappings are documented.
- [ ] CMS media delivery works for every claimed type and derivative.
- [ ] Hardcoded/fallback content is intentionally approved.
- [ ] Draft preview and public-cache separation work.
- [ ] Publish/revalidation updates only this frontend.

### 26.3 Roles, operations and quality

- [ ] Super Admin can provision/configure according to current policy.
- [ ] Client Admin sees/changes only assigned content and cannot create users/websites.
- [ ] Another-tenant attack suite passes 100%.
- [ ] Browser, responsive and accessibility matrices pass.
- [ ] Performance budgets pass with representative page/media data.
- [ ] Synthetic health, delivery-age and failure alerts are active.
- [ ] Database/media backup and isolated restore include the new client.
- [ ] UAT and final release sign-off are complete.

## 27. Release and production verification

### 27.1 Pre-release checklist

- [ ] Release SHA/artifacts and migration set are immutable.
- [ ] CI uses frozen install and produces clean generated types.
- [ ] Lint, typecheck, unit, component, contract, integration and E2E gates pass.
- [ ] Empty migration and upgrade rehearsal pass with schema push off.
- [ ] P0/P1 tests and traceability are 100% complete.
- [ ] Tenant/token/preview/revalidation security matrices pass.
- [ ] Both frontend families pass claimed route/block/field matrices.
- [ ] Performance, accessibility, browser and resilience gates pass.
- [ ] Coordinated DB/media backup is verified; rollback/forward-fix approved.
- [ ] No open Critical/High defect; every waiver is signed and time-limited.
- [ ] Dashboards, alerts, synthetic checks and on-call runbooks are ready.

### 27.2 Deployment verification order

1. Confirm backup/PITR point and maintenance/communications plan.
2. Apply reviewed migrations once, with schema push disabled.
3. Deploy CMS and verify health/schema/version.
4. Deploy/start worker and confirm it does not claim wrong/stale jobs.
5. Deploy compatible frontends and verify exact site identities.
6. Execute read-only public API token-binding probes.
7. Execute one approved canary publication or controlled revalidation per frontend family.
8. Check Activity Event, delivery success, site freshness, error rate and queue age.
9. Confirm other tenants did not change.
10. Record release evidence and keep rollback decision window open.

### 27.3 Production smoke boundaries

Production smoke is safe and minimal: health, exact public site identity, representative published routes, headers/metadata, synthetic token binding, queue/dashboard status and an explicitly approved canary. Never run destructive, fuzz, brute-force, load, migration-down, cross-tenant exploit or real-client data mutation tests in production.

### 27.4 Release sign-off template

```markdown
# Release Quality Sign-off

- Release/version:
- Commit SHA/artifact IDs:
- Content contract version:
- Migration set/checksum:
- Environment and test window:
- QA Lead:

## Results
- Planned / executed / passed / failed / blocked / skipped:
- P0/P1 requirement coverage:
- Automated gate status:
- Tenant-isolation and token matrix:
- Client 01 route/block/field result:
- DGTL360 route/block/field result:
- Security/accessibility/performance/browser result:
- Migration and DB/media restore result:
- Revalidation queue and alert result:

## Open risks and waivers
| Defect | Severity | Risk | Compensating control | Owner | Expiry | Approver |
|---|---|---|---|---|---|---|

## Decision
- [ ] Approved
- [ ] Conditionally approved
- [ ] Rejected

- Product Owner / date:
- QA Lead / date:
- Engineering Lead / date:
- DevOps/SRE / date:
- Security / date:
- DGTL Super Admin representative / date:
- Client representative / date:
```

## 28. Evidence pack and test deliverables

Each release evidence pack must contain:

1. Approved requirements baseline and completed RTM.
2. Environment manifest: URLs, versions, topology and sanitized configuration checksums.
3. Test-data manifest and cleanup confirmation.
4. Unit/component/contract/integration/E2E results in machine-readable and readable form.
5. Clean migration, upgrade and schema-comparison evidence.
6. Browser traces, screenshots/videos and console/network output for critical stories.
7. Tenant-isolation and token Cartesian-matrix results.
8. Per-frontend stored-delivered-rendered compatibility matrix.
9. Performance report with percentiles, resources and baseline comparison.
10. Accessibility automated output plus manual keyboard/screen-reader notes.
11. Security scan summary and restricted references to sensitive findings.
12. Backup/media restore report with measured RPO/RTO and representative hashes.
13. Observability/alert test results and current runbook links.
14. Defect summary, waivers and regression-test mappings.
15. UAT records and signed release decision.

Evidence rules:

- Name artifacts with release ID, commit SHA, environment, suite and timestamp.
- Capture the browser URL, role and visible client context where useful, but redact personal/client secrets.
- Prefer request/delivery IDs over copying entire sensitive payloads.
- A screenshot alone is not proof of database/API isolation; pair UI evidence with response or query evidence.
- Preserve failure evidence according to retention policy; clean synthetic sessions, tokens, callbacks, files and databases after the run.
- Store immutable final reports; do not overwrite an earlier failed run with a rerun.

## 29. QA team kickoff roadmap

This sequence turns the strategy into work. Duration depends on team size; exit evidence, not calendar time, controls progression.

### Sprint/Week 1 — Baseline and safe laboratory

- QA Lead approves two-role and frontend-capability baseline with Product/Engineering.
- DevOps creates disposable PostgreSQL/media environments and production-like staging.
- QA Data Engineer implements four-tenant synthetic fixtures and cleanup guards.
- Automation Engineers add lint, existing E2E, result artifacts and schema-push-off migration gate to CI.
- Security owner begins secret/dependency scan and threat review.
- Deliverables: environment sign-off, test data, RTM v1, risk/known-gap register.

### Sprint/Week 2 — Functional and authorization foundation

- Automate role × tenant × collection × action matrix.
- Execute authentication, users, tenants, websites, Pages, Posts and relationship attacks.
- Add contract coverage for public API, preview and revalidation signatures.
- Triage GAP-001, GAP-006–009, GAP-017 and GAP-029 first because they affect data/security/release reproducibility.
- Deliverables: P0 functional report, updated defects and regression suite.

### Sprint/Week 3 — Full cross-system stories

- Automate Super Admin provisioning and Client Admin edit/preview/publish.
- Certify Client 01 routes and all 11 renderer blocks.
- Certify DGTL360 Home and service routes; explicitly test unsupported general pages.
- Exercise worker success/retry/outage, simultaneous tenants and credential rotation.
- Deliverables: Playwright traces, frontend capability matrices and publication-freshness report.

### Sprint/Week 4 — Production readiness

- Execute browser/responsive, accessibility, performance and security suites.
- Rehearse release migration, coordinated backup, isolated restore and incident alerts.
- Complete UAT using Super Admin and Client Admin scripts.
- Review every known gap/waiver; issue Approved, Conditionally Approved or Rejected decision.
- Deliverables: final evidence pack and signed release-quality report.

### Continuous after first release

- Run PR, nightly and production-smoke suites at their defined cadence.
- Review flaky tests, escaped defects, performance and delivery trends weekly.
- Test restore at least quarterly and credentials before expiry/rotation.
- Re-certify a frontend whenever its contract, route model, supported blocks or design mapping changes.
- Feed incident findings into new regression cases and threat/risk updates.

## 30. Definition of done for QA

A feature is QA-complete only when:

- [ ] Acceptance criteria and source-of-truth are approved.
- [ ] Positive, negative, boundary, state and authorization tests exist as applicable.
- [ ] Unit/contract/integration/E2E coverage is placed at the lowest effective layers.
- [ ] Tenant and website isolation are explicitly proven.
- [ ] Database migration and rollback/forward-fix impact are covered.
- [ ] Accessibility, responsive, security, performance and observability impact are assessed.
- [ ] Documentation and frontend capability claims match actual behaviour.
- [ ] All results and sanitized evidence are linked in the RTM.
- [ ] Defects are fixed/retested or have approved time-limited waivers.
- [ ] No Critical/High issue remains for release.
- [ ] Product/QA/Engineering/Operations/Security sign-off is complete where required.

## 31. Reference inventory

Implementation and current supporting documentation inspected for this baseline:

- `apps/cms/src/collections/` — current collection schemas and access configuration.
- `apps/cms/src/access/` — effective role and transition policies.
- `apps/cms/src/hooks/` — tenant validation, publication events and deliveries.
- `apps/cms/src/blocks/index.ts` — 16 Page blocks and Post-supported block subset.
- `apps/cms/src/services/public-api.ts` — public authorization and DTO mapping.
- `apps/cms/src/jobs/revalidation.ts` — worker batching, timeout and retry schedule.
- `apps/cms/src/app/api/dgtl/` — public, preview and management routes currently present.
- `apps/website/` — reusable Client 01 frontend and block renderer.
- `packages/cms-client/` and `packages/content-contracts/` — server client and DTO contracts.
- `.github/workflows/ci.yml` and root `package.json` — current automated gates/scripts.
- `docs/NEXTJS_CMS_CONNECTION_GUIDE.md`, `docs/operations.md`, security/architecture documents — intended integration/operations guidance.
- `C:\Users\Nipuna\Documents\ChatGPT\DGTL360` — current Client 02 frontend inspected as an external consumer; it is outside this repository's CI.
- `C:\Users\Nipuna\Pictures\New folder\DGTL_CMS_MVP_4_Clients.md` and `Userflow_cms.md` — historical/reference requirement inputs only; their older multi-role descriptions are not the current effective policy.

The team must refresh this inventory whenever code, configuration, connected frontend or approved product requirements change.

## 32. Glossary

| Term | Meaning in this plan |
|---|---|
| CMS | Payload-based content management backend/Admin |
| Tenant | A client-company security/data boundary |
| Website | A CMS binding for one independently deployed frontend/site identity |
| Super Admin | DGTL company-wide `company-super-admin` |
| Client Admin | Tenant-scoped `client-admin`; current CMS User access is self-only |
| DTO | Public, versioned data object delivered from CMS to frontend |
| Draft | Non-public editable content version |
| Preview | Signed, time-limited, no-store access to a specific draft |
| Publish | Transition that makes valid content public and queues cache refresh |
| Revalidation | Signed request that invalidates the intended frontend cache |
| RPO | Maximum acceptable recoverable data-loss window |
| RTO | Maximum acceptable restoration time |
| P0/P1/P2/P3 | Execution/release priority, from blocker to lower risk |
| S0/S1/S2/S3 | Defect impact severity, from critical to low |
| RTM | Requirements Traceability Matrix |
| UAT | User Acceptance Testing by business representatives |
| Stored | Value persists in CMS/database |
| Delivered | Value is included in public API/DTO |
| Rendered | A particular frontend visibly/semantically uses the delivered value |

---

**Document control:** Changes to roles, tenant isolation, public contracts, migrations, media delivery, preview, revalidation or frontend capability claims require QA Lead review and a version update to this plan.

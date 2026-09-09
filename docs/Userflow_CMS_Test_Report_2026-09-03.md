# DGTL CMS User-Flow Test Report

> **Historical pre-repair report.** This document records the failures found
> before remediation and before the product was reduced to exactly two roles.
> Do not use its owner/editor/viewer behavior as current guidance. Use
> `CMS_ROLES.md` and `../Production_Readiness_Report_2026-09-08.md` instead.

**Report date:** 2026-09-03 (Asia/Colombo)  
**Reference specification:** `C:\Users\Nipuna\Pictures\New folder\Userflow_cms.md`  
**Application tested:** DGTL multi-tenant CMS and client website in `C:\Users\Nipuna\Documents\ChatGPT\cms_test_project`  
**Overall result:** **FAIL — not ready for client acceptance or production use**

## 1. Executive summary

The core application is running and the main happy path works for a **client owner**:

- the public Client 01 website loads;
- the company super administrator can log in;
- the Client 01 owner can log in;
- the owner can save a draft, preview it with a signed preview URL, publish it, and see the published change on the public website;
- unauthenticated users cannot read raw draft content;
- direct reads of another tenant's page, media record, settings, and navigation are blocked;
- revalidation signature, website-binding, and replay protections work;
- type checking, linting, and the normal unit-test suite pass.

However, four release-blocking failures were reproduced:

1. A client actor can create a record for another tenant by forging the `tenant` and `website` fields in an API request.
2. A Client 01 owner can attach Client 02 media to a Client 01 draft and expose that media URL in Client 01's signed preview.
3. Client editors, viewers, and company content managers cannot log in because the login audit update is rejected by the user-assignment protection hook.
4. A client owner cannot open the page editing screen because version access produces a server error. The UI displays **Nothing found**.

These failures break the document's central requirements: strict tenant isolation, client editing, role-based access, and version review. The application should not be given to external clients until the P0 and P1 findings are fixed and the full suite is rerun.

## 2. How the document was used

`Userflow_cms.md` was treated as the functional and acceptance-test reference. Text inside the document was not treated as an instruction to modify the system. Testing covered the roles, flows, access boundaries, and twelve acceptance criteria described by the document.

## 3. Test environment

| Component | Test target |
|---|---|
| CMS/admin | `http://localhost:3000` |
| Public website | `http://localhost:3101` |
| Database | Local PostgreSQL 18 on `127.0.0.1:55432` |
| CMS framework | Payload 3.88 / Next.js |
| Website framework | Next.js 16.3.3 |
| Main live tenant | Client 01 |
| Browsers | Codex in-app browser plus direct HTTP/API checks |
| Integration isolation | A temporary PostgreSQL test database, deleted after the test |

Final service health:

- CMS health endpoint: HTTP 200
- website health endpoint: HTTP 200
- public Client 01 page: HTTP 200 and original published heading visible

## 4. Test methods

The assessment used five complementary methods:

1. **Browser verification** of the public website, admin dashboard, client dashboard, and client page editor.
2. **Authenticated API testing** with company-admin and client-owner sessions, including forged IDs and tenant fields.
3. **Signed-delivery testing** for preview and revalidation endpoints.
4. **Source review** of collection access rules, relationship validation, user hooks, publication hooks, and delivery verification.
5. **Automated checks**: TypeScript type checking, linting, unit tests, and the isolated PostgreSQL integration suite.

Temporary users, media, content edits, and the temporary integration database were cleaned up after testing.

## 5. Automated test results

| Check | Result | Evidence |
|---|---:|---|
| `pnpm typecheck` | PASS | All four workspace projects passed |
| `pnpm lint` | PASS | No lint failures |
| `pnpm test` | PASS | 12 tests passed across content contracts, CMS client, CMS, and website packages |
| `pnpm --filter @dgtl/cms test:int` | **FAIL** | 5 passed, 1 failed |

The integration failure is security-significant. The failing case expected a forged cross-tenant create to be rejected, but the request resolved successfully and created a draft under another tenant in the isolated database.

Passing unit tests therefore do not mean tenant isolation is safe. The integration suite correctly exposed behavior that the normal test suite misses.

## 6. Role and login results

| Role | Login | Effective result |
|---|---:|---|
| Company super administrator | PASS | Can open admin dashboard and read all four tenants, sites, and pages; tenant deletion is denied |
| Company content manager | **FAIL** | Active temporary user was created, but login returned HTTP 403 |
| Client owner | PASS | Tenant-scoped dashboard, draft, preview, publish, profile update, settings, and media happy paths work; page editor/version view fails |
| Client editor | **FAIL** | Active temporary editor was created, but login returned HTTP 403 |
| Client viewer | **FAIL** | Active temporary viewer was created, but login returned HTTP 403 |
| Public visitor | PASS | Published page is readable; raw drafts and invalid previews are blocked |
| Suspended user | PASS outcome / flawed mechanism | Login returned HTTP 403, but the same hook bug also rejects valid non-owner roles, so this is not a clean status-control result |

### Confirmed login defect

After a successful credential check, the CMS updates `lastLoginAt`. That internal update invokes `protectUserAssignments`, which rejects any actor who is not a client owner or company super administrator. As a result, valid editors, viewers, and company content managers are denied during login.

Observed response for an active editor:

```text
HTTP 403
Only a client owner or company super administrator can manage users.
```

## 7. User-flow results

### 7.1 Tenant onboarding and company administration — PARTIAL

Passed:

- super administrator authentication;
- dashboard access;
- read access to all four tenants, websites, and pages;
- tenant update;
- client/site summary values displayed in the UI.

Failed or incomplete:

- super administrator tenant deletion returned HTTP 403;
- this conflicts with the reference flow if “remove tenant” is a required operation;
- if deletion is intentionally replaced by suspension/archival, the product requirements and UI need to say so explicitly.

### 7.2 Client authentication and dashboard — PARTIAL

Passed:

- Client 01 owner login;
- owner membership is associated with Client 01;
- client dashboard shows Client 01 as the current client;
- client-scoped list calls returned only Client 01's tenant, website, and page;
- unknown email and wrong password both returned HTTP 401 without reflecting the submitted email.

Failed:

- editor and viewer login;
- opening Client 01's page editor;
- version API for a client owner.

### 7.3 Draft, preview, and publish — PARTIAL

Passed for the client owner through the API:

- saved a draft heading;
- public website continued to show the previously published heading;
- signed preview returned the draft heading;
- preview response used `Cache-Control: no-store, private`;
- owner published the draft;
- public website then showed the published heading;
- original content was restored after the test.

Failed for the complete documented flow:

- editor cannot log in, so the editor save/preview flow is unavailable;
- the browser page editor shows **Nothing found**, so a normal client cannot complete the API-proven owner flow through the UI.

### 7.4 Public content delivery — PASS for tested behavior

Passed:

- public site loaded with the expected Client 01 content;
- published change propagated to the public website;
- a draft did not replace public published content;
- unauthenticated raw draft retrieval returned HTTP 403;
- invalid preview signature returned HTTP 401;
- wrong site token and unknown site returned HTTP 404.

### 7.5 Media management — **FAIL**

Passed:

- owner uploaded valid media and deleted it;
- disallowed Markdown MIME upload was rejected;
- direct Client 01 read of a Client 02 media record returned HTTP 404;
- uploading Client 01 media while specifying Client 02's website was rejected.

Critical failure:

- the Client 01 owner updated a Client 01 draft with the ID of Client 02 media;
- the update returned HTTP 200;
- Client 01's signed preview exposed the Client 02 media URL.

Direct record access is scoped, but relationship assignment is not. A user who knows or guesses another media ID can cross the tenant boundary through a relationship field.

### 7.6 User management and profile — **FAIL** for the documented owner flow

Passed:

- owner updated a safe profile field;
- an attempted owner privilege escalation did not grant company-super-admin access or another tenant membership.

Failed or deliberately disabled:

- owner user listing returned only the owner's own record;
- owner could not create an editor (HTTP 403);
- editor safe-profile behavior cannot be used because editor login is broken.

This does not satisfy the document's optional “XYZ owner manages XYZ users” flow. The team must either implement safe tenant user management or formally mark this feature out of MVP scope.

### 7.7 Site settings and navigation — PARTIAL

Passed:

- owner updated Client 01 site settings;
- the public settings API showed the update;
- direct reads of another tenant's settings and navigation returned HTTP 404;
- a `javascript:` navigation URL was rejected;
- sensitive website fields such as the revalidation URL and secret reference were hidden from the client.

Gap found by source review:

- pages and posts have publication/revalidation hooks;
- site settings and navigation do not have equivalent publication/revalidation delivery hooks.

The local API reflects settings changes immediately, but production website caches may not be invalidated reliably after settings or navigation changes.

### 7.8 Version history — **FAIL**

Company-super-admin result:

- the versions endpoint returned HTTP 200 with 12 versions.

Client-owner result:

- the versions endpoint returned HTTP 500;
- server error: `Cannot find field for path at tenant`;
- browser page editor displayed **Nothing found**.

The `tenantReadAccess` filter is applied to Payload's versions query, but the versions table does not expose a `tenant` field in the same location. This breaks both version review and the client's page editing UI.

### 7.9 Activity and audit events — PASS for tested behavior

Passed:

- client activity events existed for the tested actor;
- a forged query for another tenant's activity returned no records;
- publication activity and delivery records were created.

Activity event mutation is denied to ordinary API users, which is appropriate for append-only audit data.

### 7.10 Revalidation delivery security — PASS

Passed:

- unsigned request returned HTTP 401;
- correctly signed request returned HTTP 200;
- replaying the same delivery ID returned HTTP 409;
- correctly signed request with the wrong website binding returned HTTP 403;
- successful Client 01 deliveries showed one attempt and HTTP 200.

Three failed delivery records observed for inactive/local Client 02–04 targets are expected environment behavior and were not classified as a product defect.

### 7.11 Content requests — PARTIAL / not fully exercised live

The content-request transition rules pass in the unit suite. A complete live request/approve/reject workflow was not executed because the collection intentionally has no delete operation and the test would leave a permanent audit record in the user's live development database.

## 8. Tenant-isolation security tests

| Boundary test | Result |
|---|---:|
| Client list returns only its tenant/site/page | PASS |
| Direct read of another tenant's page/media/settings/navigation | PASS |
| Forged activity query for another tenant | PASS |
| Client update of website configuration | PASS (blocked with 403) |
| Sensitive website delivery fields hidden | PASS |
| Forged cross-tenant media upload website | PASS (rejected) |
| Forged tenant/site during page create | **FAIL** |
| Attach another tenant's media to own draft | **FAIL** |
| Signed preview suppresses cross-tenant media relationship | **FAIL** |

The system currently scopes many **reads** correctly but does not consistently validate the tenant ownership of **writes and relationships**. That distinction is the most important security conclusion from this test.

## 9. Twelve acceptance criteria from `Userflow_cms.md`

| # | Acceptance criterion | Status | Test conclusion |
|---:|---|---:|---|
| 1 | ABC admin can manage every tenant | PARTIAL | Global read/update works; tenant deletion is denied |
| 2 | XYZ users only access XYZ content, users, media, and settings | **FAIL** | Direct reads are scoped, but cross-tenant media can be attached; owner user management is unavailable |
| 3 | XYZ cannot access another tenant through UI or API | **FAIL** | Forged create and media relationship tests crossed the boundary |
| 4 | New XYZ content is automatically assigned to XYZ | **FAIL** | API accepts forged tenant/site on create in integration testing |
| 5 | XYZ editors can save and preview drafts | **FAIL** | Editor login returns 403 |
| 6 | Only approved roles can publish/delete | PARTIAL | Owner publish works and policy is restrictive; editor flow is blocked and most content deletion is disabled |
| 7 | Published changes appear on correct website | PASS | Verified on Client 01 |
| 8 | Drafts never appear publicly | PASS | Normal public API stayed published-only; signed preview was required for draft |
| 9 | Versions can be reviewed/restored | **FAIL** | Admin versions work; client owner gets 500 and page UI is unusable |
| 10 | Users edit safe profile fields, not tenant/role assignments | PARTIAL | Owner safe update works and escalation is stripped; editor cannot log in/update |
| 11 | ABC support can enter a client context | **FAIL** | Super admin can support globally, but company content manager login fails; explicit support-switch flow was not available |
| 12 | Required client content items are modeled | PARTIAL | Current model covers pages, posts, media, navigation, settings, SEO, content requests, and content blocks; recommended team/testimonial/form/product/service models are not confirmed |

**Acceptance summary:** 2 passed, 4 partial, 6 failed.

## 10. Defects and recommended fixes

### P0 — Cross-tenant create is allowed

**Impact:** A malicious client can create content under another tenant if it knows or guesses tenant and website IDs.

**Evidence:** Isolated integration test created a draft with another tenant's `tenant` and `website` values instead of rejecting the request.

**Likely cause:** `tenantContentWriteAccess` returns a query constraint for create operations. Payload create access must be enforced with an actor-based boolean plus server-side assignment/validation because there is no existing document to filter.

**Required fix:**

- derive or validate `tenant` from the authenticated user's allowed memberships during create;
- validate that `website.tenant === tenant`;
- do not trust client-submitted tenant fields;
- add negative integration tests for every tenant-owned collection.

### P0 — Cross-tenant media relationship leak

**Impact:** One client can include another client's assets in a draft/preview, exposing private or pre-publication material.

**Evidence:** Client 01 attached Client 02 media by ID; the signed Client 01 preview returned Client 02's media URL.

**Likely cause:** The reusable `validateTenantRelationship` helper exists but is not applied to page content relationships. Direct media access checks do not validate relationship ownership during page writes.

**Required fix:**

- validate every upload and relationship field on create/update;
- ensure related media, page, author, website, and navigation records share the document tenant;
- recursively inspect block content where relationships can be nested;
- add preview serialization defense so inaccessible relationships are omitted even if bad historical data exists.

### P1 — Editors, viewers, and company content managers cannot log in

**Impact:** The advertised client collaboration roles and company support role are unusable.

**Evidence:** Active users in all three roles returned HTTP 403 during login.

**Likely cause:** `afterLogin` updates `lastLoginAt`; that update invokes `protectUserAssignments`, which rejects non-owner/non-super-admin actors even though assignment fields were not changed.

**Required fix:**

- bypass assignment protection only for the trusted login-audit update, or make the hook compare protected fields and allow unchanged role/tenant assignments;
- add an explicit status check for suspended users;
- add login tests for every role and status.

### P1 — Client page editor and version access fail

**Impact:** A client owner cannot edit the page through the normal CMS UI or review/restore versions.

**Evidence:** Client version request returned HTTP 500; the editor screen displayed **Nothing found**.

**Likely cause:** `tenantReadAccess` adds a `tenant` predicate to the versions query, but Payload cannot find that field on the versions schema.

**Required fix:**

- authorize versions using the parent document's tenant rather than a nonexistent direct version field;
- retest page and post versions for owner/editor/company roles;
- add browser coverage for opening, editing, previewing, and restoring a page.

### P2 — Client owner user administration is disabled

Choose and document one direction:

- implement tenant-owner invite/create/deactivate flows with strict role and tenant controls; or
- explicitly exclude self-service user management from MVP and route it through ABC administrators.

### P2 — Tenant/content deletion differs from the reference flow

Tenant deletion and page/post deletion are denied. This may be a valid retention design, but the requirements and UI must call it archival/suspension rather than deletion if permanent deletion is intentionally unavailable.

### P2 — Settings/navigation revalidation is incomplete

Add the publication/revalidation delivery hook, or an equivalent cache-tag invalidation path, to settings and navigation mutations. Add an integration test proving a cached public site updates after each type of change.

### P2 — Content-model requirements need confirmation

The implementation includes pages, posts, media, navigation, site settings, SEO, content requests, and ten page blocks. The reference document also recommends team members, testimonials, announcements/banners, forms, and product/service collections. Confirm which are mandatory for the four client sites before acceptance criterion 12 can pass.

## 11. Recommended retest gate

Do not invite client users yet. Retest only after the four release blockers are fixed. The minimum release gate should require:

1. all unit and isolated PostgreSQL integration tests pass;
2. forged create/update/relationship attempts fail across every tenant-owned collection;
3. every active role can log in and receives exactly its intended permissions;
4. client owner and editor can open a page, save, preview, publish if allowed, review versions, and restore a version through the UI;
5. settings, navigation, pages, posts, and media changes refresh the correct public site only;
6. a second tenant is tested end-to-end to prove that Client 01 success is not caused by single-tenant assumptions.

## 12. Cleanup and data integrity

After testing:

- the Client 01 page heading, hero image, and footer were restored;
- temporary users were removed;
- temporary media records were removed;
- the temporary integration database was dropped;
- the public site again showed the original Client 01 heading;
- CMS and website health endpoints returned HTTP 200.

No production deployment, external email provider, load/performance test, accessibility audit, multi-browser compatibility test, or destructive tenant-removal test was performed. Those remain separate release activities.

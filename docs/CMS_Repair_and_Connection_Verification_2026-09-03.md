# DGTL CMS Repair and Connection Verification Report

> **Historical two/three-role implementation record.** The role model described
> below has been replaced. The supported system now has exactly two roles:
> DGTL Super Admin and Client Company Admin. Use `docs/CMS_ROLES.md` for current
> behavior and `Production_Readiness_Report_2026-09-08.md` for current evidence.

**Report date:** 2026-09-03 (Asia/Colombo)  
**Project:** `C:\Users\Nipuna\Documents\ChatGPT\cms_test_project`  
**Reference user-flow:** `C:\Users\Nipuna\Pictures\New folder\Userflow_cms.md`  
**Historical pre-repair report:** `docs/Userflow_CMS_Test_Report_2026-09-03.md`  
**Historical local result:** **PASS for the former role model at that date.**

## 1. Scope and interpretation

The attached Markdown files were treated as reference specifications, not as executable instructions. The test and repair work followed the user's request: analyze the existing project, repair the broken admin/client-editor/client-website connections, run the full local application, and provide an evidence-based report.

This report supersedes the release-blocking conclusions in the historical pre-repair report. It does not claim that the application is production-deployed. It records the repaired and verified local state.

## 2. Executive result

The requested three-part connection works:

```text
Company administrator / Client editor
                |
                v
       Payload CMS :3000
          |             |
          | public API  | revalidation delivery
          v             v
    Client website <-- Worker
         :3101
```

Verified outcomes:

- the company administrator can log in and see the global administration dashboard;
- the Client 01 editor can log in and sees only Client 01 content;
- the editor can open the Client 01 page editor and version list;
- the editor can save drafts but cannot publish;
- the Client 01 owner can publish;
- a draft is not returned on the public website;
- a published page change appears on the Client 01 website and the original content was restored;
- a Client 01 site-settings change appears on the Client 01 website through the delivery worker and was restored;
- a Client 01 navigation change appears on the Client 01 website through the delivery worker and was restored;
- cross-client reads, forged creates, and cross-client media relationships are rejected;
- the CMS, website, and worker can now be started together with one command;
- final CMS health, website health, and public page requests all return HTTP 200.

## 3. Root causes found and repairs made

### 3.1 The three processes were not running together

**Cause:** The CMS, website, and revalidation worker had separate development commands. A stopped or forgotten process made the system appear disconnected.

**Repair:** Added `scripts/dev-all.mjs` and changed the root `pnpm dev` command to start all three processes together. If one child process ends unexpectedly, the runner shuts down the others instead of leaving a misleading partial system running.

**Result:** One local command now starts:

- CMS and Admin at `http://localhost:3000`;
- Client 01 website at `http://localhost:3101`;
- the revalidation delivery worker.

### 3.2 Forged cross-client creates were accepted

**Cause:** Create access used a document query constraint. A create operation has no stored document for that filter to constrain, so a malicious client could submit another tenant and website ID.

**Repair:** Added boolean actor authorization for create operations and a server-side `beforeChange` validator that:

- derives the single allowed tenant when appropriate;
- rejects a tenant outside the actor's owner/editor memberships;
- requires tenant and website values;
- verifies that the website belongs to the selected tenant.

**Collections covered:** pages, posts, media, navigation, site settings, and content requests.

**Result:** The real-PostgreSQL forged-create regression test is rejected.

### 3.3 Cross-client media or page relationships could leak content

**Cause:** Direct record reads were tenant-scoped, but relationship IDs nested in content were not recursively validated during writes.

**Repair:** Added recursive same-tenant relationship checks for media fields and page-link fields, including nested block, array, group, SEO, logo, favicon, and navigation values.

**Result:** Client 01 cannot attach Client 02 media to its own draft. The integration test passes and the known signed-preview leak route is closed at write time.

### 3.4 Valid editor, viewer, and company content-manager logins returned 403

**Cause:** After a successful password check, the CMS updates `lastLoginAt`. The role-assignment protection hook treated that trusted audit update as a prohibited user-management action.

**Repair:** The login audit update now carries a trusted internal context. Safe self-profile updates preserve protected account type, status, tenant assignments, and company roles. A separate `beforeLogin` check explicitly rejects non-active accounts.

**Result:** Real-PostgreSQL tests pass for:

- active client editor login;
- active client viewer login;
- active company content-manager login;
- suspended-user rejection with the correct password.

### 3.5 Client page editor and version requests failed

**Cause:** Normal tenant read filtering added a direct `tenant` predicate to the Payload versions table, where the multi-tenant plugin stores/scopes version tenancy differently.

**Repair:** Added version-specific authorization. It validates that the actor has a permitted tenant membership and allows the multi-tenant plugin to apply its version-tenant boundary.

**Result:** The Client 01 editor opens the page editor and version list without the previous “Nothing found”/HTTP 500 failure. The own-tenant version query returns versions; the other-tenant version query returns zero.

### 3.6 Settings and navigation changes did not refresh the website

**Cause:** Page publication created cache-invalidation deliveries, but site-settings and navigation updates did not.

**Repair:** Added a configuration-change hook that records an activity event and queues a signed revalidation delivery with the website cache tags and `/` path.

**Result:** Live tests changed and restored both the Client 01 footer and header navigation. The worker processed the deliveries and the public page showed each change before restoration.

## 4. Role and permission verification

| Actor | Login | Tenant visibility | Draft/edit | Publish | Final result |
|---|---:|---|---:|---:|---|
| Company super administrator | PASS | All clients | Allowed | Allowed | Global admin dashboard verified |
| Company content manager | PASS | Company-wide by current policy | Allowed | Allowed | Login verified in PostgreSQL integration suite |
| Client owner | PASS | Assigned client only | Allowed | Allowed for own tenant | Live publish and website update verified |
| Client editor | PASS | Assigned client only | Allowed | Rejected with HTTP 403 | UI, API, version, settings, and navigation paths verified |
| Client viewer | PASS | Assigned client only | Read-only | Not allowed | Login verified; write policy is read-only |
| Suspended user | Rejected | None | None | None | Explicit non-active login rejection verified |

Important policy detail: a client editor can prepare content but cannot publish it. This is expected behavior, not a defect. A client owner or company role performs publication.

## 5. End-to-end content evidence

### 5.1 Page workflow

The live Client 01 page test produced these outcomes:

| Check | Result |
|---|---:|
| Editor version API status | HTTP 200 |
| Editor sees versions for Client 01 page | PASS |
| Editor sees versions for another tenant | 0 records — PASS |
| Editor saves draft | PASS |
| Draft visible on normal public website | No — PASS |
| Editor attempts to publish | HTTP 403 — PASS |
| Owner publishes | PASS |
| Published change visible on website | PASS |
| Original page content restored | PASS |

The final restored page has 15 recorded versions. No temporary test heading remains on the public site.

### 5.2 Site-settings workflow

| Step | Result |
|---|---:|
| Client editor authenticated | PASS |
| Client 01 settings read | PASS |
| Temporary footer marker saved | HTTP 200 |
| Revalidation delivery processed | PASS |
| Marker appeared on public website | PASS |
| Original footer restored | PASS |

### 5.3 Navigation workflow

| Step | Result |
|---|---:|
| Client editor authenticated | PASS |
| Client 01 header navigation read | PASS |
| Temporary navigation label saved | HTTP 200 |
| Revalidation delivery processed | PASS |
| Label appeared on public website | PASS |
| Original navigation restored | PASS |

## 6. Tenant-isolation evidence

The disposable PostgreSQL integration suite now contains 12 passing cases:

1. Client 01 lists only its page.
2. Client 02 lists only its page.
3. Client 03 lists only its page.
4. Client 04 lists only its page.
5. A direct page read from another tenant is blocked.
6. An active client editor can log in.
7. An active client viewer can log in.
8. An active company content manager can log in.
9. A suspended account is rejected.
10. A client reads versions only for its own tenant.
11. A forged create for another tenant is blocked.
12. Media relationships belonging to another tenant are blocked.

The disposable databases and test media were removed after the runs.

## 7. Browser verification

Fresh local browser sessions were used for the final application views. Admin and client sessions used different loopback hostnames to keep their login cookies separate.

| View | URL | Result |
|---|---|---:|
| Company admin dashboard | `http://localhost:3000/admin` | PASS — four clients/sites shown |
| Client 01 page/version view | `http://127.0.0.1:3000/admin/collections/pages/1/versions?limit=10` | PASS — client context and versions visible |
| Client 01 public website | `http://localhost:3101/` | PASS — restored public heading visible |

The final inspected browser views had no console errors. Temporary errors observed while deliberately stopping/rebuilding the development server were not reproducible after the final restart.

## 8. Automated verification summary

| Verification | Result |
|---|---:|
| TypeScript checks across four workspaces | PASS |
| ESLint checks across the CMS and website | PASS |
| Unit/component/contract tests | 13 passed, 0 failed |
| PostgreSQL role and tenant integration tests | 12 passed, 0 failed, 0 skipped |
| CMS optimized production build | PASS |
| Website optimized production build | PASS |
| CMS `/api/health` after final restart | HTTP 200 |
| Website `/api/health` after final restart | HTTP 200 |
| Client 01 public homepage after final restart | HTTP 200 |

The email-adapter warning is expected in local development: email is written to the console because no production email provider is configured.

## 9. Retest of the 12 reference acceptance criteria

| # | Acceptance criterion | Retest status | Evidence / qualification |
|---:|---|---:|---|
| 1 | ABC admin can manage every tenant | PARTIAL | Global administration works; permanent tenant deletion remains intentionally denied |
| 2 | XYZ users only access XYZ content, users, media, and settings | PARTIAL | Content/media/settings boundaries pass; client-owner self-service user administration remains a product decision |
| 3 | XYZ cannot access another tenant through UI or API | PASS | Four-tenant reads, direct ID, forged create, version, and media-relationship cases pass |
| 4 | New XYZ content is assigned/validated for XYZ | PASS | Single-tenant assignment and submitted tenant/website validation are enforced server-side |
| 5 | XYZ editors can save and preview drafts | PASS | Editor login/draft save works; public site remains published-only and signed preview path remains private |
| 6 | Only approved roles can publish/delete | PASS | Editor publish is HTTP 403; owner publish succeeds; destructive operations remain restrictive |
| 7 | Published changes appear on the correct website | PASS | Page, settings, and navigation changes reached Client 01 and were restored |
| 8 | Drafts never appear publicly | PASS | Editor draft marker did not appear in the normal public response |
| 9 | Versions can be reviewed/restored | PARTIAL | Own-only version listing and UI work; a complete browser restore action was not executed in this repair pass |
| 10 | Users edit safe profile fields, not role/tenant assignments | PASS | Safe self-update preserves protected fields; privilege-escalation protection remains active |
| 11 | ABC support can enter a client context | PARTIAL | Company content-manager login works; an explicit audited support-switch UI is not implemented |
| 12 | Required client content items are modeled | PARTIAL | Pages, posts, media, navigation, settings, SEO, requests, and blocks exist; optional team/testimonial/form/product/service collections need business confirmation |

**Updated acceptance summary:** 7 passed, 5 partial, 0 failed. The original four release-blocking failures are repaired.

## 10. What remains before production onboarding

These items do not break the requested local admin–editor–website connection, but they should be resolved or explicitly accepted before using real client data:

1. **Client-owner user administration:** Decide whether owners may invite/create/deactivate their tenant's editors and viewers. The current tenant-plugin override keeps client user access intentionally narrow.
2. **Version restoration:** Execute and automate the final browser restore action, including permissions for owner/editor/company roles.
3. **Support context switching:** Add an explicit audited “enter client context” experience if support staff require impersonation-like workflows.
4. **Deletion policy:** The current system favors suspension/retention and denies tenant/page/post deletion. Align the user-flow wording with this policy or implement audited deletion.
5. **Production services:** Configure real email, object storage, secrets, domains, TLS, backups, monitoring, alerting, and authentication/MFA policy.
6. **Other clients:** Only Client 01 runs as a website locally on port 3101. Client 02–04 have seeded endpoints, so their delivery records fail while those three website deployments are intentionally not running.
7. **Quality gates:** Production acceptance still needs load/performance, accessibility, cross-browser, backup/restore, and deployment-environment testing.
8. **Content-model confirmation:** Confirm whether the optional team, testimonial, announcement, form, product, and service models are mandatory.

## 11. How to run and test locally

PostgreSQL must be available using the connection in `apps/cms/.env`. Then, from the project root:

```text
pnpm dev
```

That single command starts the full local system. Use:

- Admin/CMS: `http://localhost:3000/admin`
- Client 01 website: `http://localhost:3101/`
- CMS health: `http://localhost:3000/api/health`
- Website health: `http://localhost:3101/api/health`

### Local synthetic login accounts

These credentials are local test data only and must never be reused in production.

| Role | Email | Password |
|---|---|---|
| Company administrator | `admin@example.test` | `replace-this-local-password` |
| Client 01 owner | `client01.owner@example.test` | `client01-local-password` |
| Client 01 editor | `client01.editor@example.test` | `client01-editor-local-password` |

Recommended manual check:

1. In a private/InPrivate browser session, log in as the Client 01 editor using `http://localhost:3000/admin`.
2. Open Pages and edit the Client 01 Home page.
3. Save a draft. The editor must not be able to publish.
4. Open a separate browser session at `http://localhost:3000/admin` and log in as the owner or administrator.
5. Review and publish the draft.
6. Open `http://localhost:3101/` and confirm the published content.
7. Restore the original content when the test is complete.

## 12. Final conclusion

The main local failure was not one problem but a chain: independent/stopped processes, incorrect create authorization, missing relationship validation, a login-audit hook conflict, incorrect version filtering, and missing settings/navigation revalidation. All six areas were repaired.

The administrator, Client 01 editor, worker, and Client 01 website are now connected and operational. The release-blocking tenant and login defects from the historical report are covered by passing regression tests. Remaining items are documented product or production-readiness decisions rather than failures in the requested local three-part connection.

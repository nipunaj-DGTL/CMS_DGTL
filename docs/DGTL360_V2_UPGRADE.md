# DGTL360 v2 — CMS integration handover

Date: 10 September 2026. Scope: local upgrade, not a cloud deployment or production security certification.

## Result and links

The active CMS-connected DGTL360 frontend is now the new design in `apps/dgtl360`.

- [Active CMS-connected website](http://localhost:3102)
- [DGTL360 Home editor](http://localhost:3000/admin/collections/pages/2)
- [Production service editor](http://localhost:3000/admin/collections/pages/5)
- [DGTL360 Site Settings](http://localhost:3000/admin/collections/site-settings/2)
- [CMS login](http://localhost:3000/admin/login)

Use a company super admin or the existing Client 02 admin. A Client 01 admin cannot access these records. Accounts and passwords were not replaced.

The separate source preview on port 3105 is **not** the CMS-connected site. Use port 3102 for CMS editing tests. The original independent repositories/folders were not deleted or pushed to GitHub by this upgrade.

## Source and changes

Design source: `Sandalu-DGTL/DGTL360`, fork `nipunaj-DGTL/DGTL360`, commit `41064ac70e5c2be721ec360cb4645eec4b2d9bf8`.

Imported the new service-wheel motion, WebGL cursor/video reveal, interactive letters, company layout, team layout, service reel and footer styling. Retained this platform's CMS fetch adapter, signed preview/revalidation endpoints, generic page/post routes, error handling and enquiry validation/email backend. Navigation continues to use existing CMS entries, including custom links, rather than resetting them to the source project's two hard-coded links.

CMS changes:

- Company Overview: optional tagline.
- Team Showcase: optional member name, individual Media image and validated HTTPS LinkedIn URL; optional interface labels. Biography may be empty. Old role-only blocks remain valid.
- Public DTO mapping includes approved member media and omits unsafe profile URLs.
- Footer renders configured Site Settings social links; absent links do not become guessed social profiles. Unknown platforms render a text badge.
- Service pages use the shared CMS-driven footer.
- Approved, public media responses allow anonymous cross-origin reads for independent frontend/WebGL video use. Private, pending, rejected and wrong-website media still cannot be fetched through this endpoint. No credentialed CORS was enabled.
- Page font presets also drive the new display font variables; arbitrary CSS injection was not added.

Contract version remains 1: new fields are additive/optional.

## Existing data preserved

Website ID **2**, website key **client-02-main**, tenant membership, domains, read token, preview secret and revalidation target were retained. `frontendKey` is now `dgtl360-v2`.

| CMS content | Result |
| --- | --- |
| Home, ID 2 | New company copy, seven named team profiles, updated identity section; existing hero content retained with new renderer |
| Eight services, IDs 5–12 | Updated from the new source; IDs and slugs retained |
| Custom DGTL360 page, ID 15 (`new-slug`) | Preserved unchanged and still served |
| Other clients' pages | Unchanged; before/after document hashes matched |
| Previous page versions | Retained through normal Payload updates, subject to the existing 50-version retention limit |
| Media | Existing media retained; new assets uploaded through normal scan/validation hooks |
| Privacy Policy | Added as CMS-managed placeholder content, excluded from indexing; footer navigation link added |

No client, user, website, or existing page was deleted.

## How to edit the new site

1. Log in as Client 02 admin or company super admin.
2. Open **Pages → DGTL360 Home**, ID 2.
3. Edit Hero for the headline/body/video; Company Overview for company copy; Team Showcase for names, roles, biographies, photos and LinkedIn URLs; Identity Field for the wordmark/letters.
4. Save a draft and use Preview for unpublished page changes.
5. Publish changes and refresh [the connected website](http://localhost:3102).
6. Edit service content in its existing page, for example Production ID 5.
7. To add company social profiles, open **Site Settings → DGTL360 → Social Links**, enter the label and full HTTPS profile URL, and save. Site Settings is not a draft/versioned collection, so these changes affect delivery directly.
8. Change header/footer links in **Navigation** for website ID 2. Creating a page does not automatically add it to the curated footer.

The publishing worker must run for prompt cache invalidation. The existing frontend cache also has its configured revalidation lifetime. Existing open browser tabs do not automatically update their rendered DOM: refresh after publishing.

## Verification completed

| Check | Evidence/result |
| --- | --- |
| Frontend production compilation | Next.js build passed; TypeScript and route generation passed |
| CMS type check | Passed after regenerating Payload types |
| Frontend lint and changed CMS lint | Passed |
| CMS unit tests | 92 passed, including 10 new team/media/link checks |
| Frontend unit tests | 20 passed, including animation, signature, webhook and enquiry validation tests |
| Contract tests | 6 passed; contract type check passed |
| Role-aware integration test | Used an existing active Client 02 user with `overrideAccess: false`; Client 01 page access denied |
| Draft isolation | Client admin saved draft; public API kept published content |
| Preview | Signed frontend preview rendered the private draft |
| Publishing | Hero and team-name edits appeared through the running CMS/worker/frontend connection |
| Social links | Temporary Client 02 setting became a clickable footer link |
| Media isolation | New portrait returned 200; same media ID under Client 01 returned 404 |
| Restoration | Temporary draft/publish/social test values restored; no test marker/link remains public |
| Browser | Desktop and 390px mobile homepage checked; no horizontal overflow/error overlay/broken loaded images after warm-up |
| Interactions | Visible portrait opened Riz Razak's CMS profile and correct LinkedIn link; cursor effect reported `WebGL2 field live` |
| HTTP smoke tests | Home, all eight services, privacy/custom page, Client 01 home + two added pages, CMS login and worker health returned 200 |

The first cold development request exceeded the image optimizer's upstream timeout while the CMS media route compiled. Warm requests succeeded and the final browser check had zero broken images. This is not evidence of production load capacity. An earlier frontend test-runner mismatch was fixed by adapting imported Node tests to this repository's Vitest runner; the final suite passed.

The role-aware mutation checks use Payload's real access policies but are not a complete browser login/password recovery test. No real enquiry email was sent.

## Deployment/migration notes for developers

New schema migration: `apps/cms/src/migrations/20260910_091352_dgtl360_v2_profiles.ts`, with generated JSON snapshot and registry entry. It adds fields/indexes/foreign keys to both page and version tables; its UP path does not drop data.

The current local database has development schema-push history and had the reviewed additive migration applied directly before restarting development. Do **not** blindly run all historical migrations against this local database: reconcile its pre-existing development migration state first. Production/staging must use its own normally ordered migration history.

The content importer is **not automatic on startup**:

```powershell
# Run from apps/cms with the intended environment configured.
# Back up the target DB and its media first; migrate its schema before importing.
pnpm exec tsx src/scripts/upgrade-dgtl360-v2.ts
# Review the dry-run plan. Then, only against the approved target:
pnpm exec tsx src/scripts/upgrade-dgtl360-v2.ts --apply --backup="C:/backups/cms-before-v2.dump"
```

Requirements: existing `client-02-main` tenant/website and Site Settings; published canonical pages without an unresolved draft; this repository's bundled DGTL360 assets; matching configured media storage/scanner. The importer refuses to create a duplicate tenant. It snapshots content, uploads/deduplicates media through normal hooks, transactionally updates target content, and marks the completed import. Re-running after the marker exists does not overwrite subsequent editor changes. If an attempt fails before commit, media uploads may remain as unreferenced assets; inspect them rather than deleting media broadly.

For future environments, deploy/migrate CMS contract support before deploying the new frontend; import approved content, run the publishing worker, then verify preview, publish, images, social links and tenant boundaries on the actual public domain. A production build succeeded locally; neither cloud deployment nor a production migration rehearsal/load test was performed in this task.

## Backups and recovery

Local database backup before schema/content edits:

`C:/Users/Nipuna/Documents/ChatGPT/cms_test_project/.backups/before-local-start-2026-09-10T09-02-14-653Z.dump`

Scoped pre-upgrade content snapshot:

`C:/Users/Nipuna/Documents/ChatGPT/cms_test_project/.backups/dgtl360-v2-content-before-1789031959279.json`

The old tracked frontend is recoverable from CMS repository commit `b6e679fc50f1906ac6e3fdee677e7ed60de2b797`. The independent source folders remain in place.

Prefer restoring individual page versions/content when appropriate. Restoring the entire database rewinds **all clients** and must be separately approved, with fresh backups and a maintenance window. Do not run destructive migration DOWN commands just to restore styling: they remove the added profile fields and their data. Restore a previous frontend release with a compatible additive schema instead. Plan content rollback using the snapshot and page revisions; do not erase media or users.

## Still required before a real public launch

- Replace all seven **sample** portraits with approved real photos. The source explicitly says these are not the named people; CMS media alt text preserves that warning.
- Replace the privacy-policy placeholder with an approved policy.
- Enter and verify the company's actual social profile URLs; none were invented during the upgrade.
- Configure and test the real enquiry email provider/delivery. Local CMS currently reports that no email adapter is configured.
- Review/commit the changes, run CI, rehearse migrations/rollback in staging, and perform normal deployment/security/load checks. No GitHub push, DNS update or cloud deployment occurred here.

# DGTL dashboard → Payload CMS: implementation roadmap

Local implementation and automated verification completed on 2026-09-28.
See `DGTL_CMS_SSO_VERIFICATION.md` for evidence and the explicitly outstanding live
provider/browser checks, and `DGTL_CMS_SSO_SETUP.md` for activation instructions.

Scope: implement locally; do not deploy, change cloud configuration, push Git,
or enable SSO on the user's running CMS. Existing unrelated changes stay intact.

1. Review Payload 3.88 authentication, the existing tenant policies, and the
   DGTL Service consent route. Use an established OIDC client implementation.
2. Add disabled-by-default configuration for a separate confidential CMS OAuth
   client. Validate trusted issuer, callback origin and central `/v1/me` URL.
3. Add administrator-controlled identity mappings to existing CMS users. Never
   auto-link by email, provision tenants, or translate a dashboard admin role into
   a CMS super-admin role. Keep local roles and tenant memberships authoritative.
4. Add PKCE/state/nonce-bound sign-in and callback routes, short-lived opaque CMS
   sessions, server-side encrypted provider tokens, request-time central access
   checks, and logout/expiry handling. Fail closed on revoked access and outages.
5. Extend the dashboard's explicit OAuth-client allowlist for CMS while preserving
   SEO. Add CMS launch routing and tests. Deliver those separate-repository changes
   locally, not as a remote push.
6. Test negative and positive authentication cases, callback replay, CSRF,
   session expiry, role boundaries, mapping changes, account switching and tenant
   isolation. Validate migrations against an isolated database, never reset the
   existing local database. Record any checks requiring real Supabase credentials.
7. Provide setup, roles, rollout and rollback instructions plus a factual report.

Rollout policy: SSO is disabled by default. Once enabled, linked users must use
SSO; existing unlinked accounts retain their old login during migration. A
separate strict-mode switch can require SSO for all ordinary users while an
explicitly configured, unlinked CMS company-super-admin can remain a recovery
account. No cloud credentials belong in Git or chat.

Initial mapping policy: a CMS super-admin assigns the verified central user ID
to an existing local user; the user cannot edit this mapping. The issuer and
subject identify the person, not their email. Changing a mapping invalidates
existing SSO sessions through binding checks.

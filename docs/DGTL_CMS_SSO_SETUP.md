# DGTL Service → CMS single sign-on

## Connection and role boundaries

DGTL dashboard → CMS `/sso` → Supabase authorization → dashboard consent check →
CMS `/sso/callback` → identity validation + `/v1/me` entitlement check → local CMS
account mapping → CMS admin session.

The authorization-code flow uses PKCE, state, nonce and signed ID-token validation.
The CMS stores only a hash of its opaque session key and an AES-GCM-encrypted
central access token. The cookie is host-only, HttpOnly, SameSite=Lax and Secure
on HTTPS. Tokens are not passed to browser storage or URL parameters. Configure
proxy/monitoring logs to redact cookies, authorization headers and callback queries.

| Decision | Authority |
| --- | --- |
| Who signed in | Supabase issuer + stable subject UUID |
| Whether CMS is enabled | Active Service Backend profile + explicit `cms` assignment |
| CMS super-admin or client admin | Existing CMS account, never copied from dashboard role |
| Company/content access | Existing active CMS tenant memberships |
| Who can link identities | Authenticated CMS company-super-admin |

No email-based auto-linking, automatic signup, tenant creation, account merging or
privilege promotion is implemented. A dashboard admin mapped to a client CMS
account remains a client. CMS invitation/password-reset and central identity
signup/password-reset remain separate systems during migration.

## Deliverables

CMS changes are in this repository. Dashboard changes are in the separate ignored
checkout `.local/integrations/DGTL-Service` (`dev-sandalu`). The portable patch is
`docs/integrations/dgtl-service-cms-sso.patch`; review and publish it in the dashboard
repository, not as if a CMS commit automatically changed that repository.

The Service Backend's current `/v1/me` already returns the required profile and
enabled services, so no backend source change is needed for this first integration.
SEO source is unchanged. Existing SEO client allowlisting remains supported.

## 1. Prepare and migrate with SSO disabled

1. Review both repositories' changes and the verification report.
2. Back up the real database and verify recovery before deployment.
3. Apply the reviewed `20260928_054306_cms_sso` migration through the normal
   migration job. Keep `PAYLOAD_DB_PUSH=false`.
4. Deploy new CMS code with `CMS_SSO_ENABLED=false`. The additive migration must
   precede new code even when SSO is disabled, because user queries include new fields.
5. Confirm legacy login, content delivery, media and worker still work.

The migration adds mapping fields and a hidden session table. It does not rewrite
accounts, passwords, roles or content. Do not run the isolated verification helper
against any real database; it deliberately targets a separate localhost test DB.

## 2. Register a separate CMS OAuth application

Use the SAME Supabase project as DGTL Service:

1. Confirm OAuth Server is enabled and uses the existing dashboard `/oauth/consent`
   authorization path. Preserve the working SEO registration.
2. Register a new confidential CMS OAuth client, separate from SEO, using
   `client_secret_post` token-endpoint authentication.
3. Set the exact production callback `https://cms.dgtl.lk/sso/callback`, with no
   wildcard or trailing slash.
4. For laptop testing, create a separate development client with the exact callback
   `http://localhost:3000/sso/callback` (adjust the port if needed).
5. Save the client ID and secret in a password manager. Only the CMS server needs
   the secret; never use a public dashboard environment variable for it.
6. Confirm discovery issuer, normally `https://<project-ref>.supabase.co/auth/v1`,
   and asymmetric RS256/ES256 signing with ID tokens verifiable using JWKS.
   Supabase cannot issue the required OpenID ID tokens with an HS256-only setup.

References: [Supabase OAuth setup](https://supabase.com/docs/guides/auth/oauth-server/getting-started),
[Supabase token flow and signing requirements](https://supabase.com/docs/guides/auth/oauth-server/oauth-flows),
[OpenID client validation](https://github.com/panva/openid-client/blob/main/docs/functions/authorizationCodeGrant.md).

## 3. Configure the dashboard and assign service access

Set these server-only dashboard variables, preserving the existing SEO variables:

```dotenv
DGTL_OAUTH_CMS_CLIENT_ID=<new-CMS-client-ID>
DGTL_OAUTH_CMS_CALLBACK_URLS=https://cms.dgtl.lk/sso/callback
```

Use the development callback for its separate local client. Set both values together;
clear BOTH for unused tools. Duplicate client IDs or callbacks fail closed.

Set the backend CMS service's default URL to `https://cms.dgtl.lk/sso`. Enable CMS
for the intended client in the admin dashboard. Confirm their authenticated `/v1/me`
contains the `cms` service. A visible card alone does not grant access.

A central company admin also needs an explicit CMS assignment. The existing backend
client-management endpoint edits only client profiles. Do not change an admin's role
to work around this. A trusted database operator must review the exact profile UUID
and add that existing admin to `client_service_access` for the existing `cms` service,
with `enabled=true` and a trusted tool URL. No new generic admin-assignment screen
is included. The dashboard admin page shows “Open my CMS access” only when assigned.

## 4. Configure CMS secrets

Production uses `/opt/dgtl/secrets/cms.env`, already read by production Compose.
Local development uses an ignored environment file. A local Docker override must
explicitly pass these variables to the CMS process: putting values in a Compose
interpolation `.env` file does not automatically inject them into containers.

```dotenv
CMS_PUBLIC_URL=https://cms.dgtl.lk
CMS_SSO_ENABLED=false
CMS_SSO_REQUIRED=false
CMS_SSO_ISSUER=https://<project-ref>.supabase.co/auth/v1
CMS_SSO_CLIENT_ID=<CMS-client-ID>
CMS_SSO_CLIENT_SECRET=<CMS-client-secret>
CMS_SSO_VIEWER_URL=https://<service-backend-host>/v1/me
CMS_SSO_ENCRYPTION_KEY=<32-random-bytes-encoded-as-64-hex-characters>
CMS_SSO_RECOVERY_USER_ID=<existing-unlinked-CMS-super-admin-numeric-ID>
```

Generate a dedicated encryption key, not a Payload secret or Supabase service-role
key. Key rotation invalidates existing SSO sessions. Production requires HTTPS.
The viewer URL MUST be the trusted Service Backend because it receives bearer
tokens. Keep the Supabase service-role key in the Service Backend only.

## 5. Link accounts before enabling SSO

1. Sign into the current CMS as its super-admin while SSO remains disabled.
2. Keep a separate unlinked recovery super-admin in a password manager. Configure
   its numeric ID if strict mode will be enabled.
3. Obtain the intended user's stable Supabase UUID from trusted administration,
   not an email match or a client-supplied identity claim.
4. Open that person's EXISTING CMS user record. Set `ssoIssuer` to the exact trusted
   issuer and `ssoSubject` to the central UUID. Save both together.
5. Review their existing account type, active status, client-admin membership and
   active tenant. SSO does not assign these permissions.
6. Link the intended CMS super-admin separately. Never automatically map every
   dashboard admin to a CMS privileged account.

Duplicate mappings are rejected. Clients cannot modify their own mapping. Removing
or changing a mapping invalidates its existing sessions on subsequent authentication.

## 6. Enable and demonstrate the real flow

Set `CMS_SSO_ENABLED=true`, recreate/restart the CMS and worker using the reviewed
deployment process, and test one approved account. Leave strict mode false initially.
Linked accounts now require SSO and cannot use native password/JWT access as a bypass.

Live acceptance checklist:

1. Dashboard login → click CMS → correct CMS account and tenant, no second password.
2. Repeat for a separately linked CMS super-admin with explicit CMS entitlement.
3. Central admin mapped to a CMS client remains a CMS client.
4. Client A cannot read/edit/upload/download private media belonging to client B.
5. Removing central CMS entitlement blocks the next protected CMS request.
6. Central profile, local user or local tenant suspension blocks access.
7. Unlinked identities cannot enter, including an identity with a matching email.
8. Switch dashboard users and launch CMS; the previous CMS identity is not retained.
9. CMS logout invalidates its session, including replay of the old cookie.
10. Expiry, cancellation, tampered callback and central outage fail safely.
11. Existing SEO sign-in remains operational and SEO access alone cannot grant CMS.
12. Logs and analytics do not retain tokens or callback query strings.

After every intended account and the recovery procedure are tested, set
`CMS_SSO_REQUIRED=true` to disable native login for unlinked accounts too, except
the explicitly selected UNLINKED company-super-admin recovery account.

## Session limits and logout

- Each protected SSO authentication rechecks `/v1/me`, the local account and active
  tenant memberships. Central outages fail closed.
- No refresh tokens are stored. Expiry is the earliest of central access-token
  expiry, ID-token expiry or eight hours. CMS refresh never creates a native JWT
  or extends this deadline. Relaunch through the dashboard to continue; an active
  central session normally avoids another password, unless the provider requires
  reauthentication/MFA.
- CMS logout is local logout. Dashboard logout is NOT global back-channel logout.
  A central access token may remain valid until expiry after central logout. If
  instant logout across services is required, add and test a central revocation
  contract before launch. Removing CMS entitlement is checked on the next request.
- The website content API/read-token mechanism is unchanged by browser SSO.
- This is explicit account linking, not automatic identity provisioning.

## Rollback

Keep a working unlinked recovery administrator and a database backup. Setting
`CMS_SSO_ENABLED=false` and `CMS_SSO_REQUIRED=false` deliberately restores legacy
authentication; evaluate that security tradeoff before using it during an incident.
Old SSO cookies stop authenticating. The additive schema can remain during a code
rollback. Do not remove columns while new code is running. A SQL down-migration
deletes SSO sessions and mappings and is not required for a normal feature rollback.

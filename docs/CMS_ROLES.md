# CMS roles

The CMS supports exactly two human profiles.

| Profile              | Account binding            | Scope                    | Main privileges                                                                                                   |
| -------------------- | -------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Super Admin          | DGTL company               | Every client and website | Create and manage tenants, websites, client admins, content, media, settings, publishing, and operational records |
| Client Company Admin | One assigned client tenant | Assigned client only     | Manage the client's pages, posts, media, navigation, settings, drafts, previews, versions, and publishing         |

## Super Admin

The stored role is `company-super-admin`. This is the DGTL company administrator. It has standing cross-tenant access and must use an individual account with MFA in production.

## Client Company Admin

The stored tenant role is `client-admin`. It replaces the previous client owner, editor, and viewer roles. Every client-admin account is tenant-scoped by the server; selecting another tenant in the interface cannot expand its access.

A client company admin has self-only CMS User access. Only a DGTL Super Admin may create, assign, activate, suspend, or delete another human account. Client company admins cannot create a super-admin account, grant company access, change tenant assignments, move content to another tenant, or read another client's records.

Each active client tenant must retain at least one active client company admin.

## Migration rule

Existing `client-owner`, `client-editor`, and `client-viewer` assignments are consolidated into `client-admin`. Existing company content-manager assignments are consolidated into `company-super-admin`. No user record is deleted by the migration.
